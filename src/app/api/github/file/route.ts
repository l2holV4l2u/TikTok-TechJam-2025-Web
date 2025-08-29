import { auth } from "@/lib/auth"
import { GitHubAPI, guessFileType, isTextFile } from "@/lib/github"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const querySchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  sha: z.string().min(1),
  path: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const { owner, repo, sha, path } = querySchema.parse({
      owner: searchParams.get("owner"),
      repo: searchParams.get("repo"),
      sha: searchParams.get("sha"),
      path: searchParams.get("path"),
    })

    const github = new GitHubAPI(session.accessToken)
    const blob = await github.getBlob(owner, repo, sha)

    const mimeType = guessFileType(path)
    const isText = isTextFile(path)

    // Check if file is too large (> 1MB for text files, > 10MB for any file)
    const maxSize = isText ? 1024 * 1024 : 10 * 1024 * 1024
    if (blob.size > maxSize) {
      return NextResponse.json({
        error: "File too large",
        size: blob.size,
        path,
        downloadUrl: `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`,
      }, { status: 413 })
    }

    let content = ""
    let isBinary = false

    if (blob.encoding === "base64") {
      if (isText) {
        try {
          content = Buffer.from(blob.content, "base64").toString("utf-8")
        } catch (error) {
          isBinary = true
        }
      } else {
        isBinary = true
      }
    } else {
      content = blob.content
    }

    return NextResponse.json({
      content: isBinary ? null : content,
      base64Content: blob.content,
      size: blob.size,
      path,
      mimeType,
      isBinary,
      isText,
      sha: blob.sha,
      downloadUrl: `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`,
    })
  } catch (error) {
    console.error("Error fetching file:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch file"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
