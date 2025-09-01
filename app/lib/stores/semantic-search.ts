import { atom } from 'nanostores';

/**
 * Almacena los fragmentos de código seleccionados de la búsqueda semántica
 * para ser inyectados en el próximo prompt.
 */
export const semanticSearchContext = atom<string[]>([]);

/**
 * Añade un fragmento de código al contexto.
 * @param content El trozo de código a añadir.
 */
export function addSemanticContext(content: string) {
  // Evitar duplicados
  if (semanticSearchContext.get().includes(content)) {
    return;
  }

  semanticSearchContext.set([...semanticSearchContext.get(), content]);
}

/**
 * Limpia todo el contexto de búsqueda semántica.
 */
export function clearSemanticContext() {
  semanticSearchContext.set([]);
}

// Definimos el tipo aquí para que pueda ser importado en el frontend
export interface SearchResult {
  filePath: string;
  content: string;
  score: number;
}
