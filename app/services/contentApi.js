import { getApiBaseUrl } from '../config/api';

const DEFAULT_LIMIT = 12;
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
 * @property {HomePostPayload} post
 */

/**
 * @typedef {Object} OfficialItem
 * @property {'official'} kind
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {string|null} imageUrl
 */

/**
 * @typedef {Object} SponsoredItem
 * @property {'sponsored'} kind
 * @property {string} id
 * @property {string} sponsorName
 * @property {string} title
 * @property {string} body
 * @property {string|null} imageUrl
 * @property {string} ctaLabel
 * @property {string|null} targetUrl
 */

/**
 * @typedef {PostItem | OfficialItem | SponsoredItem} HomeFeedItem
 */

const asString = (value) => (value == null ? '' : String(value).trim());

const asNullableString = (value) => {
  const text = asString(value);
  return text ? text : null;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

const requestApi = async ({ path, params, accessToken }) => {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error('API base URL non configurata.');
  }

  const response = await fetch(`${baseUrl}${path}${buildQueryString(params)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  const body = await parseResponseBody(response);
  if (!response.ok) {
    if (body && typeof body === 'object') {
      throw new Error(body.message || body.error || `Request failed (${response.status}).`);
    }
    throw new Error(asString(body) || `Request failed (${response.status}).`);
  }

  return body || {};
};

const computeHasMore = ({ payload, offset, limit, receivedCount }) => {
  const explicitHasMore = payload?.has_more ?? payload?.hasMore;
  if (typeof explicitHasMore === 'boolean') return explicitHasMore && receivedCount > 0;

  const total = toNumber(payload?.total ?? payload?.count);
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
  const userId = asString(like.userId || like.user_id || like.id || `like-${index}`);
  const name = asString(like.name || like.full_name || like.display_name || like.email || 'Utente');
  return {
    userId,
    name,
    initials: getInitials(name),
  };
};

const normalizeComment = (comment, index) => {
  if (!comment) return null;
  const id = asString(comment.id || comment.comment_id || `comment-${index}`);
  const author = asString(comment.author || comment.full_name || comment.display_name || 'Utente');
  return {
    id,
    authorId: asNullableString(comment.authorId || comment.author_id || null),
    author,
    initials: getInitials(author),
    text: asString(comment.text || comment.content || comment.body),
    createdAt: asNullableString(comment.createdAt || comment.created_at || null),
  };
};

const normalizeMediaItem = (media) => {
  if (!media) return null;
  return {
    mediaType: asString(media.mediaType || media.media_type || media.type || 'image'),
    publicUrl: asNullableString(media.publicUrl || media.public_url || media.url || media.image_url),
    width: toNumber(media.width),
    height: toNumber(media.height),
  };
};

const normalizePostPayload = (rawPost, index) => {
  if (!rawPost) return null;
  const postId = asString(rawPost.id || rawPost.post_id || rawPost.uuid || `post-${index}`);
  const author = asString(rawPost.author || rawPost.author_name || rawPost.full_name || 'Utente');
  const displayName = asString(rawPost.displayName || rawPost.display_name || author);
  const rawLikes = Array.isArray(rawPost.likes) ? rawPost.likes.map(normalizeLike).filter(Boolean) : [];
  const rawComments = Array.isArray(rawPost.comments)
    ? rawPost.comments.map(normalizeComment).filter(Boolean)
    : [];
  const rawMediaItems = Array.isArray(rawPost.mediaItems || rawPost.media_items)
    ? (rawPost.mediaItems || rawPost.media_items).map(normalizeMediaItem).filter(Boolean)
    : [];
  const likesCount = toNumber(rawPost.likes_count ?? rawPost.likesCount ?? rawPost.likes?.length) ?? rawLikes.length;
  const commentsCount =
    toNumber(rawPost.comments_count ?? rawPost.commentsCount ?? rawPost.comments?.length) ?? rawComments.length;

  return {
    id: postId,
    authorId: asNullableString(rawPost.authorId || rawPost.author_id || null),
    author,
    displayName,
    avatarColor: asString(rawPost.avatarColor || rawPost.avatar_color || DEFAULT_AVATAR_COLOR),
    authorAvatarUrl: asNullableString(rawPost.authorAvatarUrl || rawPost.author_avatar_url || rawPost.avatar_url),
    time: asString(rawPost.time) || formatRelativeTime(rawPost.created_at || rawPost.createdAt),
    content: asString(rawPost.content || rawPost.body || rawPost.text),
    image: asNullableString(rawPost.image || rawPost.image_url || rawPost.cover_url),
    likes: rawLikes,
    likes_count: likesCount,
    comments: rawComments,
    comments_count: commentsCount,
    mediaItems: rawMediaItems,
  };
};

const normalizeOfficialItem = (rawItem, index) => {
  if (!rawItem) return null;
  const id = asString(rawItem.id || rawItem.official_id || `official-${index}`);
  const title = asString(rawItem.title || rawItem.headline);
  const body = asString(rawItem.body || rawItem.excerpt || rawItem.description || rawItem.content);
  if (!title && !body) return null;
  return {
    kind: 'official',
    id: `official-${id}`,
    title: title || 'TwensAI',
    body,
    imageUrl: asNullableString(rawItem.image_url || rawItem.image || rawItem.cover_url),
  };
};

const normalizeSponsoredItem = (rawItem, index) => {
  if (!rawItem) return null;
  const id = asString(rawItem.id || rawItem.sponsored_id || `sponsored-${index}`);
  const sponsorName = asString(rawItem.sponsor_name || rawItem.sponsorName || 'Partner');
  const ctaLabel = asString(rawItem.cta || rawItem.cta_label || rawItem.cta_text || 'Apri');
  const title = asString(rawItem.title || rawItem.headline || sponsorName);
  const body = asString(rawItem.body || rawItem.excerpt || rawItem.description || '');

  return {
    kind: 'sponsored',
    id: `sponsored-${id}`,
    sponsorName,
    title,
    body,
    imageUrl: asNullableString(rawItem.image_url || rawItem.image || rawItem.cover_url),
    ctaLabel,
    targetUrl: asNullableString(rawItem.target_url || rawItem.targetUrl || rawItem.url),
  };
};

const normalizeHomeFeedItem = (rawItem, index) => {
  const kind = asString(rawItem?.kind || rawItem?.item_kind || '').toLowerCase();

  if (kind === 'official') {
    return normalizeOfficialItem(rawItem, index);
  }
  if (kind === 'sponsored') {
    return normalizeSponsoredItem(rawItem, index);
  }

  const sourcePost = rawItem?.post || rawItem;
  const post = normalizePostPayload(sourcePost, index);
  if (!post) return null;
  return {
    kind: 'post',
    id: `post-${post.id}`,
    post,
  };
};

/**
 * @param {{ limit?: number, offset?: number, type?: EventsNewsType, accessToken?: string|null }} [params]
 * @returns {Promise<{ items: EventsNewsItem[], hasMore: boolean, nextOffset: number }>}
 */
export const fetchEventsNews = async ({ limit = DEFAULT_LIMIT, offset = 0, type, accessToken } = {}) => {
  const payload = await requestApi({
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
  const payload = await requestApi({
    path: '/api/feed/home',
    params: { limit, offset },
    accessToken,
  });

  let items = getArrayFromPayload(payload, ['items', 'feed'])
    .map((item, index) => normalizeHomeFeedItem(item, index))
    .filter(Boolean);

  if (!items.length) {
    const posts = getArrayFromPayload(payload, ['posts'])
      .map((item, index) => {
        const post = normalizePostPayload(item, index);
        if (!post) return null;
        return {
          kind: 'post',
          id: `post-${post.id}`,
          post,
        };
      })
      .filter(Boolean);

    const official = getArrayFromPayload(payload, ['official_posts', 'official'])
      .map((item, index) => normalizeOfficialItem(item, index))
      .filter(Boolean);

    const sponsored = getArrayFromPayload(payload, ['sponsored_items', 'sponsored'])
      .map((item, index) => normalizeSponsoredItem(item, index))
      .filter(Boolean);

    items = [...posts, ...official, ...sponsored];
  }

  return {
    items,
    hasMore: computeHasMore({ payload, offset, limit, receivedCount: items.length }),
    nextOffset: offset + items.length,
  };
};
