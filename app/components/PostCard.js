import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';

const PostCard = ({ post, isRTL, onPressAuthor }) => {
  const initials = post.author
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.card}>
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

      <View style={[styles.footer, isRTL && styles.rowReverse]}>
        <View style={styles.stat}>
          <Ionicons name="heart" size={18} color={theme.colors.primary} />
          <Text style={styles.statText}>{post.reactions}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="chatbubble" size={18} color={theme.colors.muted} />
          <Text style={styles.statText}>{post.comments}</Text>
        </View>
      </View>
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
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statText: {
    color: theme.colors.text,
    fontWeight: '600',
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
