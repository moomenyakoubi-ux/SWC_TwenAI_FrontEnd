import { supabase } from '../lib/supabase';

const resolveAvatarUrl = (value) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const { data } = supabase.storage.from('avatars').getPublicUrl(value);
  return data?.publicUrl || null;
};

export const listConversations = async (userId) => {
  if (!userId) return [];
  const { data: participantRows, error: participantsError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  if (participantsError) throw participantsError;
  const conversationIds = Array.from(
    new Set((participantRows || []).map((row) => row.conversation_id).filter(Boolean)),
  );
  if (!conversationIds.length) return [];

  const { data, error } = await supabase
    .from('conversations')
    .select('id, last_message_text, last_message_at')
    .in('id', conversationIds)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchParticipants = async (conversationIds, currentUserId) => {
  if (!conversationIds?.length) return {};
  const { data, error } = await supabase
    .from('conversation_participants')
    .select('conversation_id, user_id')
    .in('conversation_id', conversationIds);

  if (error) throw error;
  return (data || []).reduce((acc, row) => {
    if (!row?.conversation_id || !row?.user_id) return acc;
    if (currentUserId && row.user_id === currentUserId) return acc;
    acc[row.conversation_id] = row.user_id;
    return acc;
  }, {});
};

export const fetchProfiles = async (userIds) => {
  if (!userIds?.length) return {};
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  if (error) throw error;
  return (data || []).reduce((acc, row) => {
    acc[row.id] = {
      id: row.id,
      full_name: row.full_name || 'Utente',
      avatar_url: resolveAvatarUrl(row.avatar_url),
    };
    return acc;
  }, {});
};

export const fetchMessages = async (conversationId, limit = 30, beforeCreatedAt) => {
  if (!conversationId) return [];
  let query = supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (beforeCreatedAt) {
    query = query.lt('created_at', beforeCreatedAt);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).slice().reverse();
};

export const sendMessage = async (conversationId, body, senderId) => {
  if (!conversationId || !body) return null;
  const payload = {
    conversation_id: conversationId,
    body,
  };
  if (senderId) {
    payload.sender_id = senderId;
  }
  const { data, error } = await supabase
    .from('messages')
    .insert(payload)
    .select('id, conversation_id, sender_id, body, created_at')
    .single();

  if (error) throw error;
  return data;
};

export const subscribeToMessages = (conversationId, callback) => {
  if (!conversationId || !callback) return () => {};
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => callback(payload?.new),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
