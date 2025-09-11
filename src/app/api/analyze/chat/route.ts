import { NextResponse } from "next/server";
import { indexRepoLocal } from "@/utils/chatUtils";
import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const DATA_DIR = path.join(process.cwd(), "data");
const REPOS_DIR = path.join(process.cwd(), "repos");

interface IndexRequest {
  owner: string;
  repo: string;
}

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
    const body: IndexRequest = await req.json();
    const { owner, repo } = body;

    if (!owner?.trim() || !repo?.trim()) {
      return NextResponse.json(
        { error: "Missing required parameters: owner and repo" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    console.log(`Starting indexing for ${owner}/${repo}`);

    // Ensure directories exist
    await fs.ensureDir(REPOS_DIR);
    await fs.ensureDir(DATA_DIR);

    const repoPath = path.join(REPOS_DIR, `${owner}__${repo}`);

    // Clone or update repository
    const cloneSuccess = await cloneOrUpdateRepo(owner, repo, repoPath);
    if (!cloneSuccess) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to clone repository. Please check if the repository exists and is public.",
        },
        { status: 400 }
      );
    }

    // Index the repository
    const result = await indexRepoLocal(owner, repo, repoPath);

    if (result.ok) {
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
        { success: false, error: "Indexing failed" },
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

async function cloneOrUpdateRepo(
  owner: string,
  repo: string,
  repoPath: string
): Promise<boolean> {
  try {
    const repoUrl = `https://github.com/${owner}/${repo}.git`;

    // Check if repo already exists
    if (await fs.pathExists(repoPath)) {
      console.log(`Repository already exists, updating: ${repoPath}`);
      try {
        await execAsync("git pull origin main", {
          cwd: repoPath,
          timeout: 30000,
        });
        console.log("Repository updated successfully");
        return true;
      } catch (pullError) {
        console.warn("Git pull failed, removing and re-cloning:", pullError);
        await fs.remove(repoPath);
      }
    }

    // Clone repository
    console.log(`Cloning repository: ${repoUrl}`);
    await execAsync(`git clone --depth 1 "${repoUrl}" "${repoPath}"`, {
      timeout: 60000, // 1 minute timeout
    });

    console.log("Repository cloned successfully");
    return true;
  } catch (error) {
    console.error(`Failed to clone repository ${owner}/${repo}:`, error);

    // Clean up partial clone
    try {
      if (await fs.pathExists(repoPath)) {
        await fs.remove(repoPath);
      }
    } catch (cleanupError) {
      console.warn("Failed to cleanup partial clone:", cleanupError);
    }

    return false;
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
