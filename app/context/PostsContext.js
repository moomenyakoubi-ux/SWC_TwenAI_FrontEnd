import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import useSession from '../auth/useSession';
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

export const PostsProvider = ({ children }) => {
  const { user, loading } = useSession();
  const [posts, setPosts] = useState([]);
  const [feedError, setFeedError] = useState(null);

  const fetchPosts = useCallback(async () => {
    if (loading) {
      return;
    }
    if (!user) {
      setPosts([]);
      return;
    }

    console.log('FEED FETCH start', { userId: user?.id });
    setFeedError(null);

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

    console.log('FEED FETCH select', FEED_SELECT);

    const { data, error } = await supabase
      .from('posts')
      .select(FEED_SELECT)
      .order('created_at', { ascending: false })
      .limit(50);

    console.log('FEED FETCH result', { len: data?.length, error });

    if (error) {
      console.error('fetchPosts error:', error);
      setFeedError(error);
      return;
    }

    const mapped = (data || []).map((post) => {
      const authorProfile = post.profiles || {};
      const authorName = getDisplayName(authorProfile);
      const avatarColor = getAvatarColor(post.author_id);

      const media =
        (post.post_media || []).find((item) => item.media_type?.startsWith('image')) || post.post_media?.[0];
      let image;
      if (media?.path) {
        const bucket = media.bucket || 'post_media';
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(media.path);
        image = urlData?.publicUrl;
      }

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
        time: formatTime(post.created_at),
        content: post.content,
        image,
        mediaPath: media?.path || null,
        mediaBucket: media?.bucket || null,
        likes,
        comments,
      };
    });

    setPosts(mapped);
  }, [loading, user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setPosts([]);
      return;
    }
    fetchPosts();
  }, [fetchPosts, loading, user?.id]);

  const addPost = (post) => {
    if (!post || !post.id) return;
    setPosts((prev) => [{ ...post, likes: post.likes || [], comments: post.comments || [] }, ...prev]);
  };

  const createPost = async ({ content, mediaUri }) => {
    if (!user) {
      return { error: new Error('Utente non autenticato.') };
    }
    const clean = String(content || '').trim();
    if (!clean) {
      return { error: new Error('Il contenuto del post e richiesto.') };
    }

    const { data: inserted, error: insertError } = await supabase
      .from('posts')
      .insert({ author_id: user.id, content: clean })
      .select('*')
      .single();

    if (insertError) {
      return { error: insertError };
    }

    let image;
    let mediaPath = null;
    let mediaBucket = null;
    if (mediaUri) {
      const res = await fetch(mediaUri);
      const blob = await res.blob();
      const extension = blob.type?.split('/')[1] || 'jpg';
      const path = `${user.id}/${inserted.id}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('post_media').upload(path, blob, {
        contentType: blob.type || 'image/jpeg',
      });

      if (uploadError) {
        return { error: uploadError };
      }

      const { error: mediaError } = await supabase.from('post_media').insert({
        post_id: inserted.id,
        media_type: blob.type || 'image/jpeg',
        bucket: 'post_media',
        path,
      });

      if (mediaError) {
        return { error: mediaError };
      }

      const { data: urlData } = supabase.storage.from('post_media').getPublicUrl(path);
      image = urlData?.publicUrl;
      mediaPath = path;
      mediaBucket = 'post_media';
    }

    const authorName = 'Tu';
    const postPayload = {
      id: inserted.id,
      authorId: user.id,
      author: authorName,
      displayName: authorName,
      avatarColor: getAvatarColor(user.id),
      time: formatTime(inserted.created_at),
      content: inserted.content,
      image,
      mediaPath,
      mediaBucket,
      likes: [],
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
    let wasLiked = false;
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const hasSelf = post.likes.some((l) => l.userId === user.id);
        wasLiked = hasSelf;
        const nextLikes = hasSelf
          ? post.likes.filter((l) => l.userId !== user.id)
          : [{ userId: user.id, name: 'Tu', initials: 'TU' }, ...post.likes];
        const uniq = Array.from(new Map(nextLikes.map((l) => [l.userId, l])).values());
        return { ...post, likes: uniq };
      }),
    );

    if (wasLiked) {
      const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      if (error) {
        console.error('toggleLike delete error:', error);
        setPosts((prev) =>
          prev.map((post) => {
            if (post.id !== postId) return post;
            return {
              ...post,
              likes: [{ userId: user.id, name: 'Tu', initials: 'TU' }, ...post.likes],
            };
          }),
        );
      }
      return;
    }

    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
    if (error) {
      console.error('toggleLike insert error:', error);
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          return { ...post, likes: post.likes.filter((l) => l.userId !== user.id) };
        }),
      );
    }
  };

  const addComment = async (postId, text) => {
    if (!user) return;
    if (!text?.trim()) return;
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
        return { ...post, comments: [...post.comments, optimisticComment] };
      }),
    );

    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, author_id: user.id, content: clean })
      .select('id, content, created_at, author_id')
      .single();

    if (error) {
      console.error('addComment error:', error);
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          return { ...post, comments: post.comments.filter((comment) => comment.id !== tempId) };
        }),
      );
      return;
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
  };

  const value = useMemo(
    () => ({
      posts,
      addPost,
      refreshFeed: fetchPosts,
      createPost,
      updatePost,
      deletePost,
      toggleLike,
      addComment,
      feedError,
      selfUser: { id: user?.id || 'self-user', name: 'Tu', initials: 'TU' },
    }),
    [posts, user?.id, feedError],
  );

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>;
};

export const usePosts = () => useContext(PostsContext);
