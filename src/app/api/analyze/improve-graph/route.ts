import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { cosineSim, embed } from "@/utils/vectorUtils";
import { fetchRepoFiles } from "@/utils/githubUtils";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type FileEntry = { path: string; code: string; embedding: number[] };
let vectorDB: FileEntry[] = []; // demo in-memory; replace with real DB later

// Index repo into vector DB
async function indexRepo(files: { path: string; code: string }[]) {
  const embeddings = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: files.map((f) => f.code),
  });

  vectorDB = files.map((f, i) => ({
    ...f,
    embedding: embeddings.data[i].embedding,
  }));
}

// Query relevant files/snippets
async function queryRepo(issue: string, topN = 5) {
  const qEmbed = await embed(issue);
  const scored = vectorDB.map((f) => ({
    ...f,
    score: cosineSim(f.embedding, qEmbed),
  }));
  return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}

// LLM code change suggestions
async function suggestChanges(issue: string, snippets: FileEntry[]) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an expert Kotlin developer. Suggest direct code changes for DI issues. " +
          "Format as JSON: [{file, before, after, reason}]",
      },
      {
        role: "user",
        content: `Issue: ${issue}\nRelevant code:\n${snippets
          .map((s) => `File: ${s.path}\n${s.code}`)
          .join("\n\n---\n\n")}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return completion.choices[0].message?.content;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { owner, repo, issue } = await req.json();

    // (1) Fetch repo files from GitHub
    const files = await fetchRepoFiles(owner, repo, session.accessToken);

    // (2) Index files into vector DB
    await indexRepo(files);

    // (3) Query relevant files by issue
    const relevant = await queryRepo(issue || "dependency cycle", 8);

    // (4) Get suggestions from LLM
    const suggestions = await suggestChanges(issue, relevant);

    return NextResponse.json({
      ok: true,
      issue,
      suggestions: JSON.parse(suggestions || "[]"),
    });
  } catch (err: any) {
    console.error("improve-graph error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
