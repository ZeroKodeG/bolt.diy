import type { Message } from 'ai';
import { createScopedLogger } from '~/utils/logger';
import type { ChatHistoryItem, IChatMetadata } from './types';
import type { Snapshot } from './types';
import { supabase } from '~/lib/supabase';
import { sessionStore } from '~/lib/stores/session';

const logger = createScopedLogger('SupabaseDB');

// No longer need to open a DB, Supabase client is initialized elsewhere.

export async function getAll(): Promise<ChatHistoryItem[]> {
  const { user } = sessionStore.get();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('chats')
    .select('id, url_id, description, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch chat list:', error);
    throw error;
  }

  // Map the data to the ChatHistoryItem interface
  return data.map((chat) => ({
    id: String(chat.id),
    urlId: chat.url_id || undefined,
    description: chat.description || undefined,
    messages: [], // Not fetching full messages for the list view
    timestamp: chat.updated_at,
  }));
}

export async function setMessages(
  id: string, // This is now the Supabase table ID
  messages: Message[],
  urlId?: string,
  description?: string,
  metadata?: IChatMetadata,
): Promise<void> {
  const { user } = sessionStore.get();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase.from('chats').upsert({
    id: parseInt(id, 10),
    user_id: user.id,
    messages: messages as any, // Supabase expects jsonb
    url_id: urlId,
    description,
    metadata,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    logger.error('Failed to set messages:', error);
    throw error;
  }
}

export async function getMessages(id: string): Promise<ChatHistoryItem> {
  const { user } = sessionStore.get();

  if (!user) {
    throw new Error('User not authenticated');
  }

  /*
   * In Supabase, the URL ID or the primary ID can be used to fetch.
   * We'll assume the ID passed is the primary key for simplicity now.
   */
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('id', parseInt(id, 10))
    .eq('user_id', user.id)
    .single();

  if (error) {
    logger.error(`Failed to get messages for chat ${id}:`, error);
    throw error;
  }

  if (!data) {
    throw new Error(`Chat with id ${id} not found.`);
  }

  return {
    id: String(data.id),
    urlId: data.url_id || undefined,
    description: data.description || undefined,
    messages: data.messages as Message[],
    timestamp: data.updated_at,
    metadata: data.metadata || undefined,
  };
}

export async function deleteById(id: string): Promise<void> {
  const { user } = sessionStore.get();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase.from('chats').delete().eq('id', parseInt(id, 10)).eq('user_id', user.id);

  if (error) {
    logger.error(`Failed to delete chat ${id}:`, error);
    throw error;
  }
}

export async function createChatFromMessages(
  description: string,
  messages: Message[],
  metadata?: IChatMetadata,
): Promise<string> {
  // Returns the new chat ID
  const { user } = sessionStore.get();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('chats')
    .insert({
      user_id: user.id,
      description,
      messages: messages as any,
      metadata,
    })
    .select()
    .single();

  if (error || !data) {
    logger.error('Failed to create new chat:', error);
    throw error || new Error('Failed to create new chat');
  }

  // Update the new chat with a url_id that is the same as its primary key
  const newId = String(data.id);
  const { error: updateError } = await supabase.from('chats').update({ url_id: newId }).eq('id', data.id);

  if (updateError) {
    logger.error('Failed to set url_id for new chat:', updateError);

    // Don't throw, the chat was still created
  }

  return newId;
}

export async function duplicateChat(id: string): Promise<string> {
  const chat = await getMessages(id);

  if (!chat) {
    throw new Error('Chat not found');
  }

  return createChatFromMessages(`${chat.description || 'Chat'} (copy)`, chat.messages, chat.metadata);
}

export async function forkChat(chatId: string, messageId: string): Promise<string> {
  const chat = await getMessages(chatId);

  if (!chat) {
    throw new Error('Chat not found');
  }

  // Find the index of the message to fork at
  const messageIndex = chat.messages.findIndex((msg) => msg.id === messageId);

  if (messageIndex === -1) {
    throw new Error('Message not found');
  }

  // Get messages up to and including the selected message
  const messages = chat.messages.slice(0, messageIndex + 1);

  return createChatFromMessages(`${chat.description || 'Chat'} (fork)`, messages, chat.metadata);
}

export async function updateChatDescription(id: string, description: string): Promise<void> {
  const { user } = sessionStore.get();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('chats')
    .update({ description, updated_at: new Date().toISOString() })
    .eq('id', parseInt(id, 10))
    .eq('user_id', user.id);

  if (error) {
    logger.error(`Failed to update chat description for ${id}:`, error);
    throw error;
  }
}

export async function getSnapshot(chatId: string): Promise<Snapshot | undefined> {
  const { user } = sessionStore.get();

  if (!user) {
    return undefined;
  }

  const { data, error } = await supabase
    .from('chats')
    .select('snapshot')
    .eq('id', parseInt(chatId, 10))
    .eq('user_id', user.id)
    .single();

  if (error) {
    logger.error(`Failed to get snapshot for chat ${chatId}:`, error);
    return undefined;
  }

  return data?.snapshot as Snapshot | undefined;
}

export async function setSnapshot(chatId: string, snapshot: Snapshot): Promise<void> {
  const { user } = sessionStore.get();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('chats')
    .update({ snapshot: snapshot as any })
    .eq('id', parseInt(chatId, 10))
    .eq('user_id', user.id);

  if (error) {
    logger.error(`Failed to set snapshot for chat ${chatId}:`, error);
    throw error;
  }
}
