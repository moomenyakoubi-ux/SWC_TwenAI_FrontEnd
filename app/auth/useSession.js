import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const useSession = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error && isMounted) {
        setSession(data.session ?? null);
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    bootstrapSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
  };
};

export default useSession;
