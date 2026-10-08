import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useNotifications from '../hooks/useNotifications';

const getRoleId = (user) =>
  user?.level_id || user?.user_metadata?.role || user?.role || 'teacher';

const BottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const notifCount = useNotifications();

  if (!user) return null;

  const roleId = getRoleId(user);
  const currentPath = location.pathname.toLowerCase();

  // Navigation Items according to User Role
  let navItems = [];

  if (roleId === 'teacher') {
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
        icon: 'fa-solid fa-cloud-arrow-up',
        isActive: currentPath === '/sendplan',
      },
      {
        path: '/statusplan',
        label: 'แผนของฉัน',
        icon: 'fa-solid fa-clock-rotate-left',
        badge: notifCount > 0 ? notifCount : null,
        isActive: currentPath === '/statusplan',
      },
      {
        path: '/statusplan_pass',
        label: 'ผ่านอนุมัติ',
        icon: 'fa-solid fa-award',
        isActive: currentPath === '/statusplan_pass' || currentPath.includes('view_scoring'),
      },
      {
        path: '/editprofile',
        label: 'โปรไฟล์',
        icon: 'fa-solid fa-user-gear',
        isActive: currentPath === '/editprofile' || currentPath === '/chgpasswd',
      },
    ];
  } else if (roleId === 'directorschool' || roleId === 'admin_school') {
    navItems = [
      {
        path: '/',
        label: 'แดชบอร์ด',
        icon: 'fa-solid fa-gauge-high',
        isActive: currentPath === '/' || currentPath === '/info',
      },
      {
        path: '/Plan_Check',
        label: 'ตรวจแผน',
        icon: 'fa-solid fa-list-check',
        badge: notifCount > 0 ? notifCount : null,
        isActive: currentPath === '/plan_check' || currentPath === '/appointment',
      },
      {
        path: '/statusplan_pass',
        label: 'ผ่านอนุมัติ',
        icon: 'fa-solid fa-school-circle-check',
        isActive: currentPath === '/statusplan_pass' || currentPath.includes('view_scoring'),
      },
      {
        path: '/userteacher',
        label: 'ครูในสังกัด',
        icon: 'fa-solid fa-users',
        isActive: currentPath === '/userteacher' || currentPath === '/nominate_evaluator',
      },
      {
        path: '/editprofile',
        label: 'โปรไฟล์',
        icon: 'fa-solid fa-user-gear',
        isActive: currentPath === '/editprofile' || currentPath === '/chgpasswd',
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
        badge: notifCount > 0 ? notifCount : null,
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
        isActive: currentPath === '/editprofile' || currentPath === '/chgpasswd',
      },
    ];
  } else {
    // Supervisor, District Director, Admin
    navItems = [
      {
        path: '/',
        label: 'ศูนย์นิเทศ',
        icon: 'fa-solid fa-landmark',
        isActive: currentPath === '/' || currentPath === '/info',
      },
      {
        path: '/supervision_summary',
        label: 'รายงานผล',
        icon: 'fa-solid fa-chart-pie',
        isActive: currentPath === '/supervision_summary',
      },
      {
        path: '/admin_monitor',
        label: 'ติดตามระบบ',
        icon: 'fa-solid fa-laptop-file',
        isActive: currentPath === '/admin_monitor',
      },
      {
        path: '/editprofile',
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
          height: 64px;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-top: 1px solid #e2e8f0;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
          z-index: 1040;
          justify-content: space-around;
          align-items: center;
          padding: 0 4px;
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: flex;
          }
          /* Extra bottom padding on mobile so content is never covered */
          .content-wrapper {
            padding-bottom: 70px !important;
          }
          .main-footer {
            margin-bottom: 64px !important;
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
          height: 100%;
          color: #64748b;
          text-decoration: none;
          font-size: 11px;
          position: relative;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        .bottom-nav-item:active {
          transform: scale(0.92);
        }

        .bottom-nav-item.active {
          color: #0284c7;
          font-weight: 700;
        }

        .bottom-nav-item.active .bottom-nav-icon-wrapper {
          background: #e0f2fe;
          color: #0284c7;
          border-radius: 14px;
        }

        .bottom-nav-icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 28px;
          margin-bottom: 2px;
          transition: all 0.2s ease;
        }

        .bottom-nav-icon-wrapper i {
          font-size: 16px;
        }

        .bottom-nav-badge {
          position: absolute;
          top: -2px;
          right: 2px;
          background: #ef4444;
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 2px solid #fff;
        }

        .bottom-nav-label {
          letter-spacing: -0.2px;
          line-height: 1.1;
        }
      `}</style>

      <nav className="mobile-bottom-nav" aria-label="แถบเมนูด้านล่างสำหรับมือถือ">
        {navItems.map((item, idx) => (
          <Link
            key={idx}
            to={item.path}
            className={`bottom-nav-item ${item.isActive ? 'active' : ''}`}
          >
            <div className="bottom-nav-icon-wrapper">
              <i className={item.icon}></i>
              {item.badge && <span className="bottom-nav-badge">{item.badge}</span>}
            </div>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
};

export default BottomNav;
