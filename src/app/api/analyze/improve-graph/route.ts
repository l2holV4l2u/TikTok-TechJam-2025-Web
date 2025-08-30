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
    kind: z.string(), // This matches the actual structure from analyze-core
  })),
  context: z.object({
    owner: z.string(),
    repo: z.string(),
  }).optional(),
});

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
};

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

    // Prepare the prompt for ChatGPT 4o.mini
    const graphAnalysisPrompt = `
You are a dependency graph analysis expert. Analyze the following Kotlin dependency graph and determine if it can be improved.

Context: ${context ? `Repository: ${context.owner}/${context.repo}` : "Unknown repository"}

Current Graph Structure:
Nodes (${nodes.length} total):
${nodes.map(node => `- ${node.id} (${node.kind}) defined in ${node.definedIn.file}:${node.definedIn.line}`).join('\n')}

Edges (${edges.length} total):
${edges.map(edge => `- ${edge.source} → ${edge.target} (${edge.kind})`).join('\n')}
You are given a dependency graph of a software project.

Return results STRICTLY as JSON (no extra text) with this structure:

{
  "status": "ok" | "improved",
  "message": "Brief explanation of the analysis",
  "issues": ["list of identified issues such as circular dependencies, unnecessary coupling, missing abstraction layers, DIP violations, poor modularization"],
  "suggestions": ["list of improvement suggestions based on the issues found"],
  "improvedNodes": [
    {
      "id": "node_id",
      "kind": "class" | "interface" | "module" | "function",
      "definedIn": {"file": "path/to/file", "line": number},
      "usedIn": ["list of places this node is used, if applicable"]
    }
  ],
  "improvedEdges": [
    {
      "source": "source_node_id",
      "target": "target_node_id",
      "type": "dependsOn" | "imports" | "implements" | "extends"
    }
  ],
  "validation": {
    "originalNodeIdsEcho": ["exact list of ALL node IDs from the input graph"],
    "edgeNodeCheck": {
      "unknownSources": ["any source ids in improvedEdges not found in originalNodeIdsEcho"],
      "unknownTargets": ["any target ids in improvedEdges not found in originalNodeIdsEcho"]
    },
    "duplicateIds": ["any duplicated node ids you detect"],
    "danglingEdges": ["stringified edges that reference missing nodes, must be []"],
    "notes": "Any constraints you applied or corrections you made"
  }
}

Analysis tasks:
1) Detect circular dependencies (cycles).
2) Identify unnecessary coupling (mutual or dense pairwise dependencies without clear need).
3) Find missing abstraction layers (e.g., high-level modules directly depending on low-level details).
4) Detect Dependency Inversion Principle violations (high-level depending on low-level implementations rather than abstractions).
5) Suggest better modularization (split/merge/restructure).

HARD RULES (must follow):
- DO NOT invent or rename nodes. Keep node IDs EXACTLY as in the input graph.
- You may NOT create new nodes. If you want to propose new abstractions, describe them in "suggestions" only.
- "improvedEdges" must ONLY reference node IDs present in "originalNodeIdsEcho". If an edge would reference a non-existent node, omit it and explain in "validation.notes".
- If no changes are needed, set "status":"ok" and leave "improvedNodes" and "improvedEdges" as empty arrays.
- If improvements are possible, set "status":"improved" and include ONLY modified connections in "improvedEdges". Do not include unchanged edges.
- The response MUST be valid JSON. No commentary outside the JSON object.

Quality checks before you output:
- Ensure "validation.edgeNodeCheck.unknownSources" and "unknownTargets" are both [].
- Ensure "validation.danglingEdges" is [].
- Ensure every id in "improvedNodes" also appears in "originalNodeIdsEcho" (we are not adding nodes, only highlighting improved ones).
- Keep the JSON under 50KB.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert in software architecture and dependency analysis. Respond only with valid JSON."
        },
        {
          role: "user",
          content: graphAnalysisPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error("No response from OpenAI");
    }

    let aiResponse;
    try {
      aiResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseText);
      throw new Error("Invalid JSON response from AI");
    }

    const result: ImprovementResult = {
      status: aiResponse.status || "ok",
      message: aiResponse.message || "Analysis completed",
      suggestions: aiResponse.suggestions || [],
    };

    if (aiResponse.status === "improved") {
      result.originalGraph = { 
        nodes, 
        edges: edges.map(e => ({ ...e, type: e.kind })) 
      };
      result.improvedGraph = {
        nodes: aiResponse.improvedNodes || nodes,
        edges: (aiResponse.improvedEdges || edges).map((e: any) => ({ 
          source: e.source, 
          target: e.target, 
          type: e.type || e.kind 
        })),
      };
    }
    console.log("improve-graph result:", result.improvedGraph?.edges);
    console.log(result.improvedGraph?.nodes)
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
