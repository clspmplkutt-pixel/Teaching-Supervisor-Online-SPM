import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';

const PendingWorkAlert = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const location = useLocation();

  const [directorPendingCount, setDirectorPendingCount] = useState(0);
  const [committeePendingCount, setCommitteePendingCount] = useState(0);
  const [teacherRejectedCount, setTeacherRejectedCount] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  const roleId = profile?.level || profile?.level_id || user?.user_metadata?.role || user?.role || 'teacher';
  const peopleId = profile?.people_id || user?.user_metadata?.people_id || user?.people_id || '';
  const schoolCode = profile?.school || user?.user_metadata?.school || '';

  // Don't show if user is already in the evaluation / status page
  const isTargetPage =
    location.pathname.startsWith('/Plan_Check') ||
    location.pathname.startsWith('/statusplan') ||
    location.pathname.startsWith('/Plan_scoring');

  useEffect(() => {
    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem(`dismissed_pending_alert_${peopleId}`);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, [peopleId]);

  useEffect(() => {
    if (!peopleId) return;

    let mounted = true;

    const checkPendingWork = async () => {
      try {
        // 1. Director check
        if (roleId === 'directorschool' && schoolCode) {
          const { count } = await supabase
            .from('tbl_sendplan')
            .select('planid', { count: 'exact', head: true })
            .eq('school_code', schoolCode)
            .in('plan_status', ['1', '4']);

          if (mounted) setDirectorPendingCount(count || 0);
        }

        // 2. Committee / Evaluator check (any role can be a committee)
        const { data: assignedPlans } = await supabase
          .from('tbl_sendplan')
          .select('planid')
          .or(`committee1.eq.${peopleId},committee2.eq.${peopleId},committee3.eq.${peopleId},committee4.eq.${peopleId},committee5.eq.${peopleId}`)
          .in('plan_status', ['2', '5', '6']);

        if (assignedPlans && assignedPlans.length > 0) {
          const planIds = assignedPlans.map((p) => String(p.planid));
          const { count: scoredCount } = await supabase
            .from('tbl_sendplan_score')
            .select('planid', { count: 'exact', head: true })
            .eq('supervision', peopleId)
            .in('planid', planIds);

          const pending = planIds.length - (scoredCount || 0);
          if (mounted) setCommitteePendingCount(Math.max(0, pending));
        }

        // 3. Teacher check for returned plans (status 3)
        if (roleId === 'teacher' || roleId === 'headdepartment') {
          const { count: rejCount } = await supabase
            .from('tbl_sendplan')
            .select('planid', { count: 'exact', head: true })
            .eq('people_id', peopleId)
            .eq('plan_status', '3');

          if (mounted) setTeacherRejectedCount(rejCount || 0);
        }
      } catch (err) {
        console.warn('PendingWorkAlert check error:', err);
      }
    };

    checkPendingWork();

    return () => {
      mounted = false;
    };
  }, [peopleId, roleId, schoolCode]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (peopleId) {
      sessionStorage.setItem(`dismissed_pending_alert_${peopleId}`, 'true');
    }
  };

  if (isDismissed || isTargetPage) return null;

  // Render Director Alert
  if (roleId === 'directorschool' && directorPendingCount > 0) {
    return (
      <div
        className="alert shadow-sm border-0 mb-3"
        style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          borderLeft: '5px solid #f59e0b',
          borderRadius: '8px',
          color: '#92400e',
        }}
        role="alert"
      >
        <div className="d-flex align-items-center justify-content-between flex-wrap" style={{ gap: '10px' }}>
          <div className="d-flex align-items-center">
            <span
              className="d-flex align-items-center justify-content-center bg-warning text-dark rounded-circle mr-3"
              style={{ width: '38px', height: '38px', fontSize: '18px' }}
            >
              <i className="fa-solid fa-bell"></i>
            </span>
            <div>
              <strong style={{ fontSize: '15px' }}>แจ้งเตือนสำหรับผู้อำนวยการโรงเรียน:</strong>
              <div style={{ fontSize: '13px', color: '#b45309' }}>
                มีแผนการจัดการเรียนรู้รอการตรวจอนุมัติและแต่งตั้งกรรมการ{' '}
                <span className="badge badge-warning text-dark font-weight-bold ml-1">{directorPendingCount} แผน</span>
              </div>
            </div>
          </div>
          <div className="d-flex align-items-center" style={{ gap: '8px' }}>
            <Link to="/Plan_Check" className="btn btn-warning btn-sm font-weight-bold text-dark shadow-sm">
              <i className="fa-solid fa-file-signature mr-1"></i> ตรวจอนุมัติทันที
            </Link>
            <button
              type="button"
              className="btn btn-link text-muted p-1"
              onClick={handleDismiss}
              title="ปิดการแจ้งเตือนชั่วคราว"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Committee Alert
  if (committeePendingCount > 0) {
    return (
      <div
        className="alert shadow-sm border-0 mb-3"
        style={{
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          borderLeft: '5px solid #8b5cf6',
          borderRadius: '8px',
          color: '#5b21b6',
        }}
        role="alert"
      >
        <div className="d-flex align-items-center justify-content-between flex-wrap" style={{ gap: '10px' }}>
          <div className="d-flex align-items-center">
            <span
              className="d-flex align-items-center justify-content-center text-white rounded-circle mr-3"
              style={{ width: '38px', height: '38px', fontSize: '18px', backgroundColor: '#8b5cf6' }}
            >
              <i className="fa-solid fa-clipboard-user"></i>
            </span>
            <div>
              <strong style={{ fontSize: '15px' }}>แจ้งเตือนภาระงานคณะกรรมการนิเทศ:</strong>
              <div style={{ fontSize: '13px', color: '#6d28d9' }}>
                ท่านได้รับมอบหมายให้ประเมินแผนการจัดการเรียนรู้ที่ยังรอการประเมิน{' '}
                <span className="badge badge-primary font-weight-bold ml-1" style={{ backgroundColor: '#8b5cf6' }}>
                  {committeePendingCount} แผน
                </span>
              </div>
            </div>
          </div>
          <div className="d-flex align-items-center" style={{ gap: '8px' }}>
            <Link to="/Plan_Check" className="btn btn-sm text-white font-weight-bold shadow-sm" style={{ backgroundColor: '#7c3aed' }}>
              <i className="fa-solid fa-pen-to-square mr-1"></i> ประเมินแผนการสอน
            </Link>
            <button
              type="button"
              className="btn btn-link text-muted p-1"
              onClick={handleDismiss}
              title="ปิดการแจ้งเตือนชั่วคราว"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Teacher Rejected Plan Alert
  if (teacherRejectedCount > 0) {
    return (
      <div
        className="alert shadow-sm border-0 mb-3"
        style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          borderLeft: '5px solid #ef4444',
          borderRadius: '8px',
          color: '#991b1b',
        }}
        role="alert"
      >
        <div className="d-flex align-items-center justify-content-between flex-wrap" style={{ gap: '10px' }}>
          <div className="d-flex align-items-center">
            <span
              className="d-flex align-items-center justify-content-center bg-danger text-white rounded-circle mr-3"
              style={{ width: '38px', height: '38px', fontSize: '18px' }}
            >
              <i className="fa-solid fa-triangle-exclamation"></i>
            </span>
            <div>
              <strong style={{ fontSize: '15px' }}>แจ้งเตือนสำหรับครูผู้สอน:</strong>
              <div style={{ fontSize: '13px', color: '#b91c1c' }}>
                มีแผนการจัดการเรียนรู้ถูกส่งกลับให้แก้ไขปรับปรุง{' '}
                <span className="badge badge-danger font-weight-bold ml-1">{teacherRejectedCount} แผน</span>
              </div>
            </div>
          </div>
          <div className="d-flex align-items-center" style={{ gap: '8px' }}>
            <Link to="/statusplan" className="btn btn-danger btn-sm font-weight-bold shadow-sm">
              <i className="fa-solid fa-wrench mr-1"></i> ดูรายการที่ต้องแก้ไข
            </Link>
            <button
              type="button"
              className="btn btn-link text-muted p-1"
              onClick={handleDismiss}
              title="ปิดการแจ้งเตือนชั่วคราว"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PendingWorkAlert;
