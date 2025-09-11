import { NextResponse } from "next/server";
import {
  fetchRelevantChunksLocal,
  indexFilesInMemory,
} from "@/utils/chatUtils";
import fs from "fs-extra";
import path from "path";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { GitHubAPI, type GitHubTreeItem } from "@/lib/github";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Use /tmp in serverless, local data folder in development
const getDataDir = () => {
  if (process.env.VERCEL) {
    return "/tmp/data";
  }
  return path.join(process.cwd(), "data");
};

const DATA_DIR = getDataDir();

interface IndexStatus {
  indexed: boolean;
  totalChunks?: number;
  lastIndexed?: string;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Missing owner or repo parameter" },
        { status: 400 }
      );
    }

    const status = await getIndexStatus(owner, repo);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error checking index status:", error);
    return NextResponse.json(
      { error: "Failed to check index status" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Check authentication first
    const session = await auth();
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - please login" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { owner, repo, question } = body;

    if (!owner?.trim() || !repo?.trim()) {
      return NextResponse.json(
        { error: "Missing required parameters: owner and repo" },
        { status: 400 }
      );
    }

    if (question?.trim()) {
      return await handleChatQuery(owner, repo, question.trim());
    }

    console.log(`Starting indexing for ${owner}/${repo}`);

    // Index the repository using GitHub API
    const result = await indexRepoViaGitHubAPI(
      session.accessToken,
      owner,
      repo
    );

    if (result.success && result.indexed !== undefined) {
      // Save indexing metadata
      await saveIndexMetadata(owner, repo, result.indexed);

      return NextResponse.json({
        success: true,
        indexed: result.indexed,
        warnings: result.errors?.length
          ? `${result.errors.length} files had processing errors`
          : undefined,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Indexing error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown indexing error",
      },
      { status: 500 }
    );
  }
}

async function indexRepoViaGitHubAPI(
  accessToken: string,
  owner: string,
  repo: string
): Promise<{
  success: boolean;
  indexed?: number;
  error?: string;
  errors?: string[];
}> {
  try {
    await fs.ensureDir(DATA_DIR);

    const gh = new GitHubAPI(accessToken);

    // Get repository info to get default branch
    const repoInfo = await gh.getRepo(owner, repo);
    const branch = await gh.getBranch(owner, repo, repoInfo.default_branch);
    const commitSha = branch.commit.sha;

    console.log(
      `Fetching repository tree for ${owner}/${repo} at ${commitSha}`
    );

    // Fetch full repository tree
    const tree = await gh.getRepoTree(owner, repo, commitSha);
    const entries = tree.tree as GitHubTreeItem[];

    // Filter for Kotlin/Java files
    const codeFiles = entries.filter(
      (entry) =>
        entry.type === "blob" &&
        (entry.path.endsWith(".kt") ||
          entry.path.endsWith(".kts") ||
          entry.path.endsWith(".java"))
    );

    if (codeFiles.length === 0) {
      return {
        success: false,
        error: "No Kotlin or Java files found in the repository",
      };
    }

    console.log(`Found ${codeFiles.length} code files to index`);

    const MAX_FILES = 500; // Reasonable limit
    const MAX_BLOB_SIZE = 1 * 1024 * 1024; // 1MB per file
    const filesToProcess = codeFiles.slice(0, MAX_FILES);

    const files: { path: string; content: string }[] = [];
    const errors: string[] = [];

    // Process files with higher concurrency for faster processing
    const CONCURRENCY = 15;
    let fileIndex = 0;

    async function processFile() {
      while (fileIndex < filesToProcess.length) {
        const currentIndex = fileIndex++;
        const file = filesToProcess[currentIndex];

        try {
          console.log(
            `Processing file ${currentIndex + 1}/${filesToProcess.length}: ${
              file.path
            }`
          );

          const blob = await gh.getBlob(owner, repo, file.sha);

          // Skip very large files
          if (blob.size > MAX_BLOB_SIZE) {
            console.warn(
              `Skipping large file: ${file.path} (${blob.size} bytes)`
            );
            continue;
          }

          let content: string;
          if (blob.encoding === "base64") {
            try {
              content = Buffer.from(blob.content, "base64").toString("utf-8");
            } catch (decodeError) {
              errors.push(`Failed to decode file ${file.path}: ${decodeError}`);
              continue;
            }
          } else {
            content = String((blob as any).content ?? "");
          }

          // Validate content is not empty
          if (content.trim().length === 0) {
            console.warn(`Skipping empty file: ${file.path}`);
            continue;
          }

          files.push({
            path: file.path,
            content: content,
          });
        } catch (fileError) {
          const errorMsg = `Failed to process file ${file.path}: ${fileError}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
    }

    // Process files concurrently
    await Promise.all(Array.from({ length: CONCURRENCY }, () => processFile()));

    if (files.length === 0) {
      return {
        success: false,
        error: "No valid code files could be processed",
        errors,
      };
    }

    console.log(
      `Successfully processed ${files.length} files, now indexing...`
    );

    // Use the file-based indexing logic with /tmp/
    const result = await indexFilesInMemory(owner, repo, files);

    return {
      success: result.ok,
      indexed: result.indexed,
      errors: [...errors, ...(result.errors || [])],
    };
  } catch (error) {
    console.error(`Failed to index repository via GitHub API:`, error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("404")) {
        return {
          success: false,
          error: "Repository not found or you don't have access to it",
        };
      }
      if (error.message.includes("403")) {
        return {
          success: false,
          error: "Access denied - please check your GitHub permissions",
        };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

async function getIndexStatus(
  owner: string,
  repo: string
): Promise<IndexStatus> {
  try {
    const indexFile = path.join(DATA_DIR, `${owner}__${repo}__index.json`);
    const metadataFile = path.join(
      DATA_DIR,
      `${owner}__${repo}__metadata.json`
    );

    if (!(await fs.pathExists(indexFile))) {
      return { indexed: false };
    }

    // Check if metadata exists
    if (await fs.pathExists(metadataFile)) {
      const metadata = await fs.readJSON(metadataFile);
      return {
        indexed: true,
        totalChunks: metadata.totalChunks,
        lastIndexed: metadata.lastIndexed,
      };
    }

    // Fallback: count chunks from index file
    const items = await fs.readJSON(indexFile);
    const totalChunks = Array.isArray(items) ? items.length : 0;

    return {
      indexed: totalChunks > 0,
      totalChunks,
    };
  } catch (error) {
    console.error("Error getting index status:", error);
    return { indexed: false };
  }
}

async function saveIndexMetadata(
  owner: string,
  repo: string,
  totalChunks: number
): Promise<void> {
  try {
    await fs.ensureDir(DATA_DIR);
    const metadataFile = path.join(
      DATA_DIR,
      `${owner}__${repo}__metadata.json`
    );
    const metadata = {
      owner,
      repo,
      totalChunks,
      lastIndexed: new Date().toISOString(),
      version: "1.0",
    };

    await fs.writeJSON(metadataFile, metadata, { spaces: 2 });
  } catch (error) {
    console.warn("Failed to save index metadata:", error);
  }
}

async function handleChatQuery(owner: string, repo: string, question: string) {
  try {
    console.log(`Processing question for ${owner}/${repo}: ${question}`);

    // 1. Check if repository is indexed
    const status = await getIndexStatus(owner, repo);
    if (!status.indexed) {
      return NextResponse.json({
        error:
          "Repository is not indexed yet. Please wait for auto-indexing to complete.",
      });
    }

    // 2. Fetch relevant code chunks
    const relevantChunks = await fetchRelevantChunksLocal(
      owner,
      repo,
      question,
      12
    );

    if (relevantChunks.length === 0) {
      return NextResponse.json({
        answer:
          "I couldn't find any relevant code chunks for your question. The repository might not contain relevant content or may need re-indexing.",
      });
    }

    // 3. Build context from relevant chunks
    const context = relevantChunks
      .map(
        (chunk, index) =>
          `--- Code Chunk ${index + 1} (Score: ${chunk.score.toFixed(
            3
          )}) ---\n${chunk.content}\n`
      )
      .join("\n");

    // 4. Create OpenAI completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // or "gpt-3.5-turbo" for faster/cheaper responses
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant analyzing a ${owner}/${repo} codebase. 
          
Rules:
- Provide accurate, helpful answers based on the provided code context
- If you can't find relevant information in the context, say so clearly
- Include specific code examples when helpful
- Mention file names when referencing specific code
- Be concise but thorough
- Format code blocks properly with triple backticks and language specification

The user is asking about this repository, and you have access to relevant code chunks below.`,
        },
        {
          role: "user",
          content: `Based on this code context from ${owner}/${repo}:

${context}

Question: ${question}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.1, // Lower temperature for more focused, factual responses
    });

    const answer = completion.choices[0]?.message?.content;

    if (!answer) {
      return NextResponse.json({
        error: "Failed to generate response from OpenAI",
      });
    }

    console.log(`Generated response for ${owner}/${repo} question`);

    return NextResponse.json({
      answer,
      relevantChunks: relevantChunks.length,
      sources: relevantChunks.map((chunk) => chunk.file),
    });
  } catch (error) {
    console.error("Chat query error:", error);
    return NextResponse.json(
      {
        error: `Failed to process question: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
