"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, ExternalLink, Github } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function DocsPage() {
  const [readmeContent, setReadmeContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReadme();
  }, []);

  const fetchReadme = async () => {
    try {
      setLoading(true);
      const response = await fetch("/README.md");

      if (!response.ok) {
        throw new Error("Failed to fetch README.md");
      }

      const content = await response.text();
      setReadmeContent(content);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load documentation"
      );
      // Fallback content if README.md is not accessible
      setReadmeContent(`# TikTok TechJam 2025 - Kotlin Dependency Analyzer

## Overview
This is a Kotlin dependency analysis tool that helps developers visualize and optimize their Kotlin project dependencies.

## Architecture Overview

\`\`\`text
┌─────────────────────────────── Frontend (Next.js App Router) ───────────────────────────────┐
│  src/app                                                                                    │
│  ├─ (UI) pages/routes (dashboard, repo viewer, graph view)                                  │
│  ├─ components (graph, toolbar, panels)                                                     │
│  ├─ api/* (server routes: analyze, github, chat)                                            │
│  └─ middleware.ts (auth/session & edge logic)                                               │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                     │ (fetch)
                     ▼
┌────────────────────────────── Serverless / Edge APIs (Next.js) ─────────────────────────────┐
│  /api/analyze/github       → orchestrates Kotlin analysis (Tree-sitter/worker, JSON graph)  │
│  /api/github/*             → GitHub repo list, file tree, file content (OAuth token)        │
│  /api/chat                 → OpenAI GPT suggestions (cycles, refactors)                     │
│  lib/*                     → shared code (types, analysis utils, adapters)                  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                     │ (third-party calls)
        ┌────────────┴───────────────┐
        ▼                            ▼
┌───────────────┐            ┌────────────────┐
│   GitHub API  │            │  OpenAI API    │
│ (repos/files) │            │ (analysis tips)│
└───────────────┘            └────────────────┘

Artifacts/Data flow:
1) User logs in → middleware & auth handle session.
2) User selects repo → /api/github fetches tree/files → Kotlin files sent to /api/analyze/github.
3) Analyzer emits TokGraph JSON (nodes/edges) → UI renders with React Flow.
4) (Optional) Graph sent to /api/chat → GPT returns insights (cycles, unused, refactors).
\`\`\`

## Features
- 🔍 **GitHub Integration**: Connect with your GitHub repositories
- 📊 **Dependency Visualization**: Interactive dependency graphs
- 🤖 **AI-Powered Analysis**: Get optimization suggestions
- 🔧 **Kotlin Support**: Specialized for Kotlin projects using Knit DI

## Getting Started
1. Sign in with your GitHub account
2. Browse your repositories
3. Select a Kotlin project
4. Generate dependency graphs
5. Get AI-powered optimization insights

## Technology Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Visualization**: React Flow, D3.js
- **Authentication**: NextAuth.js with GitHub OAuth
- **AI**: OpenAI GPT integration
- **Analysis**: Tree-sitter for Kotlin parsing

## Installation
\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## Environment Variables
\`\`\`
NEXTAUTH_SECRET=your-secret
GITHUB_ID=your-github-app-id
GITHUB_SECRET=your-github-app-secret
OPENAI_API_KEY=your-openai-key
\`\`\`
`);
    } finally {
      setLoading(false);
    }
  };

  const CodeBlock = ({
    inline,
    className,
    children,
    node,
    ...props
  }: CodeProps) => {
    const match = /language-(\w+)/.exec(className || "");
    const content = String(children).replace(/\n$/, "");

    // Multiple checks to determine if this is inline code:
    // 1. Explicit inline prop
    // 2. No newlines in content
    // 3. Content is short (likely inline)
    // 4. No language class (block code usually has language)
    const isInline =
      inline || !content.includes("\n") || (content.length < 50 && !className);

    // For inline code, always render as inline
    if (isInline) {
      return (
        <code
          className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }

    // For code blocks (non-inline), render with syntax highlighting
    return (
      <SyntaxHighlighter
        style={tomorrow}
        language={match ? match[1] : "text"}
        PreTag="div"
        className="rounded-md text-sm"
        {...props}
      >
        {content}
      </SyntaxHighlighter>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>

              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Documentation
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://github.com/l2holV4l2u/TikTok-TechJam-2025-Web"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Github className="w-4 h-4" />
                  View on GitHub
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-6 py-8 max-w-6xl">
          {/* Page Title */}
          <div className="mb-8">
            {error && (
              <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                ⚠️ Could not load README.md from repository. Showing fallback
                documentation.
              </div>
            )}
          </div>

          {/* Content */}
          <div className="min-h-[calc(100vh-250px)]">
            {loading ? (
              <div className="space-y-6">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
                <Skeleton className="h-6 w-4/5" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-6 w-5/6" />
                <Skeleton className="h-6 w-3/5" />
              </div>
            ) : (
              <div className="prose prose-gray dark:prose-invert prose-lg max-w-none">
                <ReactMarkdown
                  components={
                    {
                      code: CodeBlock,
                      h1: ({ children }: { children: React.ReactNode }) => (
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6 pb-3 border-b-2 border-gray-200 dark:border-gray-700">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }: { children: React.ReactNode }) => (
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mt-10 mb-5 pb-2 border-b border-gray-200 dark:border-gray-700">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }: { children: React.ReactNode }) => (
                        <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mt-8 mb-4">
                          {children}
                        </h3>
                      ),
                      p: ({ children }: { children: React.ReactNode }) => (
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-5 text-base">
                          {children}
                        </p>
                      ),
                      ul: ({ children }: { children: React.ReactNode }) => (
                        <ul className="list-disc list-inside space-y-2 mb-6 text-gray-600 dark:text-gray-400 ml-4">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }: { children: React.ReactNode }) => (
                        <ol className="list-decimal list-inside space-y-2 mb-6 text-gray-600 dark:text-gray-400 ml-4">
                          {children}
                        </ol>
                      ),
                      blockquote: ({
                        children,
                      }: {
                        children: React.ReactNode;
                      }) => (
                        <blockquote className="border-l-4 border-blue-500 pl-6 py-4 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg mb-6 my-6">
                          {children}
                        </blockquote>
                      ),
                      a: ({
                        href,
                        children,
                      }: {
                        href?: string;
                        children: React.ReactNode;
                      }) => (
                        <a
                          href={href}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline underline-offset-2"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      ),
                    } as Components
                  }
                >
                  {readmeContent}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
