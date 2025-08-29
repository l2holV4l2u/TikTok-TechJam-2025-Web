import { auth } from "@/lib/auth"
import { GitHubAPI } from "@/lib/github"
import { buildFileTree } from "@/lib/tree"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const querySchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const { owner, repo } = querySchema.parse({
      owner: searchParams.get("owner"),
      repo: searchParams.get("repo"),
    })

    const github = new GitHubAPI(session.accessToken)
    
    // Get repository info to get default branch
    const repoInfo = await github.getRepo(owner, repo)
    
    // Get the default branch to get the tree SHA
    const branch = await github.getBranch(owner, repo, repoInfo.default_branch)
    
    // Get the tree
    const tree = await github.getRepoTree(owner, repo, branch.commit.sha)
    
    // Build file tree structure
    const fileTree = buildFileTree(tree.tree)

    return NextResponse.json({
      tree: fileTree,
      truncated: tree.truncated,
      defaultBranch: repoInfo.default_branch,
      totalFiles: tree.tree.length,
    })
  } catch (error) {
    console.error("Error fetching repo tree:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch repository tree"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
