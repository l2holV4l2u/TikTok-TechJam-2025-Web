// src/app/api/analyze/improve-graph/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import OpenAI from "openai";
import { GraphNode, GraphEdge } from "@/app/types/graphTypes";

const USE_LLM = process.env.IMPROVE_GRAPH_USE_LLM !== "false"; // default true

const requestSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    kind: z.string(),
    definedIn: z.object({
      file: z.string(),
      line: z.number(),
    }),
    usedIn: z.array(z.string()),
  })),
  edges: z.array(z.object({
    source: z.string(),
    target: z.string(),
    kind: z.string(),
  })),
  context: z.object({
    owner: z.string(),
    repo: z.string(),
  }).optional(),
});

type EdgeLike = { source: string; target: string; type: string };

type ValidationResult = {
  originalNodeIdsEcho: string[];
  edgeNodeCheck: {
    unknownSources: string[];
    unknownTargets: string[];
  };
  duplicateIds: string[];
  danglingEdges: string[];
  notes?: string;
};

type ImprovementResult = {
  status: "ok" | "improved";
  message: string;
  originalGraph?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  improvedGraph?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  suggestions?: string[];
  validation?: ValidationResult;
  improvedEdges?: Array<{
    source: string;
    target: string;
    type: "add" | "remove" | "modify";
    kind?: string;
    reason?: string;
  }>;
};

// Helper functions
function edgesToBreakCycles(cycles: string[][]): Array<{source:string; target:string; type:"remove"}> {
  // Simple heuristic: remove the first edge from each cycle
  const seen = new Set<string>();
  const out: Array<{source:string; target:string; type:"remove"}> = [];
  for (const cyc of cycles) {
    if (cyc.length < 2) continue;
    for (let i = 0; i < cyc.length - 1; i++) {
      const e = { source: cyc[i], target: cyc[i+1], type: "remove" as const };
      const key = `${e.source}->${e.target}`;
      if (!seen.has(key)) {
        out.push(e);
        seen.add(key);
        break; // one per cycle
      }
    }
  }
  return out;
}

function normalizeEdges(edges: Array<{ source: string; target: string; kind: string }>): EdgeLike[] {
  return edges.map(({ source, target, kind }) => ({ source, target, type: kind }));
}

// PATCH semantics: upsert/replace same (source,target), and delete when type === "remove"
function applyEdgePatch(original: EdgeLike[], patch: EdgeLike[], validIds: Set<string>): EdgeLike[] {
  const index = new Map<string, number>();
  original.forEach((e, i) => index.set(`${e.source}->${e.target}`, i));

  // Sanitize patch to valid node IDs
  const filtered = patch.filter(e => validIds.has(e.source) && validIds.has(e.target));

  const out = [...original];
  for (const p of filtered) {
    const key = `${p.source}->${p.target}`;
    if (p.type === "remove") {
      if (index.has(key)) {
        const idx = index.get(key)!;
        out.splice(idx, 1);
        // Rebuild index after deletion (simple + safe for small graphs)
        index.clear();
        out.forEach((e, i) => index.set(`${e.source}->${e.target}`, i));
      }
    } else {
      if (index.has(key)) {
        out[index.get(key)!] = p; // modify type
      } else {
        out.push(p); // add
        index.set(key, out.length - 1);
      }
    }
  }
  return out;
}

function detectCycles(edges: Array<{source: string, target: string}>): string[][] {
  const graph = new Map<string, string[]>();
  const nodes = new Set<string>();
  
  // Build adjacency list
  edges.forEach(edge => {
    nodes.add(edge.source);
    nodes.add(edge.target);
    if (!graph.has(edge.source)) {
      graph.set(edge.source, []);
    }
    graph.get(edge.source)!.push(edge.target);
  });
  
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  
  function dfs(node: string, path: string[]): void {
    if (visiting.has(node)) {
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        cycles.push([...path.slice(cycleStart), node]);
      }
      return;
    }
    
    if (visited.has(node)) return;
    
    visiting.add(node);
    path.push(node);
    
    const neighbors = graph.get(node) || [];
    neighbors.forEach(neighbor => dfs(neighbor, path));
    
    visiting.delete(node);
    visited.add(node);
    path.pop();
  }
  
  nodes.forEach(node => {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  });
  
  return cycles;
}

function validateEdges(
  originalNodes: Array<{id: string}>,
  improvedEdges: Array<{source: string, target: string}>
): ValidationResult {
  const originalNodeIds = originalNodes.map(n => n.id);
  const nodeIdSet = new Set(originalNodeIds);
  
  const unknownSources = improvedEdges
    .map(e => e.source)
    .filter(id => !nodeIdSet.has(id))
    .filter((id, index, arr) => arr.indexOf(id) === index); // unique
    
  const unknownTargets = improvedEdges
    .map(e => e.target)
    .filter(id => !nodeIdSet.has(id))
    .filter((id, index, arr) => arr.indexOf(id) === index); // unique
    
  const duplicateIds = originalNodeIds.filter((id, index) => 
    originalNodeIds.indexOf(id) !== index
  );
  
  const danglingEdges = improvedEdges
    .filter(e => !nodeIdSet.has(e.source) || !nodeIdSet.has(e.target))
    .map(e => `${e.source} → ${e.target}`);
  
  return {
    originalNodeIdsEcho: originalNodeIds,
    edgeNodeCheck: {
      unknownSources,
      unknownTargets
    },
    duplicateIds,
    danglingEdges
  };
}

function sanitizeAndMergeGraph(
  originalNodes: Array<{id: string, kind: string, definedIn: any, usedIn: string[]}>,
  originalEdges: Array<{source: string, target: string, kind: string}>,
  aiImprovedEdges: Array<{source: string, target: string, type?: string, kind?: string}>
): {
  improvedNodes: GraphNode[];
  improvedEdges: GraphEdge[];
  improvedEdgesWithOperations: Array<{
    source: string;
    target: string;
    type: "add" | "remove" | "modify";
    kind?: string;
    reason?: string;
  }>;
} {
  const nodeIdSet = new Set(originalNodes.map(n => n.id));
  
  // Sanitize: remove edges with unknown nodes
  const sanitizedAiEdges = aiImprovedEdges.filter(e => 
    nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
  );
  
  // Convert original edges to comparable format
  const originalEdgeSet = new Set(
    originalEdges.map(e => `${e.source}→${e.target}→${e.kind}`)
  );
  
  const improvedEdgeSet = new Set(
    sanitizedAiEdges.map(e => `${e.source}→${e.target}→${e.type || e.kind || 'dependsOn'}`)
  );
  
  // Detect cycles in original graph and mark them for removal
  const cycles = detectCycles(originalEdges);
  const cyclicEdges = new Set<string>();
  
  cycles.forEach(cycle => {
    for (let i = 0; i < cycle.length - 1; i++) {
      const source = cycle[i];
      const target = cycle[i + 1];
      const edgeKey = `${source}→${target}`;
      cyclicEdges.add(edgeKey);
    }
  });
  
  // Generate improved edges with operations
  const improvedEdgesWithOperations: Array<{
    source: string;
    target: string;
    type: "add" | "remove" | "modify";
    kind?: string;
    reason?: string;
  }> = [];
  
  // Mark cyclic edges for removal
  originalEdges.forEach(edge => {
    const edgeKey = `${edge.source}→${edge.target}`;
    if (cyclicEdges.has(edgeKey)) {
      improvedEdgesWithOperations.push({
        source: edge.source,
        target: edge.target,
        type: "remove",
        kind: edge.kind,
        reason: "Circular dependency detected"
      });
    }
  });
  
  // Create final improved graph (original minus removed edges)
  const removedEdgeKeys = new Set(
    improvedEdgesWithOperations
      .filter(e => e.type === "remove")
      .map(e => `${e.source}→${e.target}→${e.kind}`)
  );
  
  const finalImprovedEdges = originalEdges
    .filter(e => !removedEdgeKeys.has(`${e.source}→${e.target}→${e.kind}`))
    .map(e => ({
      source: e.source,
      target: e.target,
      type: e.kind
    }));
  
  return {
    improvedNodes: originalNodes.map(n => ({
      id: n.id,
      kind: n.kind,
      definedIn: n.definedIn,
      usedIn: n.usedIn
    })),
    improvedEdges: finalImprovedEdges,
    improvedEdgesWithOperations
  };
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500 }
      );
    }

    const body = await req.json();
    const { nodes, edges, context } = requestSchema.parse(body);

    const originalEdgesNorm = normalizeEdges(edges);
    const originalNodeIds = new Set(nodes.map(n => n.id));

    // Detect cycles for LLM guidance
    const cycles = detectCycles(edges);
    const mustRemove = cycles.length > 0 ? edgesToBreakCycles(cycles) : [];

    // Try LLM analysis first
    if (USE_LLM) {
      const system = "You are an expert in software architecture and dependency analysis. Respond only with valid JSON.";
      
      const rules = (cyclesJson: string, mustRemoveJson: string) => `
Return STRICTLY this JSON shape:
{
  "status": "ok" | "improved",
  "message": string,
  "issues": string[],
  "suggestions": string[],
  "improvedNodes": [
    {"id": string, "kind": "class"|"interface"|"module"|"function", "definedIn":{"file":string,"line":number}, "usedIn": string[]}
  ],
  "improvedEdges": [
    {"source": string, "target": string, "type": "dependsOn"|"imports"|"implements"|"extends"|"remove"}
  ],
  "validation": {
    "originalNodeIdsEcho": string[],
    "edgeNodeCheck": {"unknownSources": string[], "unknownTargets": string[]},
    "duplicateIds": string[],
    "danglingEdges": string[],
    "notes": string
  }
}

Hard rules:
- DO NOT invent or rename nodes. Use ONLY node IDs from the input.
- "improvedEdges" is a PATCH. Deletions must use {"type":"remove"}.
- If ANY cycle exists in the input (see "cycles" below), you MUST return "status":"improved" and include REMOVE operations that break EVERY cycle. Returning "ok" is INVALID when cycles exist.
- Prefer the minimal set of removes that breaks all cycles. A valid minimal suggestion is provided in "mustRemove" below; you may propose a different but equivalent minimal cut set.
- Ensure unknownSources/unknownTargets/danglingEdges are [].
- Keep JSON under 50KB.

Context for this graph:
"cycles": ${cyclesJson}
"mustRemove": ${mustRemoveJson}
`.trim();

      const inputPayload = {
        context: context ?? { owner: "unknown", repo: "unknown" },
        nodes,
        edges
      };

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system },
            { role: "user", content: rules(JSON.stringify(cycles), JSON.stringify(mustRemove)) },
            { role: "user", content: "Analyze this dependency graph and output ONLY the JSON per the schema and rules." },
            { role: "user", content: JSON.stringify(inputPayload) }
          ],
          temperature: 0.2,
          max_tokens: 5000,
          presence_penalty: 0,
          frequency_penalty: 0
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) throw new Error("No response from OpenAI");

        let ai: any;
        try {
          ai = JSON.parse(responseText);
        } catch (e) {
          throw new Error("Invalid JSON response from AI");
        }

        console.log("cycles:", cycles.length, "llmEdges:", ai?.improvedEdges?.length ?? 0);

        // Check if retry is needed
        const needsRetry =
          cycles.length > 0 &&
          (ai.status !== "improved" || !Array.isArray(ai.improvedEdges) || ai.improvedEdges.every((e:any)=>e.type!=="remove"));

        if (needsRetry) {
          const correction = `
Your last response was invalid because cycles exist but you did not propose removes that break ALL cycles.
You MUST respond with "status":"improved" and include REMOVE operations sufficient to break every cycle.
Re-read "cycles" and "mustRemove" and return ONLY the JSON object per schema.
`.trim();

          const retry = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.2,
            max_tokens: 5000,
            presence_penalty: 0,
            frequency_penalty: 0,
            messages: [
              { role: "system", content: system },
              { role: "user", content: rules(JSON.stringify(cycles), JSON.stringify(mustRemove)) },
              { role: "user", content: correction },
              { role: "user", content: JSON.stringify({ context: context ?? {owner:"unknown",repo:"unknown"}, nodes, edges }) }
            ]
          });

          const retryResponseText = retry.choices[0]?.message?.content;
          if (retryResponseText) {
            try {
              ai = JSON.parse(retryResponseText);
              console.log("retry cycles:", cycles.length, "llmEdges:", ai?.improvedEdges?.length ?? 0);
            } catch (e) {
              console.warn("Retry response also invalid JSON, falling back to local");
            }
          }
        }

        // Post-check guard: if LLM still returns OK despite cycles, fall back to local
        if (cycles.length > 0 && ai.status === "ok") {
          console.warn("LLM returned OK despite cycles, falling back to local fix");
          throw new Error("LLM returned OK despite cycles");
        }

        // Base result
        const result: ImprovementResult = {
          status: ai.status ?? "ok",
          message: ai.message ?? "Analysis completed",
          suggestions: Array.isArray(ai.suggestions) ? ai.suggestions : [],
          validation: ai.validation
        };

        if (result.status === "improved") {
          const patch: EdgeLike[] = Array.isArray(ai.improvedEdges) ? ai.improvedEdges : [];

          // Apply patch (sanitized) over original normalized edges
          const mergedEdges = applyEdgePatch(originalEdgesNorm, patch, originalNodeIds);

          // Augment validation if AI referenced unknown nodes (we ignore them)
          const unknownSources = (patch ?? []).map(p => p.source).filter(id => !originalNodeIds.has(id));
          const unknownTargets = (patch ?? []).map(p => p.target).filter(id => !originalNodeIds.has(id));
          result.validation = {
            ...(ai.validation ?? {}),
            edgeNodeCheck: {
              unknownSources: Array.from(new Set(unknownSources)),
              unknownTargets: Array.from(new Set(unknownTargets))
            },
            danglingEdges: [],
            notes: ((ai.validation?.notes ?? "") + ((unknownSources.length || unknownTargets.length) ? " Sanitized edges referencing unknown node IDs." : "")).trim()
          };

          result.originalGraph = {
            nodes,
            edges: originalEdgesNorm as unknown as GraphEdge[]
          };
          result.improvedGraph = {
            nodes, // keep nodes unchanged
            edges: mergedEdges as unknown as GraphEdge[]
          };

          // Also echo the patch as an audit trail
          result.improvedEdges = (patch ?? []).map(p => ({
            source: p.source,
            target: p.target,
            type: (p.type === "remove" ? "remove" : "modify") as "add" | "remove" | "modify",
            kind: p.type,
            reason: "LLM patch"
          }));

          console.log("edges(original/improved):", originalEdgesNorm.length, result.improvedGraph?.edges.length);
          console.log("nodes:", nodes.length);

          return Response.json(result);
        }

        // If AI says OK (no changes), return OK with validation
        return Response.json({
          status: "ok",
          message: result.message,
          suggestions: result.suggestions ?? [],
          validation: result.validation ?? validateEdges(nodes, edges)
        } satisfies ImprovementResult);

      } catch (e) {
        console.warn("LLM analysis failed, falling back to local:", (e as Error).message);
        // Continue to local fallback below
      }
    }

    // Local fallback: Use already computed cycles
    const hasCycles = cycles.length > 0;
    
    let result: ImprovementResult;
    
    if (!hasCycles) {
      // No improvements needed
      result = {
        status: "ok",
        message: "Graph is already well-structured with no circular dependencies",
        suggestions: ["Graph structure appears optimal"],
        validation: validateEdges(nodes, edges)
      };
    } else {
      // Apply improvements using local analysis
      const { improvedNodes, improvedEdges, improvedEdgesWithOperations } = 
        sanitizeAndMergeGraph(nodes, edges, []);
      
      const validation = validateEdges(nodes, improvedEdges);
      validation.notes = ((validation.notes ?? "") + " LLM returned OK despite cycles; applied local fix.").trim();
      
      result = {
        status: "improved",
        message: `Improved graph by removing ${improvedEdgesWithOperations.length} circular dependencies`,
        originalGraph: { 
          nodes: nodes.map(n => ({ ...n })), 
          edges: edges.map(e => ({ ...e, type: e.kind }))
        },
        improvedGraph: {
          nodes: improvedNodes,
          edges: improvedEdges
        },
        suggestions: [
          `Removed ${improvedEdgesWithOperations.length} edges to break circular dependencies`,
          "Consider introducing interfaces or abstraction layers to reduce coupling",
          "Review the removed dependencies to ensure functionality is preserved"
        ],
        validation,
        improvedEdges: improvedEdgesWithOperations
      };
    }

    console.log("edges(original/improved):", edges.length, result.improvedGraph?.edges.length);
    console.log("nodes:", nodes.length);

    return Response.json(result);
  } catch (err: any) {
    console.error("improve-graph error:", err);
    return new Response(
      JSON.stringify({ 
        error: err?.message ?? "Internal error",
        details: err?.stack
      }),
      { status: 500 }
    );
  }
}
