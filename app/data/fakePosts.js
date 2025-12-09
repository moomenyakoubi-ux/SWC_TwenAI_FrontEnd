import fakeProfiles from './fakeProfiles';

const fakePosts = fakeProfiles.flatMap((profile) =>
  profile.posts.map((post) => ({
    author: post.author || profile.name,
    handle: post.handle || profile.handle || profile.username,
    avatarColor: post.avatarColor || profile.avatarColor,
    ...post,
  })),
);

export default fakePosts;
