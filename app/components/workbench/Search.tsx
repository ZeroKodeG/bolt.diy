import { useState, useCallback, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { debounce } from '~/utils/debounce';
import {
  type SearchResult,
  addSemanticContext,
  clearSemanticContext,
  semanticSearchContext,
} from '~/lib/stores/semantic-search';
import { chatId } from '~/lib/persistence';

export function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const selectedContext = useStore(semanticSearchContext);
  const currentChatId = useStore(chatId);

  /*
   * interface RequestPayload {
   *   data: {
   *     results: [];
   *   };
   * }
   */

  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || !currentChatId) {
        setSearchResults([]);
        setIsSearching(false);
        setHasSearched(false);

        return;
      }

      setIsSearching(true);
      setHasSearched(true);

      try {
        const response = await fetch('/api/semantic-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'SEARCH',
            payload: { query, chatId: currentChatId },
          }),
        });

        if (!response.ok) {
          throw new Error('Search request failed');
        }

        /*
         * ?????
         * const body = (await response.json()) as RequestPayload;
         * const { data } = body;
         */
      } catch (error) {
        console.error('Failed to fetch search results:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [currentChatId],
  );

  const debouncedSearch = useCallback(debounce(handleSearch, 300), [handleSearch]);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleResultClick = (result: SearchResult) => {
    addSemanticContext(result.content);
  };

  return (
    <div className="flex flex-col h-full bg-bolt-elements-background-depth-2 text-sm">
      {/* Search Bar */}
      <div className="flex items-center py-3 px-3 border-b border-bolt-elements-borderColor">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Semantic search for context..."
            className="w-full px-2 py-1 rounded-md bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary focus:outline-none transition-all"
            disabled={!currentChatId}
          />
        </div>
      </div>

      {/* Selected Context */}
      {selectedContext.length > 0 && (
        <div className="p-3 border-b border-bolt-elements-borderColor">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-xs text-bolt-elements-textSecondary">
              Context to be Added ({selectedContext.length})
            </h3>
            <button onClick={clearSemanticContext} className="text-xs text-accent-500 hover:text-accent-600">
              Clear
            </button>
          </div>
          <div className="max-h-32 overflow-auto space-y-2">
            {selectedContext.map((ctx, i) => (
              <div
                key={i}
                className="p-2 rounded-md bg-bolt-elements-background-depth-3 text-xs text-bolt-elements-textTertiary truncate"
              >
                {ctx}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-auto py-2">
        {isSearching && (
          <div className="flex items-center justify-center h-32 text-bolt-elements-textTertiary">
            <div className="i-ph:circle-notch animate-spin mr-2" /> Searching...
          </div>
        )}
        {!isSearching && hasSearched && searchResults.length === 0 && searchQuery.trim() !== '' && (
          <div className="flex items-center justify-center h-32 text-gray-500">No results found.</div>
        )}
        {!isSearching &&
          searchResults.map((result, idx) => (
            <div
              key={idx}
              className="hover:bg-bolt-elements-background-depth-3 cursor-pointer transition-colors px-3 py-2 border-b border-bolt-elements-borderColor/50"
              onClick={() => handleResultClick(result)}
              title="Click to add to context"
            >
              <div className="font-medium text-bolt-elements-textSecondary truncate mb-1">{result.filePath}</div>
              <pre className="font-mono text-xs text-bolt-elements-textTertiary whitespace-pre-wrap">
                {result.content}
              </pre>
            </div>
          ))}
      </div>
    </div>
  );
}
