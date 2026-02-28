import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import useSession from '../auth/useSession';
import useCurrentUserProfile from '../auth/useCurrentUserProfile';
import theme from '../styles/theme';

const PostsContext = createContext();

const PALETTE = [theme.colors.primary, theme.colors.secondary, theme.colors.accent, '#3B82F6', '#10B981'];

const getInitials = (name) =>
  String(name || '')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const getDisplayName = (profile) => {
  const raw = profile?.full_name || profile?.email || 'Utente';
  return raw;
};

const getAvatarColor = (seed) => {
  if (!seed) return theme.colors.secondary;
  const hash = String(seed)
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length];
};

const formatTime = (value) => {
  const created = value ? new Date(value).getTime() : Date.now();
  const diff = Math.max(0, Date.now() - created);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}g`;
};

const buildPostPublishError = ({ tableName, payload, error }) => {
  const code = error?.code || 'no-code';
  const message = error?.message || 'Errore sconosciuto.';
  const details = error?.details || null;
  const hint = error?.hint || null;
  const safeTableName = tableName || 'unknown_table';

  console.error(
    '[POST_PUBLISH] table=',
    safeTableName,
    'payload=',
    payload,
    'error=',
    {
      code,
      message,
      details,
      hint,
      raw: error,
    },
  );

  const wrapped = new Error(message);
  wrapped.tableName = safeTableName;
  wrapped.code = code;
  wrapped.details = details;
  wrapped.hint = hint;
  wrapped.uiMessage = `${safeTableName}: ${message} (${code})`;
  return wrapped;
};

export const PostsProvider = ({ children }) => {
  const { user, loading } = useSession();
  const { currentUserId, currentUserName, currentUserAvatar } = useCurrentUserProfile({
    id: user?.id || null,
    full_name: user?.user_metadata?.full_name || user?.email || 'Tu',
    avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null,
  });
  const [posts, setPosts] = useState([]);
  const [feedError, setFeedError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const avatarCacheRef = useRef(new Map());
  const [likePending, setLikePending] = useState({});
  const likePendingRef = useRef(new Set());
  const likeGraceRef = useRef(new Map());
  const likesCountUpdatedAtRef = useRef(new Map());
  const commentsCountUpdatedAtRef = useRef(new Map());
  const seenEventsRef = useRef(new Map());

  const resolveAvatarUrl = useCallback((value) => {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    const { data } = supabase.storage.from('avatars').getPublicUrl(value);
    return data?.publicUrl || null;
  }, []);

  const mergeComments = useCallback((serverComments, existingComments) => {
    const map = new Map();
    (serverComments || []).forEach((comment) => map.set(comment.id, comment));
    (existingComments || []).forEach((comment) => {
      if (!map.has(comment.id)) {
        map.set(comment.id, comment);
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, []);

  const isLikeProtected = useCallback((postId) => {
    if (likePendingRef.current.has(postId)) return true;
    const exp = likeGraceRef.current.get(postId);
    return Boolean(exp && exp > Date.now());
  }, []);

  const bumpLikeGrace = useCallback((postId, ms = 2500) => {
    likeGraceRef.current.set(postId, Date.now() + ms);
  }, []);

  const shouldApplyEvent = useCallback((key, ttl = 10000) => {
    const now = Date.now();
    const exp = seenEventsRef.current.get(key);
    if (exp && exp > now) return false;
    seenEventsRef.current.set(key, now + ttl);
    return true;
  }, []);

  const cleanupSeenEvents = useCallback(() => {
    const now = Date.now();
    for (const [key, exp] of seenEventsRef.current.entries()) {
      if (exp <= now) seenEventsRef.current.delete(key);
    }
  }, []);

  const isLikesCountRecent = useCallback((postId, ms = 3000) => {
    const updatedAt = likesCountUpdatedAtRef.current.get(postId);
    return Boolean(updatedAt && Date.now() - updatedAt < ms);
  }, []);

  const isCommentsCountRecent = useCallback((postId, ms = 3000) => {
    const updatedAt = commentsCountUpdatedAtRef.current.get(postId);
    return Boolean(updatedAt && Date.now() - updatedAt < ms);
  }, []);

  const setLikePendingState = useCallback((postId, value) => {
    setLikePending((prev) => {
      const next = { ...prev };
      if (value) {
        next[postId] = true;
      } else {
        delete next[postId];
      }
      return next;
    });
    if (value) {
      likePendingRef.current.add(postId);
    } else {
      likePendingRef.current.delete(postId);
    }
  }, []);

  const fetchPosts = useCallback(async ({ reset = false } = {}) => {
    if (loading) {
      return;
    }
    if (!user) {
      setPosts([]);
      setPage(0);
      setHasMore(true);
      return;
    }

    if (reset) {
      setPage(0);
      setHasMore(true);
    }

    const currentPage = reset ? 0 : page;
    const from = currentPage * 20;
    const to = from + 19;

    setFeedError(null);
    setLoadingMore(currentPage > 0);

    const { data: followRows, error: followsError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    if (followsError) {
      setFeedError(followsError);
      setLoadingMore(false);
      return;
    }

    const followingIds = (followRows || []).map((row) => row.following_id).filter(Boolean);
    const allowedAuthorIds = [user.id, ...followingIds];

    const FEED_SELECT = `
      id,
      content,
      created_at,
      author_id,
      profiles:author_id (
        id,
        full_name,
        email
      ),
      post_media (
        media_type,
        bucket,
        path
      ),
      post_likes (
        user_id,
        profiles (
          id,
          full_name,
          email
        )
      ),
      post_comments (
        id,
        content,
        created_at,
        author_id,
        profiles (
          id,
          full_name,
          email
        )
      )
    `;

    const { data, error } = await supabase
      .from('posts')
      .select(FEED_SELECT)
      .in('author_id', allowedAuthorIds)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      setFeedError(error);
      setLoadingMore(false);
      return;
    }

    const postRows = data || [];
    const postIds = postRows.map((post) => post.id).filter(Boolean);
    const authorIds = Array.from(new Set(postRows.map((post) => post.author_id).filter(Boolean)));
    const missingAuthorIds = authorIds.filter((id) => !avatarCacheRef.current.has(id));
    if (missingAuthorIds.length) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', missingAuthorIds);
      (profileRows || []).forEach((row) => {
        avatarCacheRef.current.set(row.id, resolveAvatarUrl(row.avatar_url));
      });
      missingAuthorIds.forEach((id) => {
        if (!avatarCacheRef.current.has(id)) {
          avatarCacheRef.current.set(id, null);
        }
      });
    }
    let mediaMap = {};
    if (postIds.length) {
      const { data: mediaRows } = await supabase
        .from('post_media')
        .select('post_id, media_type, bucket, path, width, height, duration_seconds')
        .in('post_id', postIds);
      mediaMap = (mediaRows || []).reduce((acc, row) => {
        if (!acc[row.post_id]) acc[row.post_id] = [];
        const bucket = row.bucket || 'post_media';
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(row.path || '');
        acc[row.post_id].push({
          mediaType: row.media_type,
          bucket,
          path: row.path,
          width: row.width,
          height: row.height,
          durationSeconds: row.duration_seconds,
          publicUrl: urlData?.publicUrl || null,
        });
        return acc;
      }, {});
    }

    const mapped = postRows.map((post) => {
      const authorProfile = post.profiles || {};
      const authorName = getDisplayName(authorProfile);
      const authorAvatarUrl = avatarCacheRef.current.get(post.author_id) || null;
      const avatarColor = getAvatarColor(post.author_id);

      const mediaItems = mediaMap[post.id] || [];
      const fallbackImage = mediaItems.find((item) => item.mediaType?.startsWith('image'));
      const firstMedia = mediaItems[0];
      const image = fallbackImage?.publicUrl || null;

      const likes = (post.post_likes || []).map((like) => {
        const likeProfile = like.profiles || {};
        const rawName = likeProfile.full_name || likeProfile.email || 'Utente';
        const name = like.user_id === user.id ? 'Tu' : rawName;
        return {
          userId: like.user_id,
          name,
          initials: getInitials(name),
        };
      });

      const comments = [...(post.post_comments || [])]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((comment) => {
          const commentProfile = comment.profiles || {};
          const rawName = commentProfile.full_name || commentProfile.email || 'Utente';
          const author = comment.author_id === user.id ? 'Tu' : rawName;
          return {
            id: comment.id,
            authorId: comment.author_id,
            author,
            initials: getInitials(author),
            text: comment.content,
            createdAt: comment.created_at,
          };
        });

      return {
        id: post.id,
        authorId: post.author_id,
        author: authorName,
        displayName: getDisplayName(authorProfile),
        avatarColor,
        authorAvatarUrl,
        time: formatTime(post.created_at),
        content: post.content,
        image,
        mediaPath: firstMedia?.path || null,
        mediaBucket: firstMedia?.bucket || null,
        mediaItems,
        likes,
        likes_count: likes.length,
        comments_count: comments.length,
        comments,
      };
    });

    setPosts((prev) => {
      const prevMap = new Map(prev.map((post) => [post.id, post]));
      const merged = mapped.map((post) => {
        const existing = prevMap.get(post.id);
        if (!existing) return post;
        const keepLikes = isLikeProtected(post.id) || isLikesCountRecent(post.id) ? existing.likes : post.likes;
        const existingLikesCount =
          typeof existing.likes_count === 'number' ? existing.likes_count : existing.likes?.length || 0;
        const serverLikesCount =
          typeof post.likes_count === 'number' ? post.likes_count : post.likes?.length || 0;
        const keepLikesCount = isLikeProtected(post.id) || isLikesCountRecent(post.id);
        const nextLikesCount = keepLikesCount ? existingLikesCount : serverLikesCount;
        const existingCommentsCount =
          typeof existing.comments_count === 'number' ? existing.comments_count : existing.comments?.length || 0;
        const serverCommentsCount =
          typeof post.comments_count === 'number' ? post.comments_count : post.comments?.length || 0;
        const keepCommentsCount = isCommentsCountRecent(post.id);
        const nextCommentsCount = keepCommentsCount ? existingCommentsCount : serverCommentsCount;
        const mergedComments = mergeComments(post.comments, existing.comments);
        return {
          ...post,
          likes: keepLikes,
          likes_count: nextLikesCount,
          comments_count: nextCommentsCount,
          comments: mergedComments,
        };
      });
      if (currentPage === 0) {
        for (const [key, exp] of likeGraceRef.current.entries()) {
          if (exp <= Date.now()) likeGraceRef.current.delete(key);
        }
        cleanupSeenEvents();
        for (const [key, updatedAt] of commentsCountUpdatedAtRef.current.entries()) {
          if (Date.now() - updatedAt > 10000) commentsCountUpdatedAtRef.current.delete(key);
        }
        for (const [key, updatedAt] of likesCountUpdatedAtRef.current.entries()) {
          if (Date.now() - updatedAt > 10000) likesCountUpdatedAtRef.current.delete(key);
        }
        return merged;
      }
      const combined = [...prev, ...merged];
      const dedup = new Map();
      combined.forEach((post) => {
        if (!dedup.has(post.id)) {
          dedup.set(post.id, post);
        }
      });
      for (const [key, exp] of likeGraceRef.current.entries()) {
        if (exp <= Date.now()) likeGraceRef.current.delete(key);
      }
      cleanupSeenEvents();
      for (const [key, updatedAt] of likesCountUpdatedAtRef.current.entries()) {
        if (Date.now() - updatedAt > 10000) likesCountUpdatedAtRef.current.delete(key);
      }
      for (const [key, updatedAt] of commentsCountUpdatedAtRef.current.entries()) {
        if (Date.now() - updatedAt > 10000) commentsCountUpdatedAtRef.current.delete(key);
      }
      return Array.from(dedup.values());
    });
    setHasMore((data || []).length === 20);
    setLoadingMore(false);
  }, [cleanupSeenEvents, isCommentsCountRecent, isLikeProtected, isLikesCountRecent, loading, mergeComments, page, resolveAvatarUrl, user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setPosts([]);
      return;
    }
    fetchPosts({ reset: true });
  }, [fetchPosts, loading, user?.id]);

  useEffect(() => {
    if (!user) return undefined;

    const likesChannel = supabase.channel('realtime:post_likes');
    const commentsChannel = supabase.channel('realtime:post_comments');

    const applyLikeEvent = (eventType, payload) => {
      const row = eventType === 'INSERT' ? payload?.new : payload?.old;
      const postId = row?.post_id;
      const userId = row?.user_id;
      if (!postId || !userId) return;
      const key = `like:${eventType === 'INSERT' ? 'ins' : 'del'}:${postId}:${userId}`;
      if (!shouldApplyEvent(key)) return;

      likesCountUpdatedAtRef.current.set(postId, Date.now());
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const baseCount =
            typeof post.likes_count === 'number' ? post.likes_count : post.likes?.length || 0;
          const nextCount =
            eventType === 'INSERT' ? baseCount + 1 : Math.max(baseCount - 1, 0);
          return { ...post, likes_count: nextCount };
        }),
      );
    };

    const applyCommentEvent = (eventType, payload) => {
      const row = eventType === 'INSERT' ? payload?.new : payload?.old;
      const postId = row?.post_id;
      const commentId = row?.id;
      const userId = row?.user_id;
      const createdAt = row?.created_at;
      if (!postId) return;
      const fallbackKey = `${userId || 'anon'}:${createdAt || 'na'}`;
      const key = `cmt:${eventType === 'INSERT' ? 'ins' : 'del'}:${postId}:${commentId || fallbackKey}`;
      if (!shouldApplyEvent(key)) return;

      commentsCountUpdatedAtRef.current.set(postId, Date.now());
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const baseCount =
            typeof post.comments_count === 'number' ? post.comments_count : post.comments?.length || 0;
          const nextCount =
            eventType === 'INSERT' ? baseCount + 1 : Math.max(baseCount - 1, 0);
          return { ...post, comments_count: nextCount };
        }),
      );
    };

    likesChannel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_likes' }, (payload) =>
      applyLikeEvent('INSERT', payload),
    );
    likesChannel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'post_likes' }, (payload) =>
      applyLikeEvent('DELETE', payload),
    );
    commentsChannel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments' }, (payload) =>
      applyCommentEvent('INSERT', payload),
    );
    commentsChannel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'post_comments' }, (payload) =>
      applyCommentEvent('DELETE', payload),
    );

    likesChannel.subscribe();
    commentsChannel.subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [shouldApplyEvent, user]);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (page === 0) return;
    fetchPosts();
  }, [fetchPosts, loading, page, user?.id]);

  const addPost = (post) => {
    if (!post || !post.id) return;
    const likes = post.likes || [];
    const comments = post.comments || [];
    setPosts((prev) => [
      {
        ...post,
        likes,
        likes_count: post.likes_count ?? likes.length,
        comments,
        comments_count: post.comments_count ?? comments.length,
      },
      ...prev,
    ]);
  };

  const createPost = async ({ content, mediaUri }) => {
    if (!user) {
      return { error: new Error('Utente non autenticato.') };
    }
    const clean = String(content || '').trim();
    if (!clean) {
      return { error: new Error('Il contenuto del post e richiesto.') };
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('[POST_PUBLISH] auth.getUser error=', {
        code: authError?.code || 'no-code',
        message: authError?.message || 'Errore sconosciuto.',
        details: authError?.details || null,
        hint: authError?.hint || null,
      });
    }
    console.log('[POST_PUBLISH] auth.uid=', authData?.user?.id || null);

    const postsPayload = { author_id: user.id, content: clean };
    let inserted = null;
    try {
      const { data, error: insertError } = await supabase
        .from('posts')
        .insert(postsPayload)
        .select('*')
        .single();
      if (insertError) throw insertError;
      inserted = data;
    } catch (error) {
      return {
        error: buildPostPublishError({
          tableName: 'posts',
          payload: postsPayload,
          error,
        }),
      };
    }

    let image;
    let mediaPath = null;
    let mediaBucket = null;
    if (mediaUri) {
      const res = await fetch(mediaUri);
      const blob = await res.blob();
      const extension = blob.type?.split('/')[1] || 'jpg';
      const path = `${user.id}/${inserted.id}-${Date.now()}.${extension}`;
      const storagePayload = {
        bucket: 'post_media',
        path,
        contentType: blob.type || 'image/jpeg',
      };
      try {
        const { error: uploadError } = await supabase.storage
          .from('post_media')
          .upload(path, blob, {
            contentType: storagePayload.contentType,
          });
        if (uploadError) throw uploadError;
      } catch (error) {
        return {
          error: buildPostPublishError({
            tableName: 'storage.objects',
            payload: storagePayload,
            error,
          }),
        };
      }

      const mediaType = blob.type?.startsWith('video') ? 'video' : 'image';
      const postMediaPayload = {
        post_id: inserted.id,
        author_id: user.id,
        media_type: mediaType,
        bucket: 'post_media',
        path,
      };
      try {
        const { error: mediaError } = await supabase.from('post_media').insert(postMediaPayload);
        if (mediaError) throw mediaError;
      } catch (error) {
        return {
          error: buildPostPublishError({
            tableName: 'post_media',
            payload: postMediaPayload,
            error,
          }),
        };
      }

      const { data: urlData } = supabase.storage.from('post_media').getPublicUrl(path);
      image = urlData?.publicUrl;
      mediaPath = path;
      mediaBucket = 'post_media';
    }

    const authorName = 'Tu';
    const authorAvatarUrl = avatarCacheRef.current.get(user.id) || null;
    const postPayload = {
      id: inserted.id,
      authorId: user.id,
      author: authorName,
      displayName: authorName,
      avatarColor: getAvatarColor(user.id),
      authorAvatarUrl,
      time: formatTime(inserted.created_at),
      content: inserted.content,
      image,
      mediaPath,
      mediaBucket,
      likes: [],
      likes_count: 0,
      comments: [],
    };

    addPost(postPayload);
    await fetchPosts();
    return { data: postPayload, error: null };
  };

  const updatePost = async ({ postId, content }) => {
    if (!user) {
      return { error: new Error('Utente non autenticato.') };
    }
    const clean = String(content || '').trim();
    if (!clean) {
      return { error: new Error('Il contenuto del post e richiesto.') };
    }

    setPosts((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, content: clean } : post)),
    );

    const { error } = await supabase
      .from('posts')
      .update({ content: clean })
      .eq('id', postId)
      .eq('author_id', user.id);

    if (error) {
      await fetchPosts();
      return { error };
    }

    return { error: null };
  };

  const deletePost = async ({ postId }) => {
    if (!user) {
      return { error: new Error('Utente non autenticato.') };
    }
    const existing = posts.find((post) => post.id === postId);
    setPosts((prev) => prev.filter((post) => post.id !== postId));

    if (existing?.mediaPath) {
      await supabase.storage
        .from(existing.mediaBucket || 'post_media')
        .remove([existing.mediaPath]);
      await supabase.from('post_media').delete().eq('post_id', postId);
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', user.id);

    if (error) {
      await fetchPosts();
      return { error };
    }

    return { error: null };
  };

  const toggleLike = async (postId) => {
    if (!user) return;
    if (likePendingRef.current.has(postId)) return;
    setLikePendingState(postId, true);
    bumpLikeGrace(postId);
    let likedBefore = false;

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const hasSelf = post.likes.some((l) => l.userId === user.id);
        likedBefore = hasSelf;
        const baseCount =
          typeof post.likes_count === 'number' ? post.likes_count : post.likes?.length || 0;
        const nextLikes = hasSelf
          ? post.likes.filter((l) => l.userId !== user.id)
          : [{ userId: user.id, name: 'Tu', initials: 'TU' }, ...post.likes];
        const uniq = Array.from(new Map(nextLikes.map((l) => [l.userId, l])).values());
        const nextCount = hasSelf ? Math.max(baseCount - 1, 0) : baseCount + 1;
        return { ...post, likes: uniq, likes_count: nextCount };
      }),
    );

    try {
      const { data, error } = await supabase.rpc('toggle_like', { p_post_id: postId });
      if (error) throw error;
      const likedResult = Array.isArray(data) ? data[0]?.liked : data?.liked;
      if (typeof likedResult !== 'boolean') {
        throw new Error('Risposta like non valida.');
      }
      const likeEventKey = `like:${likedResult ? 'ins' : 'del'}:${postId}:${user.id}`;
      shouldApplyEvent(likeEventKey);
      likesCountUpdatedAtRef.current.set(postId, Date.now());
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const hasSelf = post.likes.some((l) => l.userId === user.id);
          const baseCount =
            typeof post.likes_count === 'number' ? post.likes_count : post.likes?.length || 0;
          if (likedResult && !hasSelf) {
            return {
              ...post,
              likes: [{ userId: user.id, name: 'Tu', initials: 'TU' }, ...post.likes],
              likes_count: baseCount + 1,
            };
          }
          if (!likedResult && hasSelf) {
            return {
              ...post,
              likes: post.likes.filter((l) => l.userId !== user.id),
              likes_count: Math.max(baseCount - 1, 0),
            };
          }
          return post;
        }),
      );
    } catch (err) {
      Alert.alert('Like', 'Non siamo riusciti ad aggiornare il like. Riprova.');
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const hasSelf = post.likes.some((l) => l.userId === user.id);
          const baseCount =
            typeof post.likes_count === 'number' ? post.likes_count : post.likes?.length || 0;
          if (likedBefore && !hasSelf) {
            return {
              ...post,
              likes: [{ userId: user.id, name: 'Tu', initials: 'TU' }, ...post.likes],
              likes_count: baseCount + 1,
            };
          }
          if (!likedBefore && hasSelf) {
            return {
              ...post,
              likes: post.likes.filter((l) => l.userId !== user.id),
              likes_count: Math.max(baseCount - 1, 0),
            };
          }
          return post;
        }),
      );
    } finally {
      bumpLikeGrace(postId);
      setLikePendingState(postId, false);
    }
  };

  const addComment = async (postId, text) => {
    if (!user) return { error: new Error('Utente non autenticato.') };
    if (!text?.trim()) return { error: new Error('Commento non valido.') };
    const clean = text.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticComment = {
      id: tempId,
      authorId: user.id,
      author: 'Tu',
      initials: 'TU',
      text: clean,
      createdAt: new Date().toISOString(),
    };

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const baseCount =
          typeof post.comments_count === 'number' ? post.comments_count : post.comments?.length || 0;
        return {
          ...post,
          comments: [...post.comments, optimisticComment],
          comments_count: baseCount + 1,
        };
      }),
    );

    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, author_id: user.id, content: clean })
      .select('id, content, created_at, author_id')
      .single();

    if (error) {
      Alert.alert('Commento', 'Non siamo riusciti a pubblicare il commento. Riprova.');
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const baseCount =
            typeof post.comments_count === 'number' ? post.comments_count : post.comments?.length || 0;
          return {
            ...post,
            comments: post.comments.filter((comment) => comment.id !== tempId),
            comments_count: Math.max(baseCount - 1, 0),
          };
        }),
      );
      return { error };
    }

    if (data?.id) {
      const commentEventKey = `cmt:ins:${postId}:${data.id}`;
      shouldApplyEvent(commentEventKey);
      commentsCountUpdatedAtRef.current.set(postId, Date.now());
    }
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        return {
          ...post,
          comments: post.comments.map((comment) =>
            comment.id === tempId
              ? {
                  ...comment,
                  id: data.id,
                  createdAt: data.created_at,
                  text: data.content,
                }
              : comment,
          ),
        };
      }),
    );
    return { data, error: null };
  };

  const value = useMemo(
    () => ({
      posts,
      addPost,
      refreshFeed: () => fetchPosts({ reset: true }),
      loadMore: () => {
        if (loadingMore || !hasMore) return;
        setPage((prev) => prev + 1);
      },
      createPost,
      updatePost,
      deletePost,
      toggleLike,
      addComment,
      isLikePending: (postId) => Boolean(likePending[postId]),
      feedError,
      loadingMore,
      hasMore,
      selfUser: {
        id: currentUserId || user?.id || 'self-user',
        name: currentUserName || 'Tu',
        avatarUrl: currentUserAvatar || null,
        initials: getInitials(currentUserName || 'Tu') || 'TU',
      },
    }),
    [
      currentUserAvatar,
      currentUserId,
      currentUserName,
      posts,
      user?.id,
      feedError,
      fetchPosts,
      loadingMore,
      hasMore,
      likePending,
    ],
  );

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>;
};

export const usePosts = () => useContext(PostsContext);
