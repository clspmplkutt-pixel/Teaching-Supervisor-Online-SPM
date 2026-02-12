import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (!user) {
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      const peopleId = user?.user_metadata?.people_id || user?.email || '';
      if (!peopleId) {
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const { data, error: queryError } = await supabase
          .from('tbl_Users')
          .select('*')
          .eq('people_id', peopleId)
          .maybeSingle();

        if (queryError) throw queryError;
        if (mounted) setProfile(data || null);
      } catch (err) {
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [user]);

  return { profile, loading, error };
};
