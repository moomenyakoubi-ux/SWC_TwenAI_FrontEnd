import React, { createContext, useContext, useMemo, useState } from 'react';
import fakePosts from '../data/fakePosts';
import fakeProfiles from '../data/fakeProfiles';

const PostsContext = createContext();

const buildAllowedUsers = () =>
  fakeProfiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    initials: profile.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    isFake: true,
  }));

const selfUser = {
  id: 'self-user',
  name: 'Tu',
  initials: 'TU',
  isFake: true,
};

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const seedPost = (post, allowedUsers) => {
  const userPool = [...allowedUsers, selfUser];

  const likeCount = Math.floor(Math.random() * (userPool.length + 1)); // 0..len
  const likesSample = shuffle(userPool).slice(0, likeCount);
  const likes = likesSample.map((user) => ({
    userId: user.id,
    name: user.id === selfUser.id ? 'Tu' : user.name,
    initials: user.id === selfUser.id ? 'TU' : user.initials,
  }));

  const commentCount = Math.floor(Math.random() * 11); // 0..10
  const commentsSample = shuffle(userPool).slice(0, Math.min(commentCount, userPool.length));
  const templates = [
    'Mi piace questa idea, voglio partecipare!',
    'Ottimo spunto, condividilo anche nel gruppo!',
    'Che bello, tienici aggiornati.',
    'Vorrei saperne di più, scrivimi in privato.',
  ];
  const comments = commentsSample.map((user, idx) => ({
    id: `${post.id}-c-${idx}`,
    authorId: user.id,
    author: user.id === selfUser.id ? 'Tu' : user.name,
    initials: user.id === selfUser.id ? 'TU' : user.initials,
    text: templates[idx % templates.length],
    createdAt: new Date().toISOString(),
  }));

  return {
    ...post,
    likes,
    comments,
  };
};

export const PostsProvider = ({ children }) => {
  const allowedUsers = useMemo(buildAllowedUsers, []);
  const [posts, setPosts] = useState(() => fakePosts.map((p) => seedPost(p, allowedUsers)));

  const addPost = (post) => {
    if (!post || !post.id) return;
    setPosts((prev) => [{ ...post, likes: post.likes || [], comments: post.comments || [] }, ...prev]);
  };

  const toggleLike = (postId) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const hasSelf = post.likes.some((l) => l.userId === selfUser.id);
        const nextLikes = hasSelf
          ? post.likes.filter((l) => l.userId !== selfUser.id)
          : [{ userId: selfUser.id, name: 'Tu', initials: 'TU' }, ...post.likes];
        // dedupe by userId
        const uniq = Array.from(new Map(nextLikes.map((l) => [l.userId, l])).values());
        return { ...post, likes: uniq };
      }),
    );
  };

  const addComment = (postId, text) => {
    if (!text?.trim()) return;
    const clean = text.trim();
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const newComment = {
          id: `${post.id}-c-${Date.now()}`,
          authorId: selfUser.id,
          author: 'Tu',
          initials: 'TU',
          text: clean,
          createdAt: new Date().toISOString(),
        };
        return { ...post, comments: [...post.comments, newComment] };
      }),
    );
  };

  const value = useMemo(
    () => ({
      posts,
      addPost,
      toggleLike,
      addComment,
      selfUser,
    }),
    [posts],
  );

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>;
};

export const usePosts = () => useContext(PostsContext);
