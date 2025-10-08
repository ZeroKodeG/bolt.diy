import type { FileMap } from '~/lib/stores/files';
import type { Message } from 'ai';

export interface Snapshot {
  chatIndex: string;
  files: FileMap;
  summary?: string;
}

export interface IChatMetadata {
  gitUrl: string;
  gitBranch?: string;
  netlifySiteId?: string;
}

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
}
