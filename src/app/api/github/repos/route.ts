import { auth } from "@/lib/auth"
import { GitHubAPI } from "@/lib/github"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const querySchema = z.object({
  page: z.number().min(1).default(1),
  search: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get("page")) || 1
    const search = searchParams.get("search") || undefined
    
    const { page: validatedPage, search: validatedSearch } = querySchema.parse({
      page,
      search,
    })

    const github = new GitHubAPI(session.accessToken)
    const { repos, hasNextPage } = await github.getUserRepos(validatedPage, 30)

    // Filter repos by search term if provided
    const filteredRepos = validatedSearch
      ? repos.filter(repo => 
          repo.name.toLowerCase().includes(validatedSearch.toLowerCase()) ||
          repo.description?.toLowerCase().includes(validatedSearch.toLowerCase())
        )
      : repos

    return NextResponse.json({
      repos: filteredRepos,
      pagination: {
        page: validatedPage,
        hasNextPage: hasNextPage && !validatedSearch, // Disable pagination for search
      }
    })
  } catch (error) {
    console.error("Error fetching repos:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch repositories"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
