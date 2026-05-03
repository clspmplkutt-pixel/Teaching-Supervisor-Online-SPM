import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

/**
 * useNotifications
 * - ครู: นับแผนที่เปลี่ยนสถานะ (อนุมัติ/ตีกลับ/ประเมินแล้ว) ที่ยังไม่ได้เปิดดู
 *   → นับ plan_status IN ('2','3','4','5') ที่ teacher ยังไม่ได้ acknowledge
 * - กรรมการ: นับแผนที่รอประเมิน (ได้รับมอบหมาย แต่ยังไม่ได้ประเมิน)
 */

const getRoleId = (user) =>
  user?.level_id || user?.user_metadata?.role || user?.role || 'teacher';

const useNotifications = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    let mounted = true;
    const role = getRoleId(user);
    const peopleId = user?.user_metadata?.people_id || user?.people_id || '';

    const fetchCount = async () => {
      if (!peopleId) return;

      try {
        if (role === 'teacher' || role === 'directorschool') {
          // ครู/ผอ: นับแผนที่ถูกอนุมัติ/ตีกลับ/ประเมินครบแล้ว (status 2,3,4,5)
          // และยังไม่มี notify_read_at หรือยังอ่านไม่ครบ
          const { count: c } = await supabase
            .from('tbl_sendplan')
            .select('planid', { count: 'exact', head: true })
            .eq('people_id', peopleId)
            .in('plan_status', ['2', '3', '4', '5'])
            .eq('notify_read', false);

          if (mounted) setCount(c || 0);
        } else if (
          role === 'supervision' ||
          role === 'supervisor' ||
          role === 'chairman'
        ) {
          // กรรมการ: นับแผนที่ได้รับมอบหมายแต่ยังไม่ได้ประเมิน
          const { data: plans } = await supabase
            .from('tbl_sendplan')
            .select('planid')
            .or(
              `committee1.eq.${peopleId},committee2.eq.${peopleId},committee3.eq.${peopleId},committee4.eq.${peopleId},committee5.eq.${peopleId}`
            )
            .eq('plan_status', '2');

          if (!plans || plans.length === 0) {
            if (mounted) setCount(0);
            return;
          }

          const planIds = plans.map((p) => String(p.planid));
          const { count: scored } = await supabase
            .from('tbl_sendplan_score')
            .select('planid', { count: 'exact', head: true })
            .eq('supervision', peopleId)
            .in('planid', planIds);

          const pending = planIds.length - (scored || 0);
          if (mounted) setCount(Math.max(0, pending));
        } else {
          if (mounted) setCount(0);
        }
      } catch {
        if (mounted) setCount(0);
      }
    };

    fetchCount();
    // Refresh ทุก 2 นาที
    const interval = setInterval(fetchCount, 120000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [user]);

  return count;
};

export default useNotifications;
