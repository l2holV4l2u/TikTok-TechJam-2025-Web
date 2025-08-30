// src/app/api/analyze/file/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { analyzeFiles } from "@/lib/analyze-core";

const requestSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  // Optional metadata
  owner: z.string().optional(),
  repo: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const body = await req.json();
    const { path, content, owner, repo } = requestSchema.parse(body);

    // Ensure it's a Kotlin file
    if (!path.endsWith(".kt")) {
      return new Response(
        JSON.stringify({ error: "Only Kotlin files (.kt) are supported" }),
        { status: 400 }
      );
    }

    // Create single file array for analysis
    const files = [{ path, content }];

    const analysis = await analyzeFiles(files);

    return Response.json({
      file: { path, owner, repo },
      fileCount: 1,
      ...analysis,
    });
  } catch (err: any) {
    console.error("analyze/file error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Internal error" }),
      { status: 500 }
    );
  }
}
