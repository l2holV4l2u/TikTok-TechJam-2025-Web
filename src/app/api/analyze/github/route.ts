// src/app/api/analyze/github/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { GitHubAPI, type GitHubTreeItem } from "@/lib/github";
import { analyzeFiles } from "@/lib/analyze-core";

const query = z.object({
  owner:  z.string().min(1),
  repo:   z.string().min(1),
  ref:    z.string().optional(),   // branch/tag/sha; default: default_branch
  prefix: z.string().optional(),   // optional folder filter
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const { owner, repo, ref, prefix } = query.parse({
      owner:  searchParams.get("owner"),
      repo:   searchParams.get("repo"),
      ref:    searchParams.get("ref") ?? undefined,
      prefix: searchParams.get("prefix") ?? undefined,
    });

    const gh = new GitHubAPI(session.accessToken);

    // resolve ref -> commit sha
    let commitSha: string;
    if (ref) {
      try {
        const b = await gh.getBranch(owner, repo, ref);
        commitSha = b.commit.sha;
      } catch {
        commitSha = ref; // assume it is already a commit SHA
      }
    } else {
      const info = await gh.getRepo(owner, repo);
      const b = await gh.getBranch(owner, repo, info.default_branch);
      commitSha = b.commit.sha;
    }

    // fetch full tree
    const tree = await gh.getRepoTree(owner, repo, commitSha);
    let entries = tree.tree as GitHubTreeItem[];

    // optional folder filter (prefix)
    const normPrefix = (prefix ?? "").replace(/^\/+|\/+$/g, "");
    if (normPrefix) {
      entries = entries.filter(
        (e) => e.path === normPrefix || e.path.startsWith(normPrefix + "/")
      ).map((e) => ({ ...e, path: e.path === normPrefix ? "" : e.path.slice(normPrefix.length + 1) }))
       .filter((e) => e.path !== "");
    }

    // only Kotlin blobs
    const kt = entries.filter((e) => e.type === "blob" && e.path.endsWith(".kt"));

    // fetch blobs with small concurrency, limit per-file size
    const MAX_FILES = 2000;
    const MAX_BLOB = 1 * 1024 * 1024; // 1 MB
    const toFetch = kt.slice(0, MAX_FILES);
    const files: { path: string; content: string }[] = [];

    const CONCURRENCY = 8;
    let i = 0;
    async function worker() {
      while (i < toFetch.length) {
        const idx = i++;
        const f = toFetch[idx];
        const blob = await gh.getBlob(owner, repo, f.sha);
        if (blob.size > MAX_BLOB) continue;

        if (blob.encoding === "base64") {
          try {
            const text = Buffer.from(blob.content, "base64").toString("utf-8");
            files.push({ path: f.path, content: text });
          } catch {
            // skip non-text
          }
        } else {
          files.push({ path: f.path, content: String(blob.content ?? "") });
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const analysis = await analyzeFiles(files);

    return Response.json({
      repo: { owner, name: repo, ref: ref ?? commitSha, fileCount: files.length },
      truncated: tree.truncated,
      prefix: normPrefix || undefined,
      ...analysis,
    });
  } catch (err: any) {
    console.error("analyze/github error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Internal error" }), { status: 500 });
  }
}
