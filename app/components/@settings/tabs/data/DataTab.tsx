import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from '~/components/ui/Button';
import { getAll, getMessages } from '~/lib/persistence/db';
import { exportChatToJSON } from '~/utils/export';
import { type ChatHistoryItem } from '~/lib/persistence/types';

export function DataTab() {
  const [loading, setLoading] = useState(false);

  const handleExportAllChats = useCallback(async () => {
    setLoading(true);

    try {
      const allChats = await getAll();
      const chatsWithMessages = await Promise.all(
        allChats.map(async (chat) => {
          try {
            const fullChat = await getMessages(chat.id);
            return fullChat;
          } catch (error) {
            console.error(`Failed to load full chat for ID ${chat.id}:`, error);
            return null;
          }
        }),
      );
      const validChats = chatsWithMessages.filter((chat): chat is ChatHistoryItem => chat !== null);

      if (validChats.length === 0) {
        toast.info('No chats to export.');
        return;
      }

      exportChatToJSON(validChats, 'all_bolt_chats');
      toast.success('All chats exported successfully!');
    } catch (error) {
      console.error('Error exporting chats:', error);
      toast.error('Failed to export chats.');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white">Data Management</h2>
      <div className="space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">Export all your chat history to a JSON file.</p>
        <Button onClick={handleExportAllChats} disabled={loading}>
          {loading ? 'Exporting...' : 'Export All Chats'}
        </Button>
      </div>
    </div>
  );
}
