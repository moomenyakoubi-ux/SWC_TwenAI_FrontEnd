import { getApiBaseUrl, getSupabaseAccessToken } from '../config/api';
import { supabase } from '../lib/supabase';

const DEFAULT_LIMIT = 20;
const DEFAULT_AVATAR_COLOR = '#E70013';

/**
 * @typedef {'event'|'news'} EventsNewsType
 */

/**
 * @typedef {Object} EventsNewsItem
 * @property {string} id
 * @property {EventsNewsType} type
 * @property {string} title
 * @property {string} excerpt
 * @property {string|null} image_url
 * @property {string|null} location
 * @property {string|null} starts_at
 */

/**
 * @typedef {Object} HomePostPayload
 * @property {string} id
 * @property {string|null} authorId
 * @property {string} author
 * @property {string} displayName
 * @property {string} avatarColor
 * @property {string|null} authorAvatarUrl
 * @property {string} time
 * @property {string} content
 * @property {string|null} image
 * @property {Array<{ userId: string, name: string, initials: string }>} likes
 * @property {number} likes_count
 * @property {Array<{ id: string, authorId: string|null, author: string, initials: string, text: string, createdAt: string|null }>} comments
 * @property {number} comments_count
 * @property {Array<{ mediaType: string, publicUrl: string|null, width?: number|null, height?: number|null }>} mediaItems
 */

/**
 * @typedef {Object} PostItem
 * @property {'post'} kind
 * @property {string} id
 * @property {string|null} authorId
 * @property {string} author
 * @property {string} displayName
 * @property {string} avatarColor
 * @property {string|null} authorAvatarUrl
 * @property {string} time
 * @property {string} content
 * @property {string|null} image
 * @property {Array<{ userId: string, name: string, initials: string }>} likes
 * @property {number} likes_count
 * @property {Array<{ id: string, authorId: string|null, author: string, initials: string, text: string, createdAt: string|null }>} comments
 * @property {number} comments_count
 * @property {Array<{ mediaType: string, publicUrl: string|null, width?: number|null, height?: number|null }>} mediaItems
 */

/**
 * @typedef {Object} OfficialItem
 * @property {'official'} kind
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {string|null} image_url
 * @property {string|null} target_url
 * @property {boolean} pinned
 * @property {string|null} created_at
 */

/**
 * @typedef {Object} SponsoredItem
 * @property {'sponsored'} kind
 * @property {string} id
 * @property {string} sponsor_name
 * @property {string} title
 * @property {string} body
 * @property {string|null} image_url
 * @property {string|null} target_url
 * @property {string|null} start_date
 * @property {string|null} end_date
 * @property {number} priority
 * @property {string|null} created_at
 */

/**
 * @typedef {Object} HomeEventNewsItem
 * @property {'event_news'} kind
 * @property {string} id
 * @property {EventsNewsType} type
 * @property {string} title
 * @property {string|null} excerpt
 * @property {string|null} content
 * @property {string|null} image_url
 * @property {string|null} location
 * @property {string|null} starts_at
 * @property {string|null} ends_at
 * @property {string|null} external_url
 * @property {boolean} pinned
 * @property {string|null} created_at
 */

/**
 * @typedef {PostItem | OfficialItem | SponsoredItem | HomeEventNewsItem} HomeFeedItem
 */

const asString = (value) => (value == null ? '' : String(value).trim());

const asNullableString = (value) => {
  const text = asString(value);
  return text ? text : null;
};

const resolveStoragePublicUrl = (bucket, path) => {
  if (!bucket || !path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
};

const getArrayFromPayload = (payload, keys) => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const getInitials = (name) =>
  asString(name)
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'UT';

const formatRelativeTime = (value) => {
  const timestamp = value ? new Date(value).getTime() : Date.now();
  if (!Number.isFinite(timestamp)) return '1m';
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}g`;
};

const buildQueryString = (params) => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value == null || value === '') return;
    query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
};

const parseResponseBody = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text || null;
};

const requestApi = async ({ path, params, accessToken, debugTag }) => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('API base URL non configurata.');
  }
  const resolvedAccessToken = accessToken || await getSupabaseAccessToken();
  if (!resolvedAccessToken) {
    const authError = new Error('Sessione non valida. Effettua di nuovo il login.');
    authError.code = 'AUTH_REQUIRED';
    throw authError;
  }

  const requestUrl = `${baseUrl}${path}${buildQueryString(params)}`;
  if (__DEV__ && debugTag) {
    console.log(`[${debugTag}] GET ${requestUrl}`);
  }

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(resolvedAccessToken ? { Authorization: `Bearer ${resolvedAccessToken}` } : {}),
    },
  });

  const body = await parseResponseBody(response);
  if (!response.ok) {
    if (__DEV__ && debugTag) {
      console.warn(`[${debugTag}] response not ok`, { url: requestUrl, status: response.status });
    }
    if (body && typeof body === 'object') {
      throw new Error(body.message || body.error || `Request failed (${response.status}).`);
    }
    throw new Error(asString(body) || `Request failed (${response.status}).`);
  }

  return { body: body || {}, status: response.status, url: requestUrl, hadAuth: true };
};

const computeHasMore = ({ payload, offset, limit, receivedCount }) => {
  const explicitHasMore = payload?.has_more ?? payload?.hasMore;
  if (typeof explicitHasMore === 'boolean') return explicitHasMore && receivedCount > 0;

  const total = toNumber(payload?.total ?? payload?.count ?? payload?.total_posts ?? payload?.totalPosts);
  if (typeof total === 'number') return offset + receivedCount < total;

  const nextOffset = toNumber(payload?.next_offset ?? payload?.nextOffset);
  if (typeof nextOffset === 'number') return nextOffset > offset;

  return receivedCount === limit;
};

const normalizeEventsNewsItem = (item, index, offset) => {
  const rawType = asString(item?.type || item?.item_type).toLowerCase();
  const type = rawType === 'event' ? 'event' : 'news';
  const id =
    asString(item?.id || item?._id || item?.slug) ||
    `${type}-${offset + index}`;
  const title = asString(item?.title || item?.headline || item?.name);
  if (!title) return null;

  return {
    id,
    type,
    title,
    excerpt: asString(item?.excerpt || item?.description || item?.body || item?.content),
    image_url: asNullableString(item?.image_url || item?.image || item?.cover_url),
    location: asNullableString(item?.location || item?.venue || item?.city),
    starts_at: asNullableString(item?.starts_at || item?.start_at || item?.start_date || item?.date),
  };
};

const normalizeLike = (like, index) => {
  if (!like) return null;
  const userId = asString(
    like.userId ||
      like.user_id ||
      like.id ||
      like.profile_id ||
      like.author_id ||
      `like-${index}`,
  );
  const name = asString(
    like.name ||
      like.full_name ||
      like.display_name ||
      like.author_name ||
      like?.profile?.full_name ||
      like?.user?.full_name ||
      like.email ||
      'Utente',
  );
  return {
    userId,
    name,
    fullName: name || 'Utente',
    avatarUrl: asNullableString(
      like.avatarUrl ||
        like.avatar_url ||
        like.author_avatar_url ||
        like?.profile?.avatar_url ||
        like?.user?.avatar_url,
    ),
    initials: getInitials(name),
  };
};

const normalizeComment = (comment, index) => {
  if (!comment) return null;
  const id = asString(comment.id || comment.comment_id || `comment-${index}`);
  const author = asString(
    comment.author ||
      comment.full_name ||
      comment.author_name ||
      comment.display_name ||
      comment?.profile?.full_name ||
      'Utente',
  );
  const text = asString(comment.text || comment.content || comment.body);
  if (!text) return null;
  return {
    id,
    authorId: asNullableString(comment.authorId || comment.author_id || null),
    author,
    initials: getInitials(author),
    authorAvatarUrl: asNullableString(
      comment.authorAvatarUrl ||
        comment.author_avatar_url ||
        comment.avatar_url ||
        comment?.profile?.avatar_url,
    ),
    text,
    createdAt: asNullableString(comment.createdAt || comment.created_at || null),
  };
};

const normalizeLikeUser = (like, index) => {
  if (!like) return null;
  const userId = asString(
    like.user_id ||
      like.userId ||
      like.id ||
      like.profile_id ||
      like.author_id ||
      `like-user-${index}`,
  );
  if (!userId) return null;
  const fullName = asNullableString(
    like.full_name ||
      like.fullName ||
      like.name ||
      like.display_name ||
      like.author_name ||
      like?.profile?.full_name ||
      like?.user?.full_name,
  );
  return {
    user_id: userId,
    full_name: fullName,
    avatar_url: asNullableString(
      like.avatar_url ||
        like.avatarUrl ||
        like.author_avatar_url ||
        like?.profile?.avatar_url ||
        like?.user?.avatar_url,
    ),
    created_at: asNullableString(like.created_at || like.createdAt),
  };
};

const normalizeMediaItem = (media) => {
  if (!media) return null;
  const bucket = asNullableString(media.bucket || media.bucket_id || media.bucketId || media.storageBucket);
  const path = asNullableString(media.path || media.name || media.storage_path || media.storagePath);
  const existingUrl = asNullableString(media.publicUrl || media.public_url || media.url || media.image_url);
  const resolvedUrl = existingUrl || resolveStoragePublicUrl(bucket, path);
  const rawType = asString(media.mediaType || media.media_type || media.type || 'image').toLowerCase();
  const normalizedType =
    rawType === 'image' || rawType.startsWith('image/')
      ? 'image'
      : rawType === 'video' || rawType.startsWith('video/')
        ? 'video'
        : rawType;

  if (!resolvedUrl && bucket && path) {
    console.warn('[MEDIA_URL_MISSING]', { bucket, path, media });
  }

  return {
    mediaType: normalizedType,
    publicUrl: resolvedUrl,
    bucket,
    path,
    width: toNumber(media.width),
    height: toNumber(media.height),
  };
};

const normalizePostPayload = (rawPost) => {
  if (!rawPost) return null;
  const postId = asString(rawPost.id || rawPost._id || rawPost.post_id || rawPost.uuid);
  if (!postId) return null;
  const author = asString(rawPost.author || rawPost.author_name || rawPost.full_name || 'Utente');
  const displayName = asString(rawPost.displayName || rawPost.display_name || author);
  const rawLikes = Array.isArray(rawPost.likes) ? rawPost.likes.map(normalizeLike).filter(Boolean) : [];
  const rawComments = Array.isArray(rawPost.comments)
    ? rawPost.comments.map(normalizeComment).filter(Boolean)
    : [];
  const rawMediaItems = Array.isArray(rawPost.mediaItems || rawPost.media_items)
    ? (rawPost.mediaItems || rawPost.media_items).map(normalizeMediaItem).filter(Boolean)
    : [];
  const imageBucket = asNullableString(
    rawPost.image_bucket ||
      rawPost.imageBucket ||
      rawPost.image_bucket_id ||
      rawPost.imageBucketId ||
      rawPost.media_bucket ||
      rawPost.mediaBucket ||
      rawPost.bucket ||
      rawPost.bucket_id ||
      rawPost.bucketId,
  );
  const imagePath = asNullableString(
    rawPost.image_path ||
      rawPost.imagePath ||
      rawPost.media_path ||
      rawPost.mediaPath ||
      rawPost.path ||
      rawPost.storage_path ||
      rawPost.storagePath ||
      rawPost.name,
  );
  let image = asNullableString(rawPost.image || rawPost.image_url || rawPost.cover_url);
  if (!image && imageBucket && imagePath) {
    image = resolveStoragePublicUrl(imageBucket, imagePath);
  }
  if (!image) {
    image = rawMediaItems.find((item) => item.mediaType === 'image' && item.publicUrl)?.publicUrl || null;
  }
  const likesCount = toNumber(rawPost.likes_count ?? rawPost.likesCount ?? rawPost.likes?.length) ?? rawLikes.length;
  const commentsCount =
    toNumber(rawPost.comments_count ?? rawPost.commentsCount ?? rawPost.comments?.length) ?? rawComments.length;
  const likedByMe =
    toBoolean(rawPost.liked_by_me ?? rawPost.likedByMe) ??
    toBoolean(rawPost.is_liked ?? rawPost.liked) ??
    false;

  return {
    id: postId,
    authorId: asNullableString(rawPost.authorId || rawPost.author_id || null),
    author,
    displayName,
    avatarColor: asString(rawPost.avatarColor || rawPost.avatar_color || DEFAULT_AVATAR_COLOR),
    authorAvatarUrl: asNullableString(rawPost.authorAvatarUrl || rawPost.author_avatar_url || rawPost.avatar_url),
    time: asString(rawPost.time) || formatRelativeTime(rawPost.created_at || rawPost.createdAt),
    content: asString(rawPost.content || rawPost.body || rawPost.text),
    image,
    likes: rawLikes,
    likes_count: likesCount,
    liked_by_me: likedByMe,
    comments: rawComments,
    comments_count: commentsCount,
    mediaItems: rawMediaItems,
  };
};

const normalizeOfficialItem = (rawItem) => {
  if (!rawItem) return null;
  const id = asString(rawItem.id || rawItem._id || rawItem.official_id);
  if (!id) return null;
  const title = asString(rawItem.title || rawItem.headline);
  const body = asString(rawItem.body || rawItem.excerpt || rawItem.description || rawItem.content);
  if (!title && !body) return null;
  return {
    kind: 'official',
    id,
    title: title || 'TwensAI',
    body,
    image_url: asNullableString(rawItem.image_url || rawItem.image || rawItem.cover_url),
    target_url: asNullableString(rawItem.target_url || rawItem.targetUrl || rawItem.url),
    pinned: Boolean(rawItem.pinned),
    created_at: asNullableString(rawItem.created_at || rawItem.createdAt),
  };
};

const normalizeSponsoredItem = (rawItem) => {
  if (!rawItem) return null;
  const id = asString(rawItem.id || rawItem._id || rawItem.sponsored_id);
  if (!id) return null;
  const sponsorName = asString(rawItem.sponsor_name || rawItem.sponsorName || 'Partner');
  const title = asString(rawItem.title || rawItem.headline || sponsorName);
  const body = asString(rawItem.body || rawItem.excerpt || rawItem.description || '');

  return {
    kind: 'sponsored',
    id,
    sponsor_name: sponsorName,
    title,
    body,
    image_url: asNullableString(rawItem.image_url || rawItem.image || rawItem.cover_url),
    target_url: asNullableString(rawItem.target_url || rawItem.targetUrl || rawItem.url),
    start_date: asNullableString(rawItem.start_date || rawItem.startDate),
    end_date: asNullableString(rawItem.end_date || rawItem.endDate),
    priority: toNumber(rawItem.priority) ?? 0,
    created_at: asNullableString(rawItem.created_at || rawItem.createdAt),
  };
};

const normalizeHomeEventNewsItem = (rawItem) => {
  if (!rawItem) return null;
  const id = asString(rawItem.id || rawItem._id || rawItem.event_news_id || rawItem.event_id || rawItem.news_id || rawItem.slug);
  if (!id) return null;

  const rawType = asString(rawItem.type || rawItem.item_type).toLowerCase();
  const type = rawType === 'event' ? 'event' : 'news';
  const title = asString(rawItem.title || rawItem.headline || rawItem.name);
  const excerpt = asNullableString(rawItem.excerpt || rawItem.summary || rawItem.description);
  const content = asNullableString(rawItem.content || rawItem.body || rawItem.text);
  if (!title && !excerpt && !content) return null;

  return {
    kind: 'event_news',
    id,
    type,
    title: title || excerpt || content || 'Aggiornamento',
    excerpt,
    content,
    image_url: asNullableString(rawItem.image_url || rawItem.image || rawItem.cover_url),
    location: asNullableString(rawItem.location || rawItem.venue || rawItem.city),
    starts_at: asNullableString(rawItem.starts_at || rawItem.start_at || rawItem.start_date || rawItem.date),
    ends_at: asNullableString(rawItem.ends_at || rawItem.end_at || rawItem.end_date),
    external_url: asNullableString(rawItem.external_url || rawItem.target_url || rawItem.targetUrl || rawItem.url),
    pinned: Boolean(rawItem.pinned),
    created_at: asNullableString(rawItem.created_at || rawItem.createdAt),
  };
};

const normalizeHomeFeedItem = (rawItem) => {
  const kind = asString(rawItem?.kind || rawItem?.item_kind || '').toLowerCase();

  if (kind === 'official') {
    return normalizeOfficialItem(rawItem);
  }
  if (kind === 'sponsored') {
    return normalizeSponsoredItem(rawItem);
  }
  if (kind === 'event_news') {
    return normalizeHomeEventNewsItem(rawItem);
  }

  const sourcePost = rawItem?.post || rawItem;
  const post = normalizePostPayload(sourcePost);
  if (!post) return null;
  return {
    kind: 'post',
    ...post,
  };
};

/**
 * @param {{ limit?: number, offset?: number, type?: EventsNewsType, accessToken?: string|null }} [params]
 * @returns {Promise<{ items: EventsNewsItem[], hasMore: boolean, nextOffset: number }>}
 */
export const fetchEventsNews = async ({ limit = DEFAULT_LIMIT, offset = 0, type, accessToken } = {}) => {
  const { body: payload } = await requestApi({
    path: '/api/content/events-news',
    params: {
      limit,
      offset,
      ...(type ? { type } : {}),
    },
    accessToken,
  });

  const rawItems = getArrayFromPayload(payload, ['items', 'data', 'results', 'events_news']);
  const items = rawItems
    .map((item, index) => normalizeEventsNewsItem(item, index, offset))
    .filter(Boolean);

  return {
    items,
    hasMore: computeHasMore({ payload, offset, limit, receivedCount: items.length }),
    nextOffset: offset + items.length,
  };
};

/**
 * @param {{ limit?: number, offset?: number, accessToken?: string|null }} [params]
 * @returns {Promise<{ items: HomeFeedItem[], hasMore: boolean, nextOffset: number }>}
 */
export const fetchHomeFeed = async ({ limit = DEFAULT_LIMIT, offset = 0, accessToken } = {}) => {
  const { body: payload, hadAuth } = await requestApi({
    path: '/api/feed/home',
    params: { limit, offset },
    accessToken,
    debugTag: 'home-feed',
  });

  let items = getArrayFromPayload(payload, ['items', 'feed'])
    .map((item) => normalizeHomeFeedItem(item))
    .filter(Boolean);

  if (!items.length) {
    const posts = getArrayFromPayload(payload, ['posts'])
      .map((item) => {
        const post = normalizePostPayload(item);
        if (!post) return null;
        return {
          kind: 'post',
          ...post,
        };
      })
      .filter(Boolean);

    const official = getArrayFromPayload(payload, ['official_posts', 'official'])
      .map((item) => normalizeOfficialItem(item))
      .filter(Boolean);

    const sponsored = getArrayFromPayload(payload, ['sponsored_items', 'sponsored'])
      .map((item) => normalizeSponsoredItem(item))
      .filter(Boolean);

    const eventNews = getArrayFromPayload(payload, ['event_news', 'events_news'])
      .map((item) => normalizeHomeEventNewsItem(item))
      .filter(Boolean);

    items = [...posts, ...official, ...sponsored, ...eventNews];
  }

  console.log('[FEED_FIRST_POST_MEDIA]', items?.[0]?.mediaItems?.[0]);

  const responseLimit = toNumber(payload?.limit) ?? limit;
  const responseOffset = toNumber(payload?.offset) ?? offset;
  const totalPosts = toNumber(payload?.totalPosts ?? payload?.total_posts ?? payload?.total);
  const adEvery = toNumber(payload?.adEvery ?? payload?.ad_every);
  const computedHasMore = computeHasMore({
    payload,
    offset: responseOffset,
    limit: responseLimit,
    receivedCount: items.length,
  });
  const hasMore =
    typeof totalPosts === 'number'
      ? responseOffset + responseLimit < totalPosts
      : computedHasMore;

  return {
    items,
    limit: responseLimit,
    offset: responseOffset,
    totalPosts,
    adEvery,
    hasMore,
    nextOffset: responseOffset + responseLimit,
    hadAuth,
  };
};

/**
 * @param {{ postId: string, limit?: number, offset?: number, accessToken?: string|null }} params
 * @returns {Promise<{ items: Array<{ id: string, authorId: string|null, author: string, initials: string, authorAvatarUrl: string|null, text: string, createdAt: string|null }>, hasMore: boolean, nextOffset: number }>}
 */
export const fetchPostComments = async ({ postId, limit = 50, offset = 0, accessToken } = {}) => {
  const safePostId = asString(postId);
  if (!safePostId) {
    throw new Error('postId non valido.');
  }

  const { body: payload } = await requestApi({
    path: `/api/posts/${encodeURIComponent(safePostId)}/comments`,
    params: { limit, offset },
    accessToken,
    debugTag: 'post-comments',
  });

  const rawItems = getArrayFromPayload(payload, ['items', 'comments', 'data', 'results']);
  const items = rawItems
    .map((comment, index) => normalizeComment(comment, offset + index))
    .filter(Boolean);

  return {
    items,
    hasMore: computeHasMore({ payload, offset, limit, receivedCount: items.length }),
    nextOffset: offset + items.length,
  };
};

/**
 * @param {{ postId: string, limit?: number, offset?: number, accessToken?: string|null }} params
 * @returns {Promise<{ items: Array<{ user_id: string, full_name: string|null, avatar_url: string|null, created_at?: string|null }>, limit: number, offset: number, total: number|null, hasMore: boolean, nextOffset: number }>}
 */
export const fetchPostLikes = async ({ postId, limit = 50, offset = 0, accessToken } = {}) => {
  const safePostId = asString(postId);
  if (!safePostId) {
    throw new Error('postId non valido.');
  }

  const { body: payload } = await requestApi({
    path: `/api/posts/${encodeURIComponent(safePostId)}/likes`,
    params: { limit, offset },
    accessToken,
    debugTag: 'post-likes',
  });

  const rawItems = getArrayFromPayload(payload, ['items', 'likes', 'data', 'results']);
  const items = rawItems
    .map((like, index) => normalizeLikeUser(like, offset + index))
    .filter(Boolean);
  const resolvedLimit = toNumber(payload?.limit) ?? limit;
  const resolvedOffset = toNumber(payload?.offset) ?? offset;
  const total = toNumber(payload?.total);

  return {
    items,
    limit: resolvedLimit,
    offset: resolvedOffset,
    total,
    hasMore: computeHasMore({ payload, offset, limit, receivedCount: items.length }),
    nextOffset: resolvedOffset + items.length,
  };
};

/**
 * @param {{ userId: string, limit?: number, offset?: number, accessToken?: string|null }} params
 * @returns {Promise<{ items: HomeFeedItem[], hasMore: boolean, nextOffset: number }>}
 */
export const fetchUserPosts = async ({ userId, limit = DEFAULT_LIMIT, offset = 0, accessToken } = {}) => {
  const safeUserId = asString(userId);
  if (!safeUserId) {
    throw new Error('userId non valido.');
  }

  const { body: payload } = await requestApi({
    path: `/api/users/${encodeURIComponent(safeUserId)}/posts`,
    params: { limit, offset },
    accessToken,
    debugTag: 'user-posts',
  });

  const rawItems = getArrayFromPayload(payload, ['items', 'posts', 'data', 'results']);
  const items = rawItems
    .map((item) => normalizePostPayload(item))
    .filter(Boolean)
    .map((post) => ({ kind: 'post', ...post }));

  console.log('[FEED_FIRST_POST_MEDIA]', items?.[0]?.mediaItems?.[0]);

  return {
    items,
    hasMore: computeHasMore({ payload, offset, limit, receivedCount: items.length }),
    nextOffset: offset + items.length,
  };
};
