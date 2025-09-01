import { createOpenAI } from '@ai-sdk/openai';
import { embed } from 'ai';
import { ChromaClient, type Collection, type EmbeddingFunction } from 'chromadb';
import type { SearchResult } from './stores/semantic-search';

// Configuración del modelo de OpenAI
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const embeddingModel = openai.embedding('text-embedding-3-small');

// --- ChromaDB ---

class ManualEmbeddingFunction implements EmbeddingFunction {
  async generate(texts: string[]): Promise<number[][]> {
    console.warn('[ChromaDB] Se ha llamado a la función de embedding manual. Esto no debería ocurrir.');
    return texts.map(() => []);
  }
}

const client = new ChromaClient();
const COLLECTION_NAME = 'virtual_files';
let collection: Collection;

(async () => {
  try {
    collection = await client.getOrCreateCollection({
      name: COLLECTION_NAME,
      embeddingFunction: new ManualEmbeddingFunction(),
    });
    console.log(`[ChromaDB] Colección '${COLLECTION_NAME}' cargada/creada exitosamente.`);
  } catch (error) {
    console.error('[ChromaDB] Error al inicializar la colección:', error);
  }
})();

// --- 2. Lógica de Indexación y Búsqueda ---

export async function indexVirtualFile(
  filePath: string,
  content: string,
  chatId: string,
): Promise<{ success: boolean; error?: string; chunks?: number }> {
  if (!collection) {
    const errorMsg = '[ChromaDB] La colección no está inicializada.';
    console.error(errorMsg);

    return { success: false, error: errorMsg };
  }

  try {
    const lines = content.split('\n');
    const chunkSize = 20;
    const overlap = 5;
    const chunks: string[] = [];

    for (let i = 0; i < lines.length; i += chunkSize - overlap) {
      const chunkContent = lines.slice(i, i + chunkSize).join('\n');
      chunks.push(chunkContent);
    }

    const nonEmptyChunks = chunks.filter((c) => c && c.trim() !== '');

    if (nonEmptyChunks.length === 0) {
      console.log(`[ChromaDB] No se encontraron chunks con contenido en ${filePath}, omitiendo indexación.`);
      return { success: true, chunks: 0 };
    }

    const embeddings: number[][] = [];

    for (const chunk of nonEmptyChunks) {
      const { embedding } = await embed({ model: embeddingModel, value: chunk });
      embeddings.push(embedding);
    }

    const ids = nonEmptyChunks.map((_, i) => `${chatId}_${filePath}_${i}`);
    const metadatas = nonEmptyChunks.map((chunkContent) => ({ filePath, content: chunkContent, chatId }));

    await collection.upsert({ ids, embeddings, metadatas });

    console.log(
      `[ChromaDB] Archivo virtual indexado/actualizado para el chat ${chatId}: ${filePath} (${nonEmptyChunks.length} chunks)`,
    );

    return { success: true, chunks: nonEmptyChunks.length };
  } catch (error: any) {
    console.error(`[ChromaDB] Error indexando archivo virtual ${filePath}:`, error);
    return { success: false, error: error.message };
  }
}

export async function searchIndex(query: string, chatId: string): Promise<SearchResult[]> {
  if (!collection) {
    console.error('[ChromaDB] La colección no está inicializada.');
    return [];
  }

  try {
    const { embedding } = await embed({ model: embeddingModel, value: query });

    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: 5,
      where: { chatId }, // Filtrar por el ID del chat actual
    });

    if (!results.ids[0] || results.ids[0].length === 0) {
      return [];
    }

    const searchResults: SearchResult[] = [];

    for (let i = 0; i < results.ids[0].length; i++) {
      const metadata = results.metadatas[0][i] as { filePath: string; content: string };
      const distance = results.distances[0][i];

      if (distance === null || distance === undefined) {
        continue;
      }

      searchResults.push({
        filePath: metadata.filePath,
        content: metadata.content,
        score: 1 - distance,
      });
    }

    return searchResults;
  } catch (error: any) {
    console.error('[ChromaDB] Error en la búsqueda:', error);
    return [];
  }
}
