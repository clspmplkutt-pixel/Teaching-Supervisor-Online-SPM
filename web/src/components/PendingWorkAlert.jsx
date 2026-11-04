import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationContext } from '../contexts/NotificationContext';

/**
 * PendingWorkAlert - Consumes NotificationContext directly (0 duplicate DB queries!)
 * Surfaces contextual action banners across all roles when urgent items await attention.
 */
const PendingWorkAlert = () => {
  const { user } = useAuth();
  const notif = useNotificationContext();
  const location = useLocation();
  const [isDismissed, setIsDismissed] = useState(false);

  const sessionKey = `dismissed_pending_alert_${user?.id || user?.email || 'guest'}`;

  useEffect(() => {
    if (sessionStorage.getItem(sessionKey) === 'true') {
      setIsDismissed(true);
    }
  }, [sessionKey]);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem(sessionKey, 'true');
  };

  if (!notif || isDismissed) return null;

  // Hide on Home Dashboard (which already renders rich action cards) or when already on the target page
  const p = location.pathname.toLowerCase();
  if (
    p === '/' ||
    p === '/info' ||
    p.startsWith('/plan_check') ||
    p.startsWith('/plan_scoring') ||
    p.startsWith('/statusplan') ||
    p.startsWith('/confirmuser') ||
    p.startsWith('/approve_evaluator')
  ) {
    return null;
  }

  const {
    roleId,
    directorPendingCount,
    committeePendingCount,
    teacherRejectedCount,
    teacherNeedClipCount,
    adminPendingUsersCount,
    adminPendingEvaluatorsCount,
  } = notif;

  const renderBanner = ({ accent, bg, textColor, icon, title, desc, linkTo, linkLabel, btnBg }) => (
    <div
      className="alert shadow-sm border-0 mb-3 no-print"
      style={{
        background: bg,
        borderLeft: `4px solid ${accent}`,
        borderRadius: '12px',
        color: textColor,
      }}
      role="alert"
    >
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center">
          <span
            className="d-flex align-items-center justify-content-center text-white rounded-circle mr-3 flex-shrink-0"
            style={{ width: '36px', height: '36px', fontSize: '16px', backgroundColor: accent }}
          >
            <i className={`fa-solid ${icon}`}></i>
          </span>
          <div>
            <strong style={{ fontSize: '0.93rem' }}>{title}</strong>
            <div style={{ fontSize: '0.84rem', opacity: 0.92 }}>{desc}</div>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link
            to={linkTo}
            className="btn btn-sm text-white font-weight-bold shadow-sm px-3"
            style={{ backgroundColor: btnBg || accent, borderRadius: '8px' }}
          >
            {linkLabel}
          </Link>
          <button
            type="button"
            className="btn btn-link text-muted p-1"
            onClick={handleDismiss}
            title="ซ่อนการแจ้งเตือนชั่วคราว"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    </div>
  );

  if (roleId === 'directorschool' && directorPendingCount > 0) {
    return renderBanner({
      accent: '#d97706',
      bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
      textColor: '#92400e',
      icon: 'fa-file-signature',
      title: 'มีแผนการจัดการเรียนรู้รอการตรวจอนุมัติ',
      desc: `พบ ${directorPendingCount} แผนที่รอการพิจารณาอนุมัติและแต่งตั้งคณะกรรมการนิเทศ`,
      linkTo: '/Plan_Check',
      linkLabel: 'ตรวจอนุมัติแผน',
    });
  }

  if (teacherRejectedCount > 0) {
    return renderBanner({
      accent: '#dc2626',
      bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
      textColor: '#991b1b',
      icon: 'fa-rotate-left',
      title: 'มีแผนการสอนส่งกลับให้ปรับปรุงแก้ไข',
      desc: `พบ ${teacherRejectedCount} แผนที่ผู้อำนวยการให้ข้อเสนอแนะเพื่อปรับปรุง`,
      linkTo: '/statusplan?filter=3',
      linkLabel: 'ดูข้อเสนอแนะและแก้ไข',
    });
  }

  if (teacherNeedClipCount > 0) {
    return renderBanner({
      accent: '#0284c7',
      bg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      textColor: '#075985',
      icon: 'fa-video',
      title: 'แผนการสอนได้รับอนุมัติแล้ว • พร้อมแนบคลิปการสอน',
      desc: `มี ${teacherNeedClipCount} แผนที่รอแนบลิงก์คลิปวิดีโอและบันทึกหลังสอนเพื่อให้กรรมการประเมิน`,
      linkTo: '/statusplan?filter=2',
      linkLabel: 'แนบคลิปการสอน',
    });
  }

  if (committeePendingCount > 0) {
    return renderBanner({
      accent: '#4f46e5',
      bg: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
      textColor: '#3730a3',
      icon: 'fa-clipboard-user',
      title: 'ภาระงานคณะกรรมการนิเทศรอดำเนินการ',
      desc: `มี ${committeePendingCount} แผนการสอนที่แนบคลิปแล้วและรอการให้คะแนนประเมินจากท่าน`,
      linkTo: '/Plan_Check',
      linkLabel: 'เข้าสู่คิวประเมิน',
    });
  }

  if (adminPendingUsersCount > 0) {
    return renderBanner({
      accent: '#059669',
      bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
      textColor: '#065f46',
      icon: 'fa-user-check',
      title: 'มีผู้สมัครสมาชิกใหม่รออนุมัติสิทธิ์',
      desc: `พบ ${adminPendingUsersCount} บัญชีผู้ใช้งานที่รอการตรวจสอบและยืนยันสิทธิ์เข้าสู่ระบบ`,
      linkTo: '/confirmUser',
      linkLabel: 'ตรวจสอบรายชื่อ',
    });
  }

  if (adminPendingEvaluatorsCount > 0) {
    return renderBanner({
      accent: '#7c3aed',
      bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
      textColor: '#5b21b6',
      icon: 'fa-award',
      title: 'มีรายชื่อเสนอแต่งตั้งครูผู้นิเทศรออนุมัติ',
      desc: `พบ ${adminPendingEvaluatorsCount} รายการเสนอชื่อจากสถานศึกษารอการอนุมัติระดับเขต`,
      linkTo: '/approve_evaluator',
      linkLabel: 'พิจารณาอนุมัติ',
    });
  }

  return null;
};

export default PendingWorkAlert;
