import { z } from "zod"

// GitHub API types
export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  owner: {
    login: string
    avatar_url: string
  }
  description: string | null
  updated_at: string
  default_branch: string
  language: string | null
  stargazers_count: number
  forks_count: number
}

export interface GitHubTreeItem {
  path: string
  mode: string
  type: "blob" | "tree"
  sha: string
  size?: number
  url: string
}

export interface GitHubTree {
  sha: string
  url: string
  tree: GitHubTreeItem[]
  truncated: boolean
}

export interface GitHubBlob {
  sha: string
  size: number
  url: string
  content: string
  encoding: "base64" | "utf-8"
}

export interface GitHubBranch {
  name: string
  commit: {
    sha: string
    url: string
  }
  protected: boolean
}

// API helper functions
export class GitHubAPI {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private async fetch(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "NextJS-GitHub-App",
        ...options.headers,
      },
    })

    if (!response.ok) {
      if (response.status === 403) {
        const resetTime = response.headers.get("X-RateLimit-Reset")
        throw new Error(`Rate limit exceeded. Resets at ${resetTime}`)
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    return response
  }

  async getUserRepos(page = 1, perPage = 30): Promise<{ repos: GitHubRepo[], hasNextPage: boolean }> {
    const response = await this.fetch(`/user/repos?page=${page}&per_page=${perPage}&sort=updated&type=all`)
    const repos = await response.json()
    
    // Check if there's a next page by looking at the Link header
    const linkHeader = response.headers.get("Link")
    const hasNextPage = linkHeader?.includes('rel="next"') || false

    return { repos, hasNextPage }
  }

  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const response = await this.fetch(`/repos/${owner}/${repo}`)
    return response.json()
  }

  async getRepoTree(owner: string, repo: string, sha: string): Promise<GitHubTree> {
    const response = await this.fetch(`/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`)
    return response.json()
  }

  async getBlob(owner: string, repo: string, sha: string): Promise<GitHubBlob> {
    const response = await this.fetch(`/repos/${owner}/${repo}/git/blobs/${sha}`)
    return response.json()
  }

  async getBranch(owner: string, repo: string, branch: string): Promise<GitHubBranch> {
    const response = await this.fetch(`/repos/${owner}/${repo}/branches/${branch}`)
    return response.json()
  }
}

// Utility functions
export function guessFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  
  const mimeTypes: Record<string, string> = {
    // Text
    'txt': 'text/plain',
    'md': 'text/markdown',
    'markdown': 'text/markdown',
    
    // Code
    'js': 'application/javascript',
    'jsx': 'application/javascript',
    'ts': 'application/typescript',
    'tsx': 'application/typescript',
    'py': 'text/x-python',
    'java': 'text/x-java-source',
    'cpp': 'text/x-c++src',
    'c': 'text/x-csrc',
    'h': 'text/x-chdr',
    'css': 'text/css',
    'html': 'text/html',
    'xml': 'application/xml',
    'json': 'application/json',
    'yaml': 'application/x-yaml',
    'yml': 'application/x-yaml',
    
    // Config
    'toml': 'application/toml',
    'ini': 'text/plain',
    'conf': 'text/plain',
    'config': 'text/plain',
    
    // Shell
    'sh': 'application/x-sh',
    'bash': 'application/x-sh',
    'zsh': 'application/x-sh',
    
    // Other
    'sql': 'application/sql',
    'dockerfile': 'text/plain',
    'gitignore': 'text/plain',
  }
  
  return mimeTypes[ext || ''] || 'text/plain'
}

export function isTextFile(filename: string): boolean {
  const mimeType = guessFileType(filename)
  return mimeType.startsWith('text/') || 
         mimeType.startsWith('application/json') ||
         mimeType.startsWith('application/xml') ||
         mimeType.startsWith('application/javascript') ||
         mimeType.startsWith('application/typescript') ||
         mimeType.includes('yaml') ||
         mimeType.includes('toml') ||
         mimeType.includes('sql') ||
         mimeType.includes('sh')
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
