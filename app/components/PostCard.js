import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const formatCommentTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
};

const PostCard = ({
  post,
  isRTL,
  onPressAuthor,
  commentsOpen,
  comments,
  commentsLoading,
  commentsError,
  onToggleComments,
  onRetryComments,
  onSubmitComment,
}) => {
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

  const [showComments, setShowComments] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
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
  const resolvedShowComments = typeof commentsOpen === 'boolean' ? commentsOpen : showComments;
  const resolvedComments = Array.isArray(comments) ? comments : post.comments || [];

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

  const mediaItems = useMemo(() => post.mediaItems || [], [post.mediaItems]);

  const handleToggleComments = () => {
    if (onToggleComments) {
      onToggleComments(post.id);
      return;
    }
    setShowComments((prev) => !prev);
  };

  const handleToggleLike = () => {
    if (likePending) return;
    setOptimisticLiked((previousLiked) => {
      const nextLiked = !previousLiked;
      setOptimisticLikesCount((previousCount) => {
        if (nextLiked) return previousCount + 1;
        return Math.max(previousCount - 1, 0);
      });
      return nextLiked;
    });
    toggleLike(post.id);
  };

  const handleSubmitComment = async () => {
    const text = commentDraft.trim();
    if (!text || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      if (onSubmitComment) {
        await onSubmitComment({ postId: post.id, text });
      } else {
        const result = await addComment(post.id, text);
        if (result?.error) {
          throw result.error;
        }
      }
      setCommentDraft('');
      setOptimisticCommentsCount((previousCount) => previousCount + 1);
    } catch (_error) {
      // addComment already handles user-visible errors.
    } finally {
      setCommentSubmitting(false);
    }
  };

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
          const aspectRatio =
            media.width && media.height ? media.width / media.height : undefined;
          return (
            <Image
              key={`${media.publicUrl}-${index}`}
              source={{ uri: media.publicUrl }}
              style={[
                styles.mediaImage,
                aspectRatio ? { aspectRatio, height: undefined } : null,
              ]}
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
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleToggleLike}
          disabled={likePending}
        >
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

      <TouchableOpacity activeOpacity={0.8} onPress={() => setShowLikes((prev) => !prev)}>
        <Text style={styles.likesText}>Piace a {optimisticLikesCount} persone</Text>
      </TouchableOpacity>

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

      {showLikes && (
        <View style={styles.likesList}>
          {(post.likes || []).map((user) => (
            <View key={user.userId || user.id} style={styles.likeRow}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>{user.initials}</Text>
              </View>
              <Text style={styles.commentAuthor}>{user.name}</Text>
            </View>
          ))}
        </View>
      )}

      {resolvedShowComments && (
        <View style={styles.comments}>
          {commentsLoading ? (
            <View style={styles.commentStateRow}>
              <ActivityIndicator size="small" color={theme.colors.secondary} />
              <Text style={styles.commentStateText}>Caricamento commenti...</Text>
            </View>
          ) : null}
          {!commentsLoading && commentsError ? (
            <View style={styles.commentStateBox}>
              <Text style={styles.commentErrorText}>
                {commentsError?.message || 'Errore nel caricamento commenti.'}
              </Text>
              <TouchableOpacity style={styles.retryCommentsButton} onPress={() => onRetryComments?.(post.id)}>
                <Text style={styles.retryCommentsText}>Riprova</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {!commentsLoading && !commentsError && resolvedComments.length === 0 ? (
            <Text style={styles.emptyCommentsText}>Nessun commento disponibile.</Text>
          ) : null}
          {!commentsLoading && !commentsError
            ? resolvedComments.map((comment) => (
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
  likesList: {
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.xs,
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
