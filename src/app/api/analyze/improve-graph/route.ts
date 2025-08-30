// src/app/api/analyze/improve-graph/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import OpenAI from "openai";
import { GraphNode, GraphEdge } from "@/app/types/graphTypes";

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

    // Detect issues locally first
    const cycles = detectCycles(edges);
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
