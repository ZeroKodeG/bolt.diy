import { useLoaderData, useNavigate } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import { atom } from 'nanostores';
import { useStore } from '@nanostores/react';
import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { getMessages, setMessages, duplicateChat, createChatFromMessages, setSnapshot, getAll } from './db';
import type { FileMap } from '~/lib/stores/files';
import type { Snapshot, IChatMetadata } from './types';
import { sessionStore } from '~/lib/stores/session';

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);
export const chatMetadata = atom<IChatMetadata | undefined>(undefined);

export function useChatHistory() {
  const navigate = useNavigate();
  const { id: chatIdFromUrl } = useLoaderData<{ id?: string }>();
  const { user, loading: isSessionLoading } = useStore(sessionStore);

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    // Don't do anything until we know the user's auth state
    if (isSessionLoading) {
      return;
    }

    // If there is an ID in the URL, load that chat.
    if (chatIdFromUrl && user) {
      getMessages(chatIdFromUrl)
        .then((storedChat) => {
          if (storedChat) {
            setInitialMessages(storedChat.messages);
            description.set(storedChat.description);
            chatId.set(storedChat.id);
            chatMetadata.set(storedChat.metadata);

            // Potentially restore snapshot here if needed
          } else {
            // The user may not have access to this chat, or it doesn't exist.
            toast.error('Chat not found.');
            navigate('/', { replace: true });
          }
        })
        .catch((error) => {
          console.error(error);
          toast.error('Failed to load chat: ' + error.message);
          navigate('/', { replace: true });
        })
        .finally(() => setReady(true));
    } else {
      // If no ID in URL, we are ready to start a new chat.
      setReady(true);
    }
  }, [chatIdFromUrl, user, isSessionLoading, navigate]);

  const takeSnapshot = useCallback(
    async (chatIdx: string, files: FileMap) => {
      const id = chatId.get();

      if (!id || !user) {
        return;
      }

      const snapshot: Snapshot = { chatIndex: chatIdx, files };

      try {
        await setSnapshot(id, snapshot);
      } catch (error) {
        console.error('Failed to save snapshot:', error);
        toast.error('Failed to save chat snapshot.');
      }
    },
    [user],
  );

  return {
    ready,
    initialMessages,

    // This function now needs to be called from the UI where the user profile is managed
    loadChatHistory: getAll,
    storeMessageHistory: async (messages: Message[]) => {
      if (!user || messages.length === 0) {
        return;
      }

      messages = messages.filter((m) => !m.annotations?.includes('no-store'));

      const currentChatId = chatId.get();
      const currentDescription = description.get() || 'New Chat';
      const currentMetadata = chatMetadata.get();

      try {
        if (currentChatId) {
          // Update existing chat
          await setMessages(currentChatId, messages, currentChatId, currentDescription, currentMetadata);
        } else {
          // Create new chat
          const newId = await createChatFromMessages(currentDescription, messages, currentMetadata);
          chatId.set(newId);
          navigate(`/chat/${newId}`, { replace: true });
        }

        // Handle snapshot after saving messages
        const lastMessage = messages[messages.length - 1];

        if (lastMessage) {
          await takeSnapshot(lastMessage.id, workbenchStore.files.get());
        }
      } catch (error) {
        console.error('Failed to save chat history:', error);
        toast.error('Could not save chat history.');
      }
    },
    duplicateCurrentChat: async (id: string) => {
      if (!user) {
        return;
      }

      try {
        const newId = await duplicateChat(id);
        navigate(`/chat/${newId}`);
        toast.success('Chat duplicated successfully');
      } catch (error) {
        toast.error('Failed to duplicate chat');
        console.log(error);
      }
    },

    /*
     * Import/Export might need rethinking in a cloud-based context
     * For now, they can be considered disabled or local-only actions.
     */
    importChat: async () => {
      toast.info('Import feature not yet adapted for cloud storage.');
    },
    exportChat: async () => {
      toast.info('Export feature not yet adapted for cloud storage.');
    },
  };
}
