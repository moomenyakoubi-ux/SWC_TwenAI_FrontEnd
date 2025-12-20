import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import useSession from '../auth/useSession';

const isUuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const useProfile = () => {
  const { user } = useSession();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return { data: null, error: null };
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError);
      setLoading(false);
      return { data: null, error: fetchError };
    }

    if (!data) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ id: user.id, email: user.email });

      if (insertError) {
        setError(insertError);
        setLoading(false);
        return { data: null, error: insertError };
      }

      const { data: refetched, error: refetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (refetchError) {
        setError(refetchError);
        setLoading(false);
        return { data: null, error: refetchError };
      }

      setProfile(refetched ?? null);
      setLoading(false);
      return { data: refetched ?? null, error: null };
    }

    setProfile(data);
    setLoading(false);
    return { data, error: null };
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile, user?.id]);

  const updateProfile = useCallback(
    async (patch = {}) => {
      if (!user) {
        const missingUserError = new Error('Utente non autenticato.');
        setError(missingUserError);
        return { error: missingUserError };
      }

      const updates = {};
      let trimmedFullName = null;

      if (patch.full_name !== undefined && patch.full_name !== null) {
        const fullNameValue = String(patch.full_name);
        trimmedFullName = fullNameValue.trim();
        updates.full_name = trimmedFullName;
      }

      if (patch.language !== undefined && patch.language !== null) {
        updates.language = String(patch.language).trim();
      }

      if (patch.bio !== undefined) {
        const bioValue = patch.bio === null ? null : String(patch.bio).trim();
        updates.bio = bioValue === '' ? null : bioValue;
      }

      if (!isUuid(user.id)) {
        const invalidUserError = new Error('User ID non valido.');
        setError(invalidUserError);
        return { error: invalidUserError };
      }

      if (!Object.keys(updates).length) {
        return { error: null };
      }

      setLoading(true);
      setError(null);

      console.log('UPDATE PROFILE payload:', {
        userId: user?.id,
        full_name: trimmedFullName,
        language: updates.language,
        bio: updates.bio,
      });

      const { data, error: updateError, status, count } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select('*')
        .single();

      console.log('UPDATE PROFILE result:', { status, count, data, error: updateError });

      if (updateError) {
        setError(updateError);
        setLoading(false);
        throw updateError;
      }

      if (!data) {
        const missingRowError = new Error('Update non ha restituito la riga (0 righe aggiornate o RLS).');
        setError(missingRowError);
        setLoading(false);
        throw missingRowError;
      }

      setProfile(data);
      setLoading(false);
      return { data, error: null };
    },
    [user],
  );

  return {
    profile,
    loading,
    error,
    refresh: fetchProfile,
    updateProfile,
  };
};

export default useProfile;
