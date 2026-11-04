import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

/**
 * useUserProfile
 * Safely resolves the logged-in user's profile:
 * - For `admin` / `root`: queries `tbl_user` and normalizes fields (`name`, `email`, `phone`, `level`)
 * - For `tbl_Users`: prefers unique primary key `user.id` when available, otherwise falls back to `.eq('people_id', ...).limit(1)`
 *   (preventing HTTP 406 `.maybeSingle()` crashes when duplicate `people_id` rows exist!)
 */
export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const roleId = user?.level_id || user?.user_metadata?.role || user?.role || '';
    const isAdminAccount = roleId === 'admin' || roleId === 'root';
    const peopleId = user?.user_metadata?.people_id || user?.people_id || user?.user || user?.email || '';

    setLoading(true);
    setError(null);
    try {
      if (isAdminAccount) {
        const adminUsername = user?.user || user?.email || peopleId;
        if (adminUsername) {
          const { data: adminRows } = await supabase
            .from('tbl_user')
            .select('*')
            .eq('user', adminUsername)
            .limit(1);
          const row = adminRows?.[0];
          if (row) {
            setProfile({
              ...row,
              people_id: row.user,
              name: row.name || user?.name || 'ผู้ดูแลระบบ',
              lastname: '',
              phone: row.telephone || '',
              level: roleId,
            });
            return;
          }
        }
        setProfile({
          people_id: adminUsername || 'admin',
          name: user?.name || user?.user_metadata?.name || 'ผู้ดูแลระบบ',
          lastname: '',
          level: roleId,
        });
        return;
      }

      // Standard personnel account in tbl_Users
      let row = null;
      const numericRowId = user?.id && /^\d+$/.test(String(user.id)) && String(user.id).length < 13 ? Number(user.id) : null;

      if (numericRowId) {
        const { data: byId, error: idErr } = await supabase
          .from('tbl_Users')
          .select('*')
          .eq('id', numericRowId)
          .limit(1);
        if (!idErr && byId && byId.length > 0) {
          row = byId[0];
        }
      }

      if (!row && peopleId) {
        let q = supabase.from('tbl_Users').select('*').eq('people_id', peopleId);
        if (roleId) {
          const { data: roleMatched } = await q.eq('level', roleId).limit(1);
          if (roleMatched && roleMatched.length > 0) {
            row = roleMatched[0];
          }
        }
        if (!row) {
          const { data: fallbackRows, error: fbErr } = await supabase
            .from('tbl_Users')
            .select('*')
            .eq('people_id', peopleId)
            .order('id', { ascending: false })
            .limit(1);
          if (fbErr) throw fbErr;
          row = fallbackRows?.[0] || null;
        }
      }

      setProfile(row);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return { profile, loading, error, reloadProfile: loadProfile };
};
