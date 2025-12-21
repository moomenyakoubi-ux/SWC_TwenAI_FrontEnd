import { supabase } from '../lib/supabase';

export const signUp = (email, password, options) =>
  supabase.auth.signUp({ email, password, options });

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = (options) => supabase.auth.signOut(options);
