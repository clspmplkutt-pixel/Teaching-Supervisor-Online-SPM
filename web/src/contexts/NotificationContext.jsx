import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';

const NotificationContext = createContext(null);

const getRoleId = (user, profile) =>
  profile?.level ||
  profile?.level_id ||
  user?.level_id ||
  user?.user_metadata?.role ||
  user?.role ||
  'teacher';

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { profile } = useUserProfile();

  const [details, setDetails] = useState({
    totalCount: 0,
    teacherRejectedCount: 0,
    teacherNeedClipCount: 0,
    directorPendingCount: 0,
    committeePendingCount: 0,
    adminPendingUsersCount: 0,
    adminPendingEvaluatorsCount: 0,
  });

  const roleId = getRoleId(user, profile);
  const peopleId = profile?.people_id || user?.user_metadata?.people_id || user?.people_id || '';
  const schoolCode = profile?.school || user?.user_metadata?.school || user?.school || '';

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setDetails({
        totalCount: 0,
        teacherRejectedCount: 0,
        teacherNeedClipCount: 0,
        directorPendingCount: 0,
        committeePendingCount: 0,
        adminPendingUsersCount: 0,
        adminPendingEvaluatorsCount: 0,
      });
      return;
    }

    try {
      let teacherRejectedCount = 0;
      let teacherNeedClipCount = 0;
      let directorPendingCount = 0;
      let committeePendingCount = 0;
      let adminPendingUsersCount = 0;
      let adminPendingEvaluatorsCount = 0;

      const promises = [];

      // 1. Teacher / HeadDepartment own plans needing action (status 3 revision or status 2 clip)
      if ((roleId === 'teacher' || roleId === 'headdepartment') && peopleId) {
        promises.push(
          supabase
            .from('tbl_sendplan')
            .select('plan_status')
            .eq('people_id', peopleId)
            .in('plan_status', ['2', '3'])
            .then(({ data }) => {
              (data || []).forEach((p) => {
                if (String(p.plan_status) === '3') teacherRejectedCount += 1;
                if (String(p.plan_status) === '2') teacherNeedClipCount += 1;
              });
            })
        );
      }

      // 2. School Director pending approvals (status 1 or 4)
      if (roleId === 'directorschool') {
        let q = supabase
          .from('tbl_sendplan')
          .select('planid', { count: 'exact', head: true })
          .in('plan_status', ['1', '4']);
        if (schoolCode) q = q.eq('school_code', schoolCode);
        promises.push(
          q.then(({ count }) => {
            directorPendingCount = count || 0;
          })
        );
      }

      // 3. Committee / Evaluator workload (only plans with clip attached status 5 or 6!)
      // A slot is pending when committeeN === me and date_scoringN is still empty.
      // (Previously counted raw score rows — one row per policy item — which made the badge drop to 0.)
      if (peopleId && roleId !== 'admin' && roleId !== 'root') {
        const slots = [1, 2, 3, 4, 5];
        const me = String(peopleId);
        promises.push(
          supabase
            .from('tbl_sendplan')
            .select(
              `planid, ${slots.map((n) => `committee${n}, date_scoring${n}`).join(', ')}`
            )
            .or(slots.map((n) => `committee${n}.eq.${peopleId}`).join(','))
            .in('plan_status', ['5', '6'])
            .then(async ({ data: assigned }) => {
              const isBlank = (v) => v === null || v === undefined || String(v).trim() === '';
              const candidates = (assigned || []).filter((p) =>
                slots.some((n) => String(p[`committee${n}`] || '') === me && isBlank(p[`date_scoring${n}`]))
              );
              if (candidates.length === 0) return;
              // Double-check against actual score rows (legacy data may lack date_scoringN)
              const { data: myScores } = await supabase
                .from('tbl_sendplan_score')
                .select('planid')
                .eq('supervision', me)
                .in('planid', candidates.map((p) => String(p.planid)));
              const scoredSet = new Set((myScores || []).map((s) => String(s.planid)));
              committeePendingCount = candidates.filter((p) => !scoredSet.has(String(p.planid))).length;
            })
        );
      }

      // 4. Admin & School Admin pending user confirmations & evaluator nominations
      if (roleId === 'admin' || roleId === 'root' || roleId === 'admin_school') {
        let userQ = supabase
          .from('tbl_Users')
          .select('id', { count: 'exact', head: true })
          .eq('register_isConfirm', '0');
        if (roleId === 'admin_school' && schoolCode) {
          userQ = userQ.eq('school', schoolCode);
        }
        promises.push(
          userQ.then(({ count }) => {
            adminPendingUsersCount = count || 0;
          })
        );

        if (roleId === 'admin' || roleId === 'root') {
          promises.push(
            supabase
              .from('tbl_EvaluatorNominations')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'pending')
              .then(({ count }) => {
                adminPendingEvaluatorsCount = count || 0;
              })
          );
        }
      }

      await Promise.all(promises);

      let primaryBadge = 0;
      if (roleId === 'teacher') {
        primaryBadge = teacherRejectedCount + teacherNeedClipCount + committeePendingCount;
      } else if (roleId === 'directorschool') {
        primaryBadge = directorPendingCount + committeePendingCount;
      } else if (roleId === 'admin' || roleId === 'root' || roleId === 'admin_school') {
        primaryBadge = adminPendingUsersCount + adminPendingEvaluatorsCount;
      } else {
        primaryBadge = committeePendingCount + teacherRejectedCount;
      }

      setDetails({
        totalCount: primaryBadge,
        teacherRejectedCount,
        teacherNeedClipCount,
        directorPendingCount,
        committeePendingCount,
        adminPendingUsersCount,
        adminPendingEvaluatorsCount,
      });
    } catch (err) {
      console.warn('NotificationContext refresh warning:', err);
    }
  }, [peopleId, roleId, schoolCode, user]);

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 120000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const contextValue = useMemo(
    () => ({
      ...details,
      roleId,
      refreshNotifications,
    }),
    [details, refreshNotifications, roleId]
  );

  return <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>;
};

export const useNotificationContext = () => useContext(NotificationContext);

export default NotificationContext;
