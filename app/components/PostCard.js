import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePosts } from '../context/PostsContext';
import { useAppTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { fetchPostComments, fetchPostLikes } from '../services/contentApi';

const LIKE_PAGE_SIZE = 15;

const formatCommentTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
};

const dedupeLikeUsers = (items) => {
  const map = new Map();
  (items || []).forEach((item, index) => {
    const key = String(item?.user_id || `user-${index}`);
    if (!map.has(key)) {
      map.set(key, item);
    }
  });
  return Array.from(map.values());
};

const PostCard = ({ post, isRTL, onPressAuthor }) => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isWeb = Platform.OS === 'web';
  const initials = useMemo(
    () =>
      post.author
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [post.author],
  );
  const authorAvatarUrl = post.authorAvatarUrl || null;

  const { toggleLike, addComment, selfUser, updatePost, deletePost, isLikePending } = usePosts();
  const isOwner = post.authorId && post.authorId === selfUser.id;

  const liked = useMemo(() => {
    if (typeof post.liked_by_me === 'boolean') return post.liked_by_me;
    return post.likes?.some((user) => user.userId === selfUser.id);
  }, [post.liked_by_me, post.likes, selfUser.id]);

  const likesCount = useMemo(
    () => (typeof post.likes_count === 'number' ? post.likes_count : post.likes?.length || 0),
    [post.likes, post.likes_count],
  );
  const commentsCount = useMemo(
    () => (typeof post.comments_count === 'number' ? post.comments_count : post.comments?.length || 0),
    [post.comments, post.comments_count],
  );
  const likePending = isLikePending?.(post.id);

  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(liked);
  const [optimisticLikesCount, setOptimisticLikesCount] = useState(likesCount);
  const [optimisticCommentsCount, setOptimisticCommentsCount] = useState(commentsCount);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(post.content || '');
  const [editError, setEditError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [isCommentsOpenByPostId, setIsCommentsOpenByPostId] = useState({});
  const [commentsByPostId, setCommentsByPostId] = useState({});
  const [isCommentsLoadingByPostId, setIsCommentsLoadingByPostId] = useState({});
  const [commentsErrorByPostId, setCommentsErrorByPostId] = useState({});

  const [isLikesOpenByPostId, setIsLikesOpenByPostId] = useState({});
  const [isLikesVisibleByPostId, setIsLikesVisibleByPostId] = useState({});
  const [likesByPostId, setLikesByPostId] = useState({});
  const [likesTotalByPostId, setLikesTotalByPostId] = useState({});
  const [likesOffsetByPostId, setLikesOffsetByPostId] = useState({});
  const [isLikesLoadingByPostId, setIsLikesLoadingByPostId] = useState({});
  const [isLikesLoadingMoreByPostId, setIsLikesLoadingMoreByPostId] = useState({});
  const [likesErrorByPostId, setLikesErrorByPostId] = useState({});

  const likesAnimatedValueByPostIdRef = useRef({});

  const getLikesAnimationValue = useCallback((postId) => {
    if (!likesAnimatedValueByPostIdRef.current[postId]) {
      likesAnimatedValueByPostIdRef.current[postId] = new Animated.Value(0);
    }
    return likesAnimatedValueByPostIdRef.current[postId];
  }, []);

  const animateLikesSection = useCallback((postId, toValue, onEnd) => {
    const animatedValue = getLikesAnimationValue(postId);
    Animated.timing(animatedValue, {
      toValue,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && onEnd) onEnd();
    });
  }, [getLikesAnimationValue]);

  const commentsOpenForPost = Boolean(isCommentsOpenByPostId[post.id]);
  const commentsLoadingForPost = Boolean(isCommentsLoadingByPostId[post.id]);
  const commentsErrorForPost = commentsErrorByPostId[post.id] || null;
  const commentsForPost = Array.isArray(commentsByPostId[post.id])
    ? commentsByPostId[post.id]
    : Array.isArray(post.comments)
      ? post.comments
      : [];

  const likesOpenForPost = Boolean(isLikesOpenByPostId[post.id]);
  const likesVisibleForPost = Boolean(isLikesVisibleByPostId[post.id]);
  const likesLoadingForPost = Boolean(isLikesLoadingByPostId[post.id]);
  const likesLoadingMoreForPost = Boolean(isLikesLoadingMoreByPostId[post.id]);
  const likesErrorForPost = likesErrorByPostId[post.id] || null;
  const likesForPost = Array.isArray(likesByPostId[post.id]) ? likesByPostId[post.id] : [];
  const likesTotalForPost =
    typeof likesTotalByPostId[post.id] === 'number' ? likesTotalByPostId[post.id] : optimisticLikesCount;
  const canLoadMoreLikes = likesTotalForPost > likesForPost.length;

  const likesAnimatedStyle = useMemo(() => {
    const animatedValue = getLikesAnimationValue(post.id);
    return {
      opacity: animatedValue,
      maxHeight: animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 240],
      }),
      transform: [
        {
          scale: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.98, 1],
          }),
        },
        {
          translateY: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-4, 0],
          }),
        },
      ],
    };
  }, [getLikesAnimationValue, post.id]);

  useEffect(() => {
    if (!isEditing) {
      setEditDraft(post.content || '');
    }
  }, [isEditing, post.content]);

  useEffect(() => {
    setOptimisticLiked(liked);
    setOptimisticLikesCount(likesCount);
    setOptimisticCommentsCount(commentsCount);
  }, [commentsCount, liked, likesCount, post.id]);

  const handleSaveEdit = async () => {
    if (!isOwner || updating) return;
    setUpdating(true);
    setEditError(null);
    const { error } = await updatePost({ postId: post.id, content: editDraft });
    if (error) {
      setEditError(error);
    } else {
      setIsEditing(false);
    }
    setUpdating(false);
  };

  const handleDelete = () => {
    if (!isOwner || deleting) return;
    const performDelete = async () => {
      setDeleting(true);
      const { error } = await deletePost({ postId: post.id });
      if (error) {
        setEditError(error);
      }
      setDeleting(false);
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Vuoi eliminare questo post?')) {
        performDelete();
      }
      return;
    }

    Alert.alert('Elimina post', 'Vuoi eliminare questo post?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: performDelete,
      },
    ]);
  };

  const fetchCommentsForPost = useCallback(async (postId, { force = false } = {}) => {
    if (!postId) return;
    if (!force && Array.isArray(commentsByPostId[postId])) return;

    let alreadyLoading = false;
    setIsCommentsLoadingByPostId((prev) => {
      alreadyLoading = Boolean(prev[postId]);
      if (alreadyLoading) return prev;
      return { ...prev, [postId]: true };
    });
    if (alreadyLoading) return;

    setCommentsErrorByPostId((prev) => ({ ...prev, [postId]: null }));
    try {
      const response = await fetchPostComments({ postId, limit: 50, offset: 0 });
      const incoming = Array.isArray(response?.items) ? response.items : [];
      setCommentsByPostId((prev) => ({ ...prev, [postId]: incoming }));
    } catch (error) {
      if (error?.code === 'AUTH_REQUIRED') {
        await supabase.auth.signOut();
        return;
      }
      setCommentsErrorByPostId((prev) => ({ ...prev, [postId]: error?.message || 'Errore caricamento commenti.' }));
    } finally {
      setIsCommentsLoadingByPostId((prev) => ({ ...prev, [postId]: false }));
    }
  }, [commentsByPostId]);

  const fetchLikes = useCallback(async (postId, offset = 0, append = false) => {
    if (!postId) return;

    if (append) {
      let alreadyLoadingMore = false;
      setIsLikesLoadingMoreByPostId((prev) => {
        alreadyLoadingMore = Boolean(prev[postId]);
        if (alreadyLoadingMore) return prev;
        return { ...prev, [postId]: true };
      });
      if (alreadyLoadingMore) return;
    } else {
      let alreadyLoading = false;
      setIsLikesLoadingByPostId((prev) => {
        alreadyLoading = Boolean(prev[postId]);
        if (alreadyLoading) return prev;
        return { ...prev, [postId]: true };
      });
      if (alreadyLoading) return;
    }

    setLikesErrorByPostId((prev) => ({ ...prev, [postId]: null }));

    try {
      const response = await fetchPostLikes({
        postId,
        limit: LIKE_PAGE_SIZE,
        offset,
      });
      const incoming = Array.isArray(response?.items) ? response.items : [];
      setLikesByPostId((prev) => {
        const existing = append && Array.isArray(prev[postId]) ? prev[postId] : [];
        const merged = append ? dedupeLikeUsers([...existing, ...incoming]) : incoming;
        return { ...prev, [postId]: merged };
      });
      const totalFromApi = typeof response?.total === 'number' ? response.total : null;
      const loadedCount = append ? offset + incoming.length : incoming.length;
      setLikesTotalByPostId((prev) => ({
        ...prev,
        [postId]: totalFromApi ?? Math.max(loadedCount, prev[postId] || 0),
      }));
      setLikesOffsetByPostId((prev) => ({ ...prev, [postId]: loadedCount }));
    } catch (error) {
      if (error?.code === 'AUTH_REQUIRED') {
        await supabase.auth.signOut();
        return;
      }
      setLikesErrorByPostId((prev) => ({ ...prev, [postId]: error?.message || 'Errore caricamento mi piace.' }));
    } finally {
      if (append) {
        setIsLikesLoadingMoreByPostId((prev) => ({ ...prev, [postId]: false }));
      } else {
        setIsLikesLoadingByPostId((prev) => ({ ...prev, [postId]: false }));
      }
    }
  }, []);

  const handleToggleComments = async () => {
    const nextOpen = !commentsOpenForPost;
    setIsCommentsOpenByPostId((prev) => ({ ...prev, [post.id]: nextOpen }));
    if (!nextOpen) return;
    await fetchCommentsForPost(post.id);
  };

  const handleToggleLikes = async () => {
    const nextOpen = !likesOpenForPost;
    if (nextOpen) {
      setIsLikesVisibleByPostId((prev) => ({ ...prev, [post.id]: true }));
      setIsLikesOpenByPostId((prev) => ({ ...prev, [post.id]: true }));
      animateLikesSection(post.id, 1);
      if (typeof likesByPostId[post.id] === 'undefined') {
        await fetchLikes(post.id, 0, false);
      }
      return;
    }

    setIsLikesOpenByPostId((prev) => ({ ...prev, [post.id]: false }));
    animateLikesSection(post.id, 0, () => {
      setIsLikesVisibleByPostId((prev) => ({ ...prev, [post.id]: false }));
    });
  };

  const handleLoadMoreLikes = async () => {
    const offset = likesOffsetByPostId[post.id] || likesForPost.length || 0;
    await fetchLikes(post.id, offset, true);
  };

  const handleToggleLike = () => {
    if (likePending) return;

    setOptimisticLiked((previousLiked) => {
      const nextLiked = !previousLiked;
      setOptimisticLikesCount((previousCount) => {
        if (nextLiked) return previousCount + 1;
        return Math.max(previousCount - 1, 0);
      });

      if (isLikesOpenByPostId[post.id]) {
        setLikesByPostId((prev) => {
          const existing = Array.isArray(prev[post.id]) ? prev[post.id] : [];
          const hasSelf = existing.some((item) => item.user_id === selfUser.id);
          let next = existing;

          if (nextLiked && !hasSelf) {
            next = [
              {
                user_id: selfUser.id,
                full_name: 'Tu',
                avatar_url: null,
                created_at: new Date().toISOString(),
              },
              ...existing,
            ];
          }
          if (!nextLiked && hasSelf) {
            next = existing.filter((item) => item.user_id !== selfUser.id);
          }

          if (next !== existing) {
            setLikesOffsetByPostId((offsetPrev) => ({ ...offsetPrev, [post.id]: next.length }));
          }

          return { ...prev, [post.id]: next };
        });

        setLikesTotalByPostId((prev) => {
          const currentTotal = typeof prev[post.id] === 'number' ? prev[post.id] : optimisticLikesCount;
          const nextTotal = nextLiked ? currentTotal + 1 : Math.max(currentTotal - 1, 0);
          return { ...prev, [post.id]: nextTotal };
        });
      }

      return nextLiked;
    });

    toggleLike(post.id);
  };

  const handleSubmitComment = async () => {
    const text = commentDraft.trim();
    if (!text || commentSubmitting) return;

    const localCommentId = `local-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const optimisticComment = {
      id: localCommentId,
      authorId: selfUser.id,
      author: 'Tu',
      initials: selfUser.initials || 'TU',
      authorAvatarUrl: null,
      text,
      createdAt,
    };

    setCommentSubmitting(true);
    setCommentDraft('');
    setOptimisticCommentsCount((previousCount) => previousCount + 1);
    setCommentsByPostId((prev) => {
      const existing = Array.isArray(prev[post.id]) ? prev[post.id] : commentsForPost;
      return { ...prev, [post.id]: [optimisticComment, ...existing] };
    });

    try {
      const result = await addComment(post.id, text);
      if (result?.error) {
        throw result.error;
      }

      const saved = result?.data;
      if (saved?.id) {
        setCommentsByPostId((prev) => {
          const existing = Array.isArray(prev[post.id]) ? prev[post.id] : [];
          return {
            ...prev,
            [post.id]: existing.map((comment) =>
              comment.id === localCommentId
                ? {
                    ...comment,
                    id: saved.id,
                    text: saved.content || comment.text,
                    createdAt: saved.created_at || comment.createdAt,
                  }
                : comment,
            ),
          };
        });
      }
    } catch (_error) {
      setOptimisticCommentsCount((previousCount) => Math.max(previousCount - 1, 0));
      setCommentsByPostId((prev) => {
        const existing = Array.isArray(prev[post.id]) ? prev[post.id] : [];
        return { ...prev, [post.id]: existing.filter((comment) => comment.id !== localCommentId) };
      });
    } finally {
      setCommentSubmitting(false);
    }
  };

  const mediaItems = useMemo(() => post.mediaItems || [], [post.mediaItems]);

  return (
    <View style={[styles.card, isWeb && styles.webCard]}>
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <View style={[styles.avatar, { backgroundColor: authorAvatarUrl ? 'transparent' : post.avatarColor }]}>
          {authorAvatarUrl ? (
            <Image source={{ uri: authorAvatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.meta}
          activeOpacity={onPressAuthor ? 0.8 : 1}
          onPress={onPressAuthor}
          disabled={!onPressAuthor}
        >
          <Text style={[styles.author, isRTL && styles.rtlText]}>{post.author}</Text>
          <Text style={[styles.handle, isRTL && styles.rtlText]}>
            {post.displayName} • {post.time}
          </Text>
        </TouchableOpacity>
      </View>

      {isEditing ? (
        <TextInput
          style={[styles.editInput, isRTL && styles.rtlText]}
          value={editDraft}
          onChangeText={(text) => setEditDraft(text.slice(0, 500))}
          multiline
          maxLength={500}
        />
      ) : (
        <Text style={[styles.content, isRTL && styles.rtlText]}>{post.content}</Text>
      )}

      {post.image && mediaItems.length === 0 ? (
        <Image source={{ uri: post.image }} style={styles.image} />
      ) : null}

      {mediaItems.map((media, index) => {
        if (!media?.publicUrl) return null;
        if (media.mediaType === 'image') {
          const aspectRatio = media.width && media.height ? media.width / media.height : undefined;
          return (
            <Image
              key={`${media.publicUrl}-${index}`}
              source={{ uri: media.publicUrl }}
              style={[styles.mediaImage, aspectRatio ? { aspectRatio, height: undefined } : null]}
            />
          );
        }

        if (media.mediaType === 'video') {
          return (
            <View key={`${media.publicUrl}-${index}`} style={styles.videoPlaceholder}>
              <Ionicons name="videocam" size={20} color={theme.colors.muted} />
              <Text style={styles.videoPlaceholderText}>Video non supportato ancora</Text>
            </View>
          );
        }

        return null;
      })}

      <View style={[styles.actions, isRTL && styles.rowReverse]}>
        <TouchableOpacity activeOpacity={0.8} onPress={handleToggleLike} disabled={likePending}>
          <Ionicons
            name={optimisticLiked ? 'heart' : 'heart-outline'}
            size={24}
            color={optimisticLiked ? theme.colors.primary : theme.colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.8} onPress={handleToggleComments}>
          <Ionicons name="chatbubble-outline" size={23} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.8} onPress={handleToggleLikes}>
        <Text style={styles.likesText}>Piace a {optimisticLikesCount} persone</Text>
      </TouchableOpacity>

      {likesVisibleForPost ? (
        <Animated.View style={[styles.likesInlineSection, likesAnimatedStyle]}>
          {likesLoadingForPost ? (
            <View style={styles.likesStateRow}>
              <ActivityIndicator size="small" color={theme.colors.secondary} />
              <Text style={styles.likesStateText}>Caricamento mi piace...</Text>
            </View>
          ) : null}

          {!likesLoadingForPost && likesErrorForPost ? (
            <View style={styles.commentStateBox}>
              <Text style={styles.commentErrorText}>{likesErrorForPost}</Text>
              <TouchableOpacity style={styles.retryCommentsButton} onPress={() => fetchLikes(post.id, 0, false)}>
                <Text style={styles.retryCommentsText}>Riprova</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!likesLoadingForPost && !likesErrorForPost && likesTotalForPost === 0 ? (
            <Text style={styles.emptyCommentsText}>Nessun mi piace.</Text>
          ) : null}

          {!likesLoadingForPost && !likesErrorForPost
            ? likesForPost.map((user, index) => {
              const fullName = String(user.full_name || 'Utente').trim() || 'Utente';
              const userInitials =
                fullName
                  .split(' ')
                  .filter(Boolean)
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'UT';
              return (
                <View key={`${user.user_id}-${index}`} style={styles.likeRow}>
                  <View style={styles.commentAvatar}>
                    {user.avatar_url ? (
                      <Image source={{ uri: user.avatar_url }} style={styles.commentAvatarImage} />
                    ) : (
                      <Text style={styles.commentAvatarText}>{userInitials}</Text>
                    )}
                  </View>
                  <Text style={styles.commentAuthor}>{fullName}</Text>
                </View>
              );
            })
            : null}

          {!likesLoadingForPost && !likesErrorForPost && canLoadMoreLikes ? (
            <TouchableOpacity
              style={[styles.loadMoreLikesButton, likesLoadingMoreForPost && styles.ownerButtonDisabled]}
              onPress={handleLoadMoreLikes}
              disabled={likesLoadingMoreForPost}
            >
              {likesLoadingMoreForPost ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={styles.loadMoreLikesText}>Mostra altri</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      ) : null}

      <TouchableOpacity activeOpacity={0.8} onPress={handleToggleComments}>
        <Text style={styles.viewComments}>Visualizza tutti i {optimisticCommentsCount} commenti</Text>
      </TouchableOpacity>

      {isOwner ? (
        <View style={[styles.ownerActions, isRTL && styles.rowReverse]}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={[styles.ownerButton, updating && styles.ownerButtonDisabled]}
                onPress={handleSaveEdit}
                disabled={updating}
              >
                <Text style={styles.ownerButtonText}>{updating ? 'Salvataggio...' : 'Salva'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ownerButton}
                onPress={() => {
                  setIsEditing(false);
                  setEditError(null);
                }}
                disabled={updating}
              >
                <Text style={styles.ownerButtonText}>Annulla</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.ownerButton} onPress={() => setIsEditing(true)}>
                <Text style={styles.ownerButtonText}>Modifica</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ownerButton, styles.ownerDanger, deleting && styles.ownerButtonDisabled]}
                onPress={handleDelete}
                disabled={deleting}
              >
                <Text style={[styles.ownerButtonText, styles.ownerDangerText]}>
                  {deleting ? 'Eliminazione...' : 'Elimina'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : null}

      {editError ? <Text style={styles.editErrorText}>{editError.message}</Text> : null}

      {commentsOpenForPost && (
        <View style={styles.comments}>
          {commentsLoadingForPost ? (
            <View style={styles.commentStateRow}>
              <ActivityIndicator size="small" color={theme.colors.secondary} />
              <Text style={styles.commentStateText}>Caricamento commenti...</Text>
            </View>
          ) : null}
          {!commentsLoadingForPost && commentsErrorForPost ? (
            <View style={styles.commentStateBox}>
              <Text style={styles.commentErrorText}>{commentsErrorForPost}</Text>
              <TouchableOpacity style={styles.retryCommentsButton} onPress={() => fetchCommentsForPost(post.id, { force: true })}>
                <Text style={styles.retryCommentsText}>Riprova</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {!commentsLoadingForPost && !commentsErrorForPost && commentsForPost.length === 0 ? (
            <Text style={styles.emptyCommentsText}>Nessun commento disponibile.</Text>
          ) : null}
          {!commentsLoadingForPost && !commentsErrorForPost
            ? commentsForPost.map((comment) => (
              <View key={comment.id} style={styles.commentRow}>
                <View style={styles.commentAvatar}>
                  {comment.authorAvatarUrl ? (
                    <Image source={{ uri: comment.authorAvatarUrl }} style={styles.commentAvatarImage} />
                  ) : (
                    <Text style={styles.commentAvatarText}>{comment.initials}</Text>
                  )}
                </View>
                <View style={styles.commentBody}>
                  <View style={styles.commentMeta}>
                    <Text style={styles.commentAuthor}>{comment.author}</Text>
                    {comment.createdAt ? (
                      <Text style={styles.commentTime}>{formatCommentTimestamp(comment.createdAt)}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </View>
              </View>
            ))
            : null}
          <View style={styles.addCommentRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Aggiungi un commento..."
              placeholderTextColor={theme.colors.muted}
              value={commentDraft}
              onChangeText={setCommentDraft}
            />
            <TouchableOpacity
              style={[styles.addCommentButton, commentSubmitting && styles.ownerButtonDisabled]}
              onPress={handleSubmitComment}
              disabled={commentSubmitting}
            >
              <Ionicons name="add-circle" size={18} color={theme.colors.primary} />
              <Text style={styles.addCommentText}>{commentSubmitting ? 'Invio...' : 'Invia'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  avatarText: {
    color: theme.colors.card,
    fontWeight: '800',
    fontSize: 16,
  },
  meta: {
    flex: 1,
  },
  author: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  handle: {
    color: theme.colors.muted,
  },
  content: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  editInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    backgroundColor: theme.colors.surfaceMuted,
    minHeight: 70,
    marginBottom: theme.spacing.sm,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
  },
  mediaImage: {
    width: '100%',
    height: 180,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceMuted,
  },
  videoPlaceholder: {
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  videoPlaceholderText: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  likesText: {
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  likesInlineSection: {
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    marginBottom: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  likesStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  likesStateText: {
    color: theme.colors.muted,
  },
  loadMoreLikesButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
  },
  loadMoreLikesText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  viewComments: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.xs,
  },
  ownerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  ownerButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  ownerButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  ownerDanger: {
    borderColor: 'rgba(215,35,35,0.4)',
    backgroundColor: 'rgba(215,35,35,0.08)',
  },
  ownerDangerText: {
    color: theme.colors.primary,
  },
  ownerButtonDisabled: {
    opacity: 0.6,
  },
  editErrorText: {
    color: theme.colors.danger || '#d64545',
    fontWeight: '600',
  },
  webCard: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
  },
  comments: {
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  commentRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  commentStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  commentStateText: {
    color: theme.colors.muted,
  },
  commentStateBox: {
    gap: theme.spacing.xs,
  },
  commentErrorText: {
    color: theme.colors.danger || '#d64545',
    fontWeight: '600',
  },
  retryCommentsButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.xs,
  },
  retryCommentsText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  emptyCommentsText: {
    color: theme.colors.muted,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  commentAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  commentAvatarText: {
    fontWeight: '800',
    color: theme.colors.secondary,
  },
  commentBody: {
    flex: 1,
    gap: 2,
  },
  commentAuthor: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  commentTime: {
    color: theme.colors.muted,
    fontSize: 11,
  },
  commentText: {
    color: theme.colors.muted,
    lineHeight: 18,
  },
  addCommentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.xs,
  },
  addCommentText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  addCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export default PostCard;
