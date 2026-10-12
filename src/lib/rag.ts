import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import { PolicyChunk, PolicyIngestionMeta } from "./types";
import { GoogleGenerativeAI } from "@google/generative-ai";

const DATA_DIR = path.join(process.cwd(), "data");
const CHUNKS_FILE = path.join(DATA_DIR, "policy_chunks.json");
const META_FILE = path.join(DATA_DIR, "policy_meta.json");

function ensureDirectoryExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Simple deterministic vector embedding fallback (Bag of words + hashed n-grams normalized)
function generateLocalEmbedding(text: string, dimensions = 64): number[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const vector = new Array(dimensions).fill(0);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let c = 0; c < word.length; c++) {
      hash = (hash << 5) - hash + word.charCodeAt(c);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vector[idx] += 1;
  }

  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map(v => v / magnitude);
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class RagService {
  private static async getEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text);
        if (result.embedding?.values) {
          return result.embedding.values;
        }
      } catch (err) {
        console.warn("Gemini embedding API call failed, using high-resolution local vectorizer:", err);
      }
    }
    return generateLocalEmbedding(text, 128);
  }

  public static getIngestionMeta(): PolicyIngestionMeta {
    ensureDirectoryExists();
    if (fs.existsSync(META_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(META_FILE, "utf-8"));
      } catch (e) {
        // ignore
      }
    }
    return {
      fileName: "None",
      version: "0.0.0",
      ingestedAt: "",
      totalChunks: 0,
      status: "INDEXING"
    };
  }

  public static getChunks(): PolicyChunk[] {
    ensureDirectoryExists();
    if (!fs.existsSync(CHUNKS_FILE)) {
      // Auto-ingest default DOCX if available
      this.autoIngestDefault();
    }
    try {
      if (fs.existsSync(CHUNKS_FILE)) {
        return JSON.parse(fs.readFileSync(CHUNKS_FILE, "utf-8"));
      }
    } catch (e) {
      console.error("Error reading chunks:", e);
    }
    return [];
  }

  public static async autoIngestDefault(): Promise<void> {
    const docxPath = path.join(process.cwd(), "TechMart_Company_Policy.docx");
    const txtPath = path.join(process.cwd(), "policy.txt");
    
    if (fs.existsSync(docxPath)) {
      const buffer = fs.readFileSync(docxPath);
      await this.ingestDocxBuffer(buffer, "TechMart_Company_Policy.docx");
    } else if (fs.existsSync(txtPath)) {
      const text = fs.readFileSync(txtPath, "utf-8");
      await this.ingestRawText(text, "policy.txt");
    }
  }

  public static async ingestDocxBuffer(buffer: Buffer, originalFilename: string): Promise<PolicyIngestionMeta> {
    ensureDirectoryExists();
    try {
      const result = await mammoth.extractRawText({ buffer });
      const rawText = result.value;
      return await this.ingestRawText(rawText, originalFilename);
    } catch (err: any) {
      const meta: PolicyIngestionMeta = {
        fileName: originalFilename,
        version: "1.0.0",
        ingestedAt: new Date().toISOString(),
        totalChunks: 0,
        status: "FAILED",
        error: err.message || "Failed to parse DOCX file"
      };
      fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
      throw err;
    }
  }

  public static async ingestRawText(text: string, originalFilename: string): Promise<PolicyIngestionMeta> {
    ensureDirectoryExists();
    
    // Split into structured sections based on Policy headings
    const sectionHeaders = [
      "COMPANY POLICY DOCUMENT",
      "PRODUCT CATEGORIES",
      "RETURN POLICY",
      "REFUND POLICY",
      "SHIPPING POLICY",
      "WARRANTY POLICY",
      "EXCHANGE POLICY",
      "CUSTOMER SUPPORT"
    ];

    const lines = text.split("\n");
    const chunks: PolicyChunk[] = [];
    let currentSection = "General Policies";
    let currentParagraphs: string[] = [];

    const flushChunk = () => {
      const content = currentParagraphs.join("\n").trim();
      if (content.length > 20) {
        // If content is very long, split into sub-chunks of 600 chars with 100 overlap
        if (content.length > 700) {
          let start = 0;
          let subIdx = 1;
          while (start < content.length) {
            const end = Math.min(start + 600, content.length);
            const slice = content.slice(start, end).trim();
            if (slice.length > 20) {
              chunks.push({
                id: `chunk-${chunks.length + 1}`,
                section: `${currentSection} (Part ${subIdx})`,
                content: slice,
                sourceDoc: originalFilename
              });
              subIdx++;
            }
            start += 500; // 100 overlap
          }
        } else {
          chunks.push({
            id: `chunk-${chunks.length + 1}`,
            section: currentSection,
            content,
            sourceDoc: originalFilename
          });
        }
      }
      currentParagraphs = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const matchedHeader = sectionHeaders.find(h => 
        line.toUpperCase() === h || line.toUpperCase().startsWith(h)
      );

      if (matchedHeader) {
        flushChunk();
        currentSection = matchedHeader;
      } else {
        currentParagraphs.push(line);
      }
    }
    flushChunk();

    // Compute embeddings for each chunk
    for (const chunk of chunks) {
      chunk.embedding = await this.getEmbedding(`${chunk.section}\n${chunk.content}`);
    }

    // Persist chunks
    fs.writeFileSync(CHUNKS_FILE, JSON.stringify(chunks, null, 2), "utf-8");

    const meta: PolicyIngestionMeta = {
      fileName: originalFilename,
      version: `v${Date.now().toString().slice(-4)}`,
      ingestedAt: new Date().toISOString(),
      totalChunks: chunks.length,
      status: "READY"
    };
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), "utf-8");

    return meta;
  }

  public static async retrieveRelevantPolicy(query: string, topK = 3): Promise<{ chunk: PolicyChunk; score: number }[]> {
    const chunks = this.getChunks();
    if (chunks.length === 0) return [];

    const queryEmbedding = await this.getEmbedding(query);
    const queryTerms = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const scored = chunks.map(chunk => {
      // 1. Vector similarity
      let vectorScore = 0;
      if (chunk.embedding && chunk.embedding.length > 0) {
        vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
      }

      // 2. Keyword boost for exact terms (e.g. "return", "refund", "15 days", "electronics", "shipping")
      const chunkText = (chunk.section + " " + chunk.content).toLowerCase();
      let keywordHits = 0;
      for (const term of queryTerms) {
        if (chunkText.includes(term)) {
          keywordHits++;
        }
      }
      const keywordScore = queryTerms.length > 0 ? keywordHits / queryTerms.length : 0;

      // Combined hybrid score
      const finalScore = (vectorScore * 0.6) + (keywordScore * 0.4);

      return { chunk, score: finalScore };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }
}
