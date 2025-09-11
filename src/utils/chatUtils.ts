import fs from "fs-extra";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Use /tmp in serverless, local data folder in development
const getDataDir = () => {
  if (
    process.env.VERCEL ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
  ) {
    return "/tmp/data";
  }
  return path.join(process.cwd(), "data");
};

const DATA_DIR = getDataDir();

interface CodeChunk {
  id: string;
  content: string;
  file: string;
}

interface IndexedItem extends CodeChunk {
  embedding: number[];
}

interface RelevantChunk {
  file: string;
  content: string;
  score: number;
}

export async function embed(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.substring(0, 8000), // Limit input length to avoid API limits
    });
    return response.data[0].embedding as number[];
  } catch (error) {
    console.error("Embedding error:", error);
    throw new Error(
      `Failed to generate embedding: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export function chunkKotlinFile(
  content: string,
  filePath: string
): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  const cleanContent = content.trim();
  if (!cleanContent) return [];

  // Regex tuned for Kotlin: classes, objects, interfaces, enums, fun, val, var
  const declRegex =
    /(?:^|\n)\s*(?:@[^\n]*\n\s*)*(?:(?:public|private|protected|internal)\s+)?(?:abstract\s+|final\s+|open\s+|sealed\s+|inner\s+|data\s+|inline\s+|suspend\s+|operator\s+|infix\s+)?(class|interface|object|enum\s+class|annotation\s+class|fun|val|var)\b[\s\S]*?(?=(?:\n\s*(?:public|private|protected|internal)\s+|$))/g;

  let match;
  let chunkIndex = 0;
  const foundMatches: string[] = [];

  while ((match = declRegex.exec(cleanContent)) !== null) {
    const declaration = match[0].trim();
    if (declaration.length > 10) {
      foundMatches.push(declaration);
    }
  }

  if (foundMatches.length > 0) {
    foundMatches.forEach((declaration, index) => {
      chunks.push({
        id: `${filePath}::decl::${index}`,
        content: declaration,
        file: filePath,
      });
    });
  } else {
    // Fallback: small file → keep entire file
    const lines = cleanContent.split("\n");
    if (lines.length <= 80) {
      chunks.push({
        id: `${filePath}::full`,
        content: cleanContent,
        file: filePath,
      });
    } else {
      // Larger file: split into 60-line chunks
      const LINES_PER_CHUNK = 60;
      for (let i = 0; i < lines.length; i += LINES_PER_CHUNK) {
        const chunkLines = lines
          .slice(i, i + LINES_PER_CHUNK)
          .join("\n")
          .trim();
        if (chunkLines.length > 0) {
          chunks.push({
            id: `${filePath}::chunk::${chunkIndex++}`,
            content: chunkLines,
            file: filePath,
          });
        }
      }
    }
  }

  // Always guarantee at least one chunk
  if (chunks.length === 0) {
    chunks.push({
      id: `${filePath}::fallback`,
      content: cleanContent,
      file: filePath,
    });
  }

  // Add file header context
  return chunks.map((chunk) => ({
    ...chunk,
    content: `// File: ${chunk.file}\n${chunk.content}`,
  }));
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dot / magnitude;
}

async function ensureDataDir(): Promise<void> {
  try {
    await fs.ensureDir(DATA_DIR);
  } catch (error) {
    console.error("Failed to create data directory:", error);
    throw new Error("Failed to initialize data directory");
  }
}

// New function for in-memory file indexing
export async function indexFilesInMemory(
  owner: string,
  repo: string,
  files: { path: string; content: string }[]
): Promise<{ ok: boolean; indexed: number; errors?: string[] }> {
  try {
    await ensureDataDir();
    const indexFile = path.join(DATA_DIR, `${owner}__${repo}__index.json`);

    console.log(`Indexing ${files.length} files for ${owner}/${repo}`);

    const items: IndexedItem[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const chunks = chunkKotlinFile(file.content, file.path);
        console.log(`Processing ${chunks.length} chunks from ${file.path}`);

        for (const chunk of chunks) {
          try {
            const embedding = await embed(chunk.content);
            items.push({
              id: `${owner}/${repo}/${chunk.id}`,
              embedding,
              file: chunk.file,
              content: chunk.content,
            });
          } catch (embeddingError) {
            const errorMsg = `Failed to embed chunk ${chunk.id}: ${embeddingError}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }

        // Remove the artificial delay for faster processing
        // await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (fileError) {
        const errorMsg = `Failed to process file ${file.path}: ${fileError}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    if (items.length === 0) {
      throw new Error("No content was successfully indexed");
    }

    await fs.writeJson(indexFile, items, { spaces: 2 });

    console.log(`Successfully indexed ${items.length} chunks`);
    return {
      ok: true,
      indexed: items.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Indexing error:", error);
    throw new Error(
      `Failed to index files: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Keep the original function for backward compatibility
export async function indexRepoLocal(
  owner: string,
  repo: string,
  repoPath: string
): Promise<{ ok: boolean; indexed: number; errors?: string[] }> {
  try {
    await ensureDataDir();
    const indexFile = path.join(DATA_DIR, `${owner}__${repo}__index.json`);

    console.log(`Indexing repository: ${owner}/${repo} at ${repoPath}`);

    const files = await getKotlinFiles(repoPath);
    console.log(`Found ${files.length} Kotlin/Java files to process`);

    const items: IndexedItem[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, "utf-8");
        const chunks = chunkKotlinFile(content, file);

        console.log(`Processing ${chunks.length} chunks from ${file}`);

        for (const chunk of chunks) {
          try {
            const embedding = await embed(chunk.content);
            items.push({
              id: `${owner}/${repo}/${chunk.id}`,
              embedding,
              file: chunk.file,
              content: chunk.content,
            });
          } catch (embeddingError) {
            const errorMsg = `Failed to embed chunk ${chunk.id}: ${embeddingError}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }

        // Remove artificial delay
        // await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (fileError) {
        const errorMsg = `Failed to process file ${file}: ${fileError}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    if (items.length === 0) {
      throw new Error("No content was successfully indexed");
    }

    await fs.writeJson(indexFile, items, { spaces: 2 });

    console.log(`Successfully indexed ${items.length} chunks`);
    return {
      ok: true,
      indexed: items.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Indexing error:", error);
    throw new Error(
      `Failed to index repository: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function getKotlinFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const maxFiles = 500; // Limit to prevent excessive processing

  try {
    const stack = [dir];

    while (stack.length > 0 && files.length < maxFiles) {
      const currentPath = stack.pop()!;

      try {
        const stats = await fs.stat(currentPath);

        if (stats.isDirectory()) {
          // Skip common directories that don't contain source code
          const dirName = path.basename(currentPath);
          if (
            [
              "node_modules",
              ".git",
              "build",
              ".gradle",
              "target",
              "out",
            ].includes(dirName)
          ) {
            continue;
          }

          const items = await fs.readdir(currentPath);
          for (const item of items) {
            stack.push(path.join(currentPath, item));
          }
        } else if (stats.isFile()) {
          const ext = path.extname(currentPath).toLowerCase();
          if ([".kt", ".kts", ".java"].includes(ext)) {
            // Skip very large files that might cause issues
            if (stats.size < 1024 * 1024) {
              // 1MB limit
              files.push(currentPath);
            }
          }
        }
      } catch (itemError) {
        console.warn(`Skipping inaccessible path: ${currentPath}`);
      }
    }

    return files;
  } catch (error) {
    console.error("Error scanning files:", error);
    throw new Error(
      `Failed to scan directory: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function fetchRelevantChunksLocal(
  owner: string,
  repo: string,
  query: string,
  topK: number = 6
): Promise<RelevantChunk[]> {
  try {
    await ensureDataDir();
    const indexFile = path.join(DATA_DIR, `${owner}__${repo}__index.json`);

    // Check if index exists
    const indexExists = await fs.pathExists(indexFile);
    if (!indexExists) {
      console.warn(`Index file not found for ${owner}/${repo}`);
      return [];
    }

    // Load the index
    const items: IndexedItem[] = await fs.readJSON(indexFile);
    if (!Array.isArray(items) || items.length === 0) {
      console.warn(`Empty or invalid index for ${owner}/${repo}`);
      return [];
    }

    console.log(`Loaded ${items.length} indexed items for search`);

    // Generate query embedding
    const queryEmbedding = await embed(query);

    // Calculate similarities and sort
    const scoredItems = items.map((item) => {
      try {
        const score = cosineSimilarity(queryEmbedding, item.embedding);
        return {
          file: item.file,
          content: item.content,
          score: isNaN(score) ? 0 : score,
        };
      } catch (error) {
        console.warn(`Failed to calculate similarity for item: ${error}`);
        return {
          file: item.file,
          content: item.content,
          score: 0,
        };
      }
    });

    // Sort by score and return top results
    scoredItems.sort((a, b) => b.score - a.score);

    const results = scoredItems.slice(0, Math.min(topK, scoredItems.length));
    console.log(
      `Returning ${results.length} relevant chunks with scores:`,
      results.map((r) => r.score.toFixed(3))
    );

    return results;
  } catch (error) {
    console.error("Error fetching relevant chunks:", error);
    throw new Error(
      `Failed to fetch relevant chunks: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
