import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const avatarCacheRef = useRef(new Map());

  const resolveAvatarUrl = useCallback((value) => {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    const { data } = supabase.storage.from('avatars').getPublicUrl(value);
    return data?.publicUrl || null;
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

    console.log('FEED FETCH start', { userId: user?.id, page: currentPage });
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

    console.log('FEED FETCH select', FEED_SELECT);

    const { data, error } = await supabase
      .from('posts')
      .select(FEED_SELECT)
      .in('author_id', allowedAuthorIds)
      .order('created_at', { ascending: false })
      .range(from, to);

    console.log('FEED FETCH result', { len: data?.length, error });

    if (error) {
      console.error('fetchPosts error:', error);
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
        comments,
      };
    });

    setPosts((prev) => (currentPage === 0 ? mapped : [...prev, ...mapped]));
    setHasMore((data || []).length === 20);
    setLoadingMore(false);
  }, [loading, page, resolveAvatarUrl, user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setPosts([]);
      return;
    }
    fetchPosts({ reset: true });
  }, [fetchPosts, loading, user?.id]);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (page === 0) return;
    fetchPosts();
  }, [fetchPosts, loading, page, user?.id]);

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

      const mediaType = blob.type?.startsWith('video') ? 'video' : 'image';
      console.log('POST_MEDIA INSERT', { path, blobType: blob.type, mediaType });
      const { error: mediaError } = await supabase.from('post_media').insert({
        post_id: inserted.id,
        author_id: user.id,
        media_type: mediaType,
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
      feedError,
      loadingMore,
      hasMore,
      selfUser: { id: user?.id || 'self-user', name: 'Tu', initials: 'TU' },
    }),
    [posts, user?.id, feedError, fetchPosts, loadingMore, hasMore],
  );

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>;
};

export const usePosts = () => useContext(PostsContext);
