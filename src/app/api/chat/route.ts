// app/api/knit-fix/route.ts
import { DependencyGraphProps } from "@/app/types/graphTypes";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Check for API key before initializing OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is not set");
}

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export const runtime = "nodejs";

export async function analyzeGraph(input : DependencyGraphProps): Promise<DependencyGraphProps> {
  try {
    // Check if OpenAI is properly initialized
    if (!openai || !process.env.OPENAI_API_KEY) {
      console.error("OpenAI not initialized - API key missing");
      throw new Error("OpenAI API key not configured");
    }

    // Minimal guard
    if (!input || typeof input !== "object") {
      throw new Error("Invalid input data");
    }

    // System prompt – emphasizes SUGGESTIONS as actionable, prioritized bullets
    const system = `
You are a Kotlin/JVM dependency analyst for TikTok's Knit DI projects.

GOAL
Given project metadata, output STRICT JSON with:
- nodes (id,label,file)
- edges (source,target,confidence,reason,issue|null)
- issues (type,items,reason)
- suggestions: 3–8 concise, actionable bullets prioritized by impact (no prose outside JSON)
- fixed graph (nodes,edges) reflecting suggested refactors when justified
- inputEcho

RULES
- Prefer evidence: bytecodeEdges > symbolRefs > fileToImports > heuristics.
- Edges mean "A depends on B".
- Detect: circular, unnecessary (transitive), unusedNode.
- Keep ids = simple name from FQN.
- Confidence [0,1]. No duplicates. Validate referential integrity.
`;

    // User prompt with your live JSON
    const user = `
Project metadata (Knit):
${JSON.stringify(input)}

Tasks:
1) Build nodes from fileToDefinedNodes (one node per FQN, keep file path).
2) Infer edges and mark issues: circular, unnecessary, unusedNode.
3) Return 3–8 **actionable** suggestions, prioritized (short imperative bullets).
4) Provide a "fixed" graph that resolves issues where possible.
5) Return ONLY JSON in this schema:

{
  "nodes": [{ "id": string, "label": string, "file": string }],
  "edges": [{ "source": string, "target": string, "confidence": number, "reason": string, "issue": "circular" | "unnecessary" | null }],
  "issues": [{ "type": "circular" | "unnecessary" | "unusedNode", "items": string[], "reason": string }],
  "suggestions": string[],
  "fixed": {
    "nodes": [{ "id": string, "label": string, "file": string }],
    "edges": [{ "source": string, "target": string, "confidence": number, "reason": string }]
  },
  "inputEcho": object
}
`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error("Model did not return valid JSON");
    }

    // Optional: tiny shape check
    if (!Array.isArray(json?.suggestions)) {
      throw new Error("Missing suggestions array");
    }

    // Transform for DependencyGraphProps format
    const dependencyGraph: DependencyGraphProps = {
      nodes: (json.fixed?.nodes || json.nodes || []).map((node: any) => ({
        id: node.id,
        label: node.label || node.id,
      })),
      edges: (json.fixed?.edges || json.edges || []).map((edge: any) => ({
        source: edge.source,
        target: edge.target,
      })),
    };

    return dependencyGraph;
  } catch (e: any) {
    // Fallback with sample data
    const fallbackGraph: DependencyGraphProps = {
      nodes: [
        {
          id: "MainActivity",
          label: "MainActivity",
        },
        {
          id: "Another",
          label: "Another",
        },
      ],
      edges: [
        {
          source: "MainActivity",
          target: "Another",
        },
      ],
    };

    return fallbackGraph;
  }
}

// Add POST handler 
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await analyzeGraph(body);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Invalid request body" }, { status: 400 });
  }
}