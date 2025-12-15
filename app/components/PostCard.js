import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';
import { usePosts } from '../context/PostsContext';

const PostCard = ({ post, isRTL, onPressAuthor }) => {
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

  const { toggleLike, addComment, selfUser } = usePosts();

  const initialLiked = useMemo(
    () => post.likes?.some((user) => user.userId === selfUser.id),
    [post.likes, selfUser.id],
  );

  const [liked, setLiked] = useState(initialLiked);
  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  const [showComments, setShowComments] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');

  return (
    <View style={[styles.card, isWeb && styles.webCard]}>
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <View style={[styles.avatar, { backgroundColor: post.avatarColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <TouchableOpacity
          style={styles.meta}
          activeOpacity={onPressAuthor ? 0.8 : 1}
          onPress={onPressAuthor}
          disabled={!onPressAuthor}
        >
          <Text style={[styles.author, isRTL && styles.rtlText]}>{post.author}</Text>
          <Text style={[styles.handle, isRTL && styles.rtlText]}>
            {post.handle} • {post.time}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.content, isRTL && styles.rtlText]}>{post.content}</Text>

      {post.image && <Image source={{ uri: post.image }} style={styles.image} />}

      <View style={[styles.actions, isRTL && styles.rowReverse]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setLiked((prev) => !prev);
            toggleLike(post.id);
          }}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={24}
            color={liked ? theme.colors.primary : theme.colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.8} onPress={() => setShowComments((prev) => !prev)}>
          <Ionicons name="chatbubble-outline" size={23} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.8} onPress={() => setShowLikes((prev) => !prev)}>
        <Text style={styles.likesText}>Piace a {post.likes?.length || 0} persone</Text>
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.8} onPress={() => setShowComments((prev) => !prev)}>
        <Text style={styles.viewComments}>Visualizza tutti i {post.comments?.length || 0} commenti</Text>
      </TouchableOpacity>

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

      {showComments && (
        <View style={styles.comments}>
          {(post.comments || []).map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>{comment.initials}</Text>
              </View>
              <View style={styles.commentBody}>
                <Text style={styles.commentAuthor}>{comment.author}</Text>
                <Text style={styles.commentText}>{comment.text}</Text>
              </View>
            </View>
          ))}
          <View style={styles.addCommentRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Aggiungi un commento..."
              placeholderTextColor={theme.colors.muted}
              value={commentDraft}
              onChangeText={setCommentDraft}
            />
            <TouchableOpacity
              style={styles.addCommentButton}
              onPress={() => {
                if (!commentDraft.trim()) return;
                addComment(post.id, commentDraft.trim());
                setCommentDraft('');
              }}
            >
              <Ionicons name="add-circle" size={18} color={theme.colors.primary} />
              <Text style={styles.addCommentText}>Invia</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
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
  image: {
    width: '100%',
    height: 180,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
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
  webCard: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
  },
  comments: {
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(12,27,51,0.08)',
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  likesList: {
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(12,27,51,0.08)',
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
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(12,27,51,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderColor: 'rgba(12,27,51,0.12)',
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
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
