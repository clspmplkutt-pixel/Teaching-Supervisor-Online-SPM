import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationContext } from '../contexts/NotificationContext';

const getRoleId = (user) =>
  user?.level_id || user?.user_metadata?.role || user?.role || 'teacher';

const BottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const notif = useNotificationContext();

  if (!user) return null;

  const roleId = getRoleId(user);
  const currentPath = location.pathname.toLowerCase();
  const isAdminAccount = roleId === 'admin' || roleId === 'root';

  let navItems = [];

  if (roleId === 'teacher' || roleId === 'headdepartment') {
    const planBadge = (notif?.teacherRejectedCount || 0) + (notif?.teacherNeedClipCount || 0);
    navItems = [
      {
        path: '/',
        label: 'หน้าหลัก',
        icon: 'fa-solid fa-house',
        isActive: currentPath === '/' || currentPath === '/info',
      },
      {
        path: '/sendplan',
        label: 'ส่งแผน',
        icon: 'fa-solid fa-file-circle-plus',
        isActive: currentPath === '/sendplan',
      },
      {
        path: '/statusplan',
        label: 'แผน & คลิป',
        icon: 'fa-solid fa-bars-progress',
        badge: planBadge > 0 ? planBadge : null,
        isActive:
          currentPath === '/statusplan' ||
          currentPath === '/statusplan_clip' ||
          currentPath === '/send_clip',
      },
      roleId === 'headdepartment' || user?.is_evaluator || user?.user_metadata?.is_evaluator
        ? {
            path: '/Plan_Check',
            label: 'ตรวจนิเทศ',
            icon: 'fa-solid fa-star-half-stroke',
            badge: notif?.committeePendingCount > 0 ? notif.committeePendingCount : null,
            isActive: currentPath === '/plan_check' || currentPath === '/plan_scoring',
          }
        : {
            path: '/statusplan_pass',
            label: 'ผลประเมิน',
            icon: 'fa-solid fa-award',
            isActive: currentPath === '/statusplan_pass' || currentPath.includes('view_scoring'),
          },
      {
        path: '/editprofile',
        label: 'โปรไฟล์',
        icon: 'fa-solid fa-user-gear',
        isActive:
          currentPath === '/editprofile' ||
          currentPath === '/chgpasswd' ||
          currentPath === '/editsignature',
      },
    ];
  } else if (roleId === 'directorschool') {
    navItems = [
      {
        path: '/',
        label: 'แดชบอร์ด',
        icon: 'fa-solid fa-gauge-high',
        isActive: currentPath === '/' || currentPath === '/info',
      },
      {
        path: '/Plan_Check',
        label: 'ตรวจอนุมัติ',
        icon: 'fa-solid fa-file-signature',
        badge: notif?.directorPendingCount > 0 ? notif.directorPendingCount : null,
        isActive: currentPath === '/plan_check' || currentPath === '/appointment',
      },
      {
        path: '/nominate_evaluator',
        label: 'ตั้งผู้นิเทศ',
        icon: 'fa-solid fa-user-plus',
        isActive: currentPath === '/nominate_evaluator',
      },
      {
        path: '/statusplan_pass',
        label: 'คลังแผน รร.',
        icon: 'fa-solid fa-folder-open',
        isActive: currentPath === '/statusplan_pass' || currentPath.includes('view_scoring'),
      },
      {
        path: '/editprofile',
        label: 'โปรไฟล์',
        icon: 'fa-solid fa-user-gear',
        isActive: currentPath === '/editprofile' || currentPath === '/editsignature',
      },
    ];
  } else if (roleId === 'admin_school') {
    navItems = [
      {
        path: '/',
        label: 'แดชบอร์ด',
        icon: 'fa-solid fa-gauge-high',
        isActive: currentPath === '/' || currentPath === '/info',
      },
      {
        path: '/confirmUser',
        label: 'อนุมัติครู',
        icon: 'fa-solid fa-user-check',
        badge: notif?.adminPendingUsersCount > 0 ? notif.adminPendingUsersCount : null,
        isActive: currentPath === '/confirmuser',
      },
      {
        path: '/userteacher',
        label: 'ทะเบียนครู',
        icon: 'fa-solid fa-users',
        isActive: currentPath === '/userteacher',
      },
      {
        path: '/reset_user_password',
        label: 'รีเซ็ตรหัส',
        icon: 'fa-solid fa-unlock-keyhole',
        isActive: currentPath === '/reset_user_password',
      },
      {
        path: '/editprofile',
        label: 'โปรไฟล์',
        icon: 'fa-solid fa-user-gear',
        isActive: currentPath === '/editprofile',
      },
    ];
  } else if (['supervision', 'chairman'].includes(roleId)) {
    navItems = [
      {
        path: '/',
        label: 'หน้าหลัก',
        icon: 'fa-solid fa-house',
        isActive: currentPath === '/' || currentPath === '/info',
      },
      {
        path: '/Plan_Check',
        label: 'ประเมินแผน',
        icon: 'fa-solid fa-pen-ruler',
        badge: notif?.committeePendingCount > 0 ? notif.committeePendingCount : null,
        isActive: currentPath === '/plan_check' || currentPath === '/plan_scoring',
      },
      {
        path: '/statusplan_pass',
        label: 'ผลการประเมิน',
        icon: 'fa-solid fa-square-poll-vertical',
        isActive: currentPath === '/statusplan_pass' || currentPath.includes('view_scoring'),
      },
      {
        path: '/editprofile',
        label: 'โปรไฟล์',
        icon: 'fa-solid fa-user-gear',
        isActive: currentPath === '/editprofile' || currentPath === '/editsignature',
      },
    ];
  } else {
    // Supervisor, District Director, Admin, Root
    navItems = [
      {
        path: '/',
        label: 'ศูนย์นิเทศ',
        icon: 'fa-solid fa-landmark',
        isActive: currentPath === '/' || currentPath === '/info',
      },
      {
        path: '/admin_monitor',
        label: 'กำกับติดตาม',
        icon: 'fa-solid fa-satellite-dish',
        isActive: currentPath === '/admin_monitor',
      },
      roleId === 'supervisor'
        ? {
            path: '/Plan_Check',
            label: 'ตรวจประเมิน',
            icon: 'fa-solid fa-clipboard-list',
            badge: notif?.committeePendingCount > 0 ? notif.committeePendingCount : null,
            isActive: currentPath === '/plan_check' || currentPath === '/plan_scoring',
          }
        : isAdminAccount
          ? {
              path: '/confirmUser',
              label: 'รออนุมัติ',
              icon: 'fa-solid fa-user-check',
              badge: notif?.totalCount > 0 ? notif.totalCount : null,
              isActive: currentPath === '/confirmuser' || currentPath === '/approve_evaluator',
            }
          : {
              path: '/supervision_summary',
              label: 'รายงานสรุป',
              icon: 'fa-solid fa-chart-pie',
              isActive: currentPath === '/supervision_summary',
            },
      {
        path: isAdminAccount ? '/profile' : '/editprofile',
        label: 'โปรไฟล์',
        icon: 'fa-solid fa-user-gear',
        isActive: currentPath === '/editprofile' || currentPath === '/profile',
      },
    ];
  }

  return (
    <>
      <style>{`
        .mobile-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          min-height: 64px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-top: 1px solid #e2e8f0;
          box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.06);
          z-index: 1040;
          justify-content: space-around;
          align-items: center;
          padding: 4px 4px calc(4px + env(safe-area-inset-bottom, 0px));
        }

        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: flex;
          }
          .content-wrapper {
            padding-bottom: 84px !important;
          }
          .main-footer {
            margin-bottom: 68px !important;
          }
        }

        @media print {
          .mobile-bottom-nav {
            display: none !important;
          }
        }

        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          height: 56px;
          color: #64748b;
          text-decoration: none !important;
          font-size: 11px;
          position: relative;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .bottom-nav-item.active {
          color: #4f46e5;
          font-weight: 700;
        }

        .bottom-nav-icon-wrap {
          position: relative;
          width: 38px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          font-size: 16px;
          margin-bottom: 2px;
          transition: background 0.2s ease;
        }

        .bottom-nav-item.active .bottom-nav-icon-wrap {
          background: #eef2ff;
          color: #4f46e5;
        }

        .bottom-nav-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: #fff;
          font-size: 9.5px;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 99px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #fff;
        }
      `}</style>

      <nav className="mobile-bottom-nav no-print" aria-label="เมนูนำทางมือถือ">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`bottom-nav-item ${item.isActive ? 'active' : ''}`}
          >
            <div className="bottom-nav-icon-wrap">
              <i className={item.icon}></i>
              {item.badge && (
                <span className="bottom-nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
              )}
            </div>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
};

export default BottomNav;
