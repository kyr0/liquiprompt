import type { SyncTagFn } from "../interfaces";
// Import the default export from hnswlib-node
import hnswlib from "hnswlib-node";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

// Simple cache for embeddings to avoid redundant computations
const embeddingCache = new Map<string, Float32Array>();

// Type definitions for examples
interface Example {
  id: string;          // Unique identifier
  text: string;        // The example text
  embedding?: Float32Array; // The vector embedding
}

interface ExamplesDatabase {
  examples: Example[];
  index?: hnswlib.HierarchicalNSW;
  dimension: number;
  initialized: boolean;
}

// Global database instance - lazily initialized
const examplesDb: ExamplesDatabase = {
  examples: [],
  dimension: 384, // Default dimension for embeddings
  initialized: false,
};

/**
 * Initialize the vector database with examples
 * @param examples Array of example texts to add to the database
 * @param dimension Vector dimension (defaults to 384)
 */
async function initializeVectorDb(examples: string[], dimension = 384): Promise<void> {
  if (examplesDb.initialized) return;

  try {
    // Import the transformers library dynamically since we're in an async context
    // This avoids loading it if the examples tag isn't used
    const { pipeline } = await import("@xenova/transformers");

    // Create the embedding model
    const embeddingModel = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

    // Initialize the index with 'cosine' distance (inner product space)
    const index = new hnswlib.HierarchicalNSW('cosine', dimension);
    index.initIndex(examples.length);

    // Process each example and add to the database
    for (let i = 0; i < examples.length; i++) {
      const text = examples[i];
      const id = crypto.createHash("md5").update(text).digest("hex");

      // Generate embedding if not already cached
      if (!embeddingCache.has(id)) {
        const output = await embeddingModel(text, { pooling: "mean", normalize: true });
        const embedding = new Float32Array(output.data);
        embeddingCache.set(id, embedding);
      }

      const embedding = embeddingCache.get(id)!;

      // Add to database
      examplesDb.examples.push({ id, text, embedding });

      // Add to index - convert Float32Array to regular Array
      index.addPoint(Array.from(embedding), i);
    }

    examplesDb.index = index;
    examplesDb.dimension = dimension;
    examplesDb.initialized = true;

    console.log(`Vector database initialized with ${examples.length} examples`);
  } catch (error) {
    console.error("Failed to initialize vector database:", error);
    throw error;
  }
}

/**
 * Load examples from a file or directory
 * @param source Path to examples file or directory
 * @returns Array of example strings
 */
function loadExamplesFromSource(source: string): string[] {
  try {
    const examples: string[] = [];
    const fullPath = path.resolve(process.cwd(), source);

    if (!fs.existsSync(fullPath)) {
      console.warn(`Examples source not found: ${fullPath}`);
      return [];
    }

    const stats = fs.statSync(fullPath);

    if (stats.isFile()) {
      // Load from single file
      const content = fs.readFileSync(fullPath, "utf-8");

      // Split by markdown-style triple backtick code blocks or lines
      if (content.includes("```")) {
        const regex = /```(?:.*?\n)?([\s\S]*?)```/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
          examples.push(match[1].trim());
        }
      } else {
        // Split by lines with a separator (empty line)
        const blocks = content.split(/\n\s*\n/);
        examples.push(...blocks.filter(block => block.trim().length > 0));
      }
    } else if (stats.isDirectory()) {
      // Load from directory - each file is an example
      const files = fs.readdirSync(fullPath);
      for (const file of files) {
        if (file.endsWith(".md") || file.endsWith(".txt") || file.endsWith(".js") || file.endsWith(".ts")) {
          const content = fs.readFileSync(path.join(fullPath, file), "utf-8");
          examples.push(content);
        }
      }
    }

    return examples;
  } catch (error) {
    console.error("Error loading examples:", error);
    return [];
  }
}

/**
 * Find similar examples using vector similarity search
 * @param query Query text
 * @param count Number of examples to return
 * @returns Array of similar examples
 */
async function findSimilarExamples(query: string, count: number): Promise<Example[]> {
  try {
    if (!examplesDb.initialized || !examplesDb.index) {
      throw new Error("Vector database not initialized");
    }

    // Import dynamically to avoid loading if not used
    const { pipeline } = await import("@xenova/transformers");

    // Create the embedding model
    const embeddingModel = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

    // Generate query embedding
    const output = await embeddingModel(query, { pooling: "mean", normalize: true });
    const queryEmbedding = new Float32Array(output.data);

    // Search for similar examples
    const k = Math.min(count, examplesDb.examples.length);
    const result = examplesDb.index.searchKnn(Array.from(queryEmbedding), k);

    // Get the examples by index
    const similar = result.neighbors.map(idx => examplesDb.examples[idx]);

    return similar;
  } catch (error) {
    console.error("Error finding similar examples:", error);
    return [];
  }
}

/** 
 * The examples tag loads and finds similar examples from a local database
 * {% examples query='{{ user_context }}' count=3 source='data/examples' %}
 */
export const defineExamplesTag: SyncTagFn = async (_tagName, _ctx, values) => {
  const query = values.query || "";
  const count = Number.parseInt(values.count || "3", 10);
  const source = values.source || "data/examples";

  try {
    // Load examples if not already initialized
    if (!examplesDb.initialized) {
      const examples = loadExamplesFromSource(source);
      if (examples.length === 0) {
        return "<!-- No examples found -->";
      }

      await initializeVectorDb(examples);
    }

    // Find similar examples
    const similarExamples = await findSimilarExamples(query, count);

    // Format the examples for the prompt
    if (similarExamples.length === 0) {
      return "<!-- No similar examples found -->";
    }

    // Format the examples with numbering and triple backticks
    const formattedExamples = similarExamples
      .map((example, index) => {
        return `Example ${index + 1}:\n\`\`\`\n${example.text}\n\`\`\``;
      })
      .join("\n\n");

    return formattedExamples;
  } catch (error) {
    console.error("Error in examples tag:", error);
    return `<!-- Error loading examples: ${error instanceof Error ? error.message : String(error)} -->`;
  }
};
