// src/utils/chatUtils.ts
import fs from "fs-extra";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const DATA_DIR = path.join(process.cwd(), "data");

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

  // Clean the content and handle edge cases
  const cleanContent = content.trim();
  if (!cleanContent) {
    return [];
  }

  // Try to split by top-level declarations with improved regex
  const declRegex =
    /(?:^|\n)\s*(?:@[^\n]*\n\s*)*(?:(?:public|private|protected|internal)\s+)?(?:abstract\s+|final\s+|open\s+|sealed\s+|inner\s+|data\s+|inline\s+|suspend\s+|operator\s+|infix\s+)*(?:class|interface|object|enum\s+class|annotation\s+class|fun|val|var)(?:\s|<)+[^{]*?(?:\{[\s\S]*?(?:\n\}|\}\s*$)|[^\{]*?(?=\n\s*(?:@[^\n]*\n\s*)*(?:(?:public|private|protected|internal)\s+)?(?:abstract\s+|final\s+|open\s+|sealed\s+|inner\s+|data\s+|inline\s+|suspend\s+|operator\s+|infix\s+)*(?:class|interface|object|enum\s+class|annotation\s+class|fun|val|var)(?:\s|<)|$))/g;

  let match;
  let chunkIndex = 0;
  const foundMatches: string[] = [];

  while ((match = declRegex.exec(cleanContent)) !== null) {
    const declaration = match[0].trim();
    if (declaration.length > 50) {
      // Skip very small matches
      foundMatches.push(declaration);
    }
  }

  // If we found meaningful declarations, use them
  if (foundMatches.length > 0) {
    foundMatches.forEach((declaration, index) => {
      chunks.push({
        id: `${filePath}::decl::${index}`,
        content: declaration,
        file: filePath,
      });
    });
  } else {
    // Fallback: chunk by logical size (around 1000 characters or 30-40 lines)
    const lines = cleanContent.split("\n");
    const LINES_PER_CHUNK = 40;
    const MAX_CHUNK_SIZE = 1500;

    for (let i = 0; i < lines.length; i += LINES_PER_CHUNK) {
      const chunkLines = lines.slice(i, i + LINES_PER_CHUNK);
      const chunkContent = chunkLines.join("\n").trim();

      // Skip very small chunks
      if (chunkContent.length < 100) continue;

      // Split large chunks further
      if (chunkContent.length > MAX_CHUNK_SIZE) {
        const midpoint = Math.floor(chunkLines.length / 2);
        const firstHalf = chunkLines.slice(0, midpoint).join("\n").trim();
        const secondHalf = chunkLines.slice(midpoint).join("\n").trim();

        if (firstHalf.length > 100) {
          chunks.push({
            id: `${filePath}::chunk::${chunkIndex++}`,
            content: firstHalf,
            file: filePath,
          });
        }

        if (secondHalf.length > 100) {
          chunks.push({
            id: `${filePath}::chunk::${chunkIndex++}`,
            content: secondHalf,
            file: filePath,
          });
        }
      } else {
        chunks.push({
          id: `${filePath}::chunk::${chunkIndex++}`,
          content: chunkContent,
          file: filePath,
        });
      }
    }
  }

  // Add file context to each chunk for better retrieval
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

        // Add small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
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
