import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const PROFILE_CACHE = new Map();

const asNullableString = (value) => {
  const text = String(value || '').trim();
  return text || null;
};

const normalizeUserId = (value) => {
  const id = asNullableString(value);
  if (!id || id === 'self-user') return null;
  return id;
};

const buildUserState = ({ id, name, avatar }) => ({
  currentUserId: normalizeUserId(id),
  currentUserName: asNullableString(name) || 'Tu',
  currentUserAvatar: asNullableString(avatar),
});

const normalizeFallbackUser = (fallbackUser) => ({
  id: normalizeUserId(fallbackUser?.id),
  name: asNullableString(fallbackUser?.full_name || fallbackUser?.name) || 'Tu',
  avatar: asNullableString(fallbackUser?.avatar_url || fallbackUser?.avatarUrl),
});

const getSessionUserInfo = (sessionUser) => {
  const metadata = sessionUser?.user_metadata || {};
  return {
    id: normalizeUserId(sessionUser?.id),
    name: asNullableString(metadata.full_name || metadata.name || sessionUser?.email),
    avatar: asNullableString(metadata.avatar_url || metadata.picture),
  };
};

const useCurrentUserProfile = (fallbackUser = null) => {
  const fallback = useMemo(
    () => normalizeFallbackUser(fallbackUser),
    [
      fallbackUser?.id,
      fallbackUser?.full_name,
      fallbackUser?.name,
      fallbackUser?.avatar_url,
      fallbackUser?.avatarUrl,
    ],
  );
  const [currentUserState, setCurrentUserState] = useState(() => buildUserState(fallback));

  useEffect(() => {
    let isMounted = true;

    const applySession = async (session) => {
      const sessionInfo = getSessionUserInfo(session?.user || null);
      const userId = sessionInfo.id || fallback.id;

      if (!userId) {
        if (isMounted) {
          setCurrentUserState(buildUserState(fallback));
        }
        return;
      }

      const baseName = sessionInfo.name || fallback.name || 'Tu';
      const baseAvatar = sessionInfo.avatar ?? fallback.avatar ?? null;
      const cachedProfile = PROFILE_CACHE.get(userId);
      if (cachedProfile) {
        if (isMounted) {
          setCurrentUserState(buildUserState({
            id: userId,
            name: cachedProfile.full_name || baseName,
            avatar: cachedProfile.avatar_url ?? baseAvatar,
          }));
        }
        return;
      }

      if (isMounted) {
        setCurrentUserState((prev) => {
          const next = buildUserState({ id: userId, name: baseName, avatar: baseAvatar });
          if (
            prev.currentUserId === next.currentUserId &&
            prev.currentUserName === next.currentUserName &&
            prev.currentUserAvatar === next.currentUserAvatar
          ) {
            return prev;
          }
          return next;
        });
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', userId)
          .maybeSingle();

        if (error || !isMounted) return;

        const fullName = asNullableString(data?.full_name);
        const avatarUrl = asNullableString(data?.avatar_url);
        PROFILE_CACHE.set(userId, { full_name: fullName, avatar_url: avatarUrl });
        setCurrentUserState(buildUserState({
          id: userId,
          name: fullName || baseName,
          avatar: avatarUrl ?? baseAvatar,
        }));
      } catch (_error) {
        // Keep session fallback if profile fetch fails.
      }
    };

    const bootstrapSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      await applySession(data?.session || null);
    };

    bootstrapSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession || null);
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [fallback]);

  return currentUserState;
};

export default useCurrentUserProfile;
