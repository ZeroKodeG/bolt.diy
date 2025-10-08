import { type ChatHistoryItem } from '~/lib/persistence/types';

export function exportChatToJSON(chats: ChatHistoryItem[], filename: string) {
  const dataStr = JSON.stringify(chats, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  const exportFileDefaultName = `${filename}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}
