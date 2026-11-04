import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationContext } from '../contexts/NotificationContext';
import { roleLabels } from '../config/roleModules';
import { useUserProfile } from '../hooks/useUserProfile';

const formatThaiDate = (date) => {
  const d = new Date(date);
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
};

const getRoleId = (user) =>
  user?.level_id || user?.user_metadata?.role || user?.role || 'teacher';

const Header = () => {
  const { user, logout } = useAuth();
  const { profile } = useUserProfile();
  const notif = useNotificationContext();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  const roleId = getRoleId(user);
  const isAdminAccount = roleId === 'admin' || roleId === 'root';
  const isEvaluator = Boolean(user?.is_evaluator || user?.user_metadata?.is_evaluator);

  const displayName = profile?.name
    ? `${profile.name} ${profile.lastname || ''}`.trim()
    : user?.user_metadata?.name || user?.name || 'ผู้ใช้งาน';
  const roleLabel = roleLabels[roleId] || roleId;

  const notifCount = notif?.totalCount || 0;

  let notifLink = '/Plan_Check';
  if (roleId === 'teacher') {
    notifLink = notif?.committeePendingCount > 0 && notif?.teacherRejectedCount === 0 && notif?.teacherNeedClipCount === 0
      ? '/Plan_Check'
      : '/statusplan';
  } else if (roleId === 'admin' || roleId === 'root') {
    notifLink = notif?.adminPendingEvaluatorsCount > 0 && notif?.adminPendingUsersCount === 0
      ? '/approve_evaluator'
      : '/confirmUser';
  } else if (roleId === 'admin_school') {
    notifLink = '/confirmUser';
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSidebar = (e) => {
    e.preventDefault();
    if (window.innerWidth < 992) {
      document.body.classList.toggle('sidebar-open');
      document.body.classList.remove('sidebar-collapse');
    } else {
      document.body.classList.toggle('sidebar-collapse');
    }
  };

  return (
    <nav className="main-header navbar navbar-expand navbar-white navbar-light no-print">
      {/* Left navbar links */}
      <ul className="navbar-nav align-items-center">
        <li className="nav-item">
          <a
            className="nav-link"
            data-widget="pushmenu"
            href="#toggle-menu"
            onClick={toggleSidebar}
            role="button"
            aria-label="เปิด/ปิดเมนูด้านซ้าย"
          >
            <i className="fas fa-bars"></i>
          </a>
        </li>
        <li className="nav-item d-none d-sm-inline-block">
          <Link to="/" className="nav-link font-weight-bold text-primary">
            <i className="fa-solid fa-house mr-1"></i> หน้าหลัก
          </Link>
        </li>
        {isEvaluator && roleId === 'teacher' && (
          <li className="nav-item d-none d-md-inline-block ml-1">
            <Link
              to="/Plan_Check"
              className="btn btn-sm bg-primary-subtle text-primary font-weight-bold px-2 py-1"
              style={{ borderRadius: '20px', fontSize: '12px' }}
            >
              <i className="fa-solid fa-clipboard-user mr-1"></i> โหมดกรรมการนิเทศ
              {notif?.committeePendingCount > 0 && (
                <span className="badge badge-danger ml-1">{notif.committeePendingCount}</span>
              )}
            </Link>
          </li>
        )}
      </ul>

      {/* Right navbar links */}
      <ul className="navbar-nav ml-auto align-items-center">
        <li className="nav-item d-none d-lg-inline-block mr-2">
          <span className="text-muted small">
            <i className="fa-regular fa-calendar mr-1"></i>
            {formatThaiDate(new Date())}
          </span>
        </li>

        {/* Notification Bell */}
        <li className="nav-item dropdown" ref={notifRef}>
          <button
            type="button"
            className="nav-link px-2 btn btn-link position-relative"
            onClick={() => {
              setShowNotifDropdown((prev) => !prev);
              setShowUserDropdown(false);
            }}
            title={notifCount > 0 ? `มี ${notifCount} รายการรอดำเนินการ` : 'การแจ้งเตือน'}
            aria-label="การแจ้งเตือน"
          >
            <i
              className={`fas fa-bell ${notifCount > 0 ? 'text-warning' : 'text-secondary'}`}
              style={{ fontSize: '17px' }}
            ></i>
            {notifCount > 0 && (
              <span
                className="badge badge-danger navbar-badge"
                style={{ fontSize: '10px', top: '3px', right: '2px', borderRadius: '10px' }}
              >
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div
              className="dropdown-menu dropdown-menu-lg dropdown-menu-right show shadow-lg border-0"
              style={{
                minWidth: '310px',
                borderRadius: '14px',
                overflow: 'hidden',
                position: 'absolute',
                right: 0,
                top: '100%',
                zIndex: 1060,
              }}
            >
              <div
                className="px-3 py-2 text-white d-flex justify-content-between align-items-center"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
              >
                <span className="font-weight-bold small">
                  <i className="fa-solid fa-bell mr-1"></i> ศูนย์แจ้งเตือนภาระงาน
                </span>
                <span className="badge badge-light text-primary font-weight-bold">
                  {notifCount} รายการ
                </span>
              </div>

              <div className="p-3">
                {notifCount === 0 ? (
                  <div className="text-center py-3 text-muted">
                    <i className="fa-solid fa-circle-check fa-2x text-success mb-2"></i>
                    <p className="mb-0 small font-weight-bold text-dark">ไม่มีรายการค้างดำเนินการ</p>
                    <small className="text-muted">ทุกภาระงานของท่านเป็นปัจจุบันแล้ว</small>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {notif?.teacherRejectedCount > 0 && (
                      <Link
                        to="/statusplan?filter=3"
                        onClick={() => setShowNotifDropdown(false)}
                        className="p-2 rounded bg-danger-subtle text-decoration-none d-flex justify-content-between align-items-center"
                      >
                        <span className="small font-weight-bold text-danger">
                          <i className="fa-solid fa-rotate-left mr-1"></i> แผนรอแก้ไขตามคำแนะนำ ผอ.
                        </span>
                        <span className="badge badge-danger">{notif.teacherRejectedCount}</span>
                      </Link>
                    )}
                    {notif?.teacherNeedClipCount > 0 && (
                      <Link
                        to="/statusplan?filter=2"
                        onClick={() => setShowNotifDropdown(false)}
                        className="p-2 rounded bg-warning-subtle text-decoration-none d-flex justify-content-between align-items-center"
                      >
                        <span className="small font-weight-bold text-warning-emphasis">
                          <i className="fa-solid fa-video mr-1"></i> แผนอนุมัติแล้ว • รอส่งคลิป
                        </span>
                        <span className="badge badge-warning">{notif.teacherNeedClipCount}</span>
                      </Link>
                    )}
                    {notif?.directorPendingCount > 0 && (
                      <Link
                        to="/Plan_Check"
                        onClick={() => setShowNotifDropdown(false)}
                        className="p-2 rounded bg-warning-subtle text-decoration-none d-flex justify-content-between align-items-center"
                      >
                        <span className="small font-weight-bold text-warning-emphasis">
                          <i className="fa-solid fa-file-signature mr-1"></i> แผนรอ ผอ. ตรวจอนุมัติ
                        </span>
                        <span className="badge badge-warning">{notif.directorPendingCount}</span>
                      </Link>
                    )}
                    {notif?.committeePendingCount > 0 && (
                      <Link
                        to="/Plan_Check"
                        onClick={() => setShowNotifDropdown(false)}
                        className="p-2 rounded bg-primary-subtle text-decoration-none d-flex justify-content-between align-items-center"
                      >
                        <span className="small font-weight-bold text-primary">
                          <i className="fa-solid fa-star-half-stroke mr-1"></i> แผนรอให้คะแนนนิเทศ
                        </span>
                        <span className="badge badge-primary">{notif.committeePendingCount}</span>
                      </Link>
                    )}
                    {notif?.adminPendingUsersCount > 0 && (
                      <Link
                        to="/confirmUser"
                        onClick={() => setShowNotifDropdown(false)}
                        className="p-2 rounded bg-info-subtle text-decoration-none d-flex justify-content-between align-items-center"
                      >
                        <span className="small font-weight-bold text-info-emphasis">
                          <i className="fa-solid fa-user-check mr-1"></i> ผู้สมัครใหม่รออนุมัติสิทธิ์
                        </span>
                        <span className="badge badge-info">{notif.adminPendingUsersCount}</span>
                      </Link>
                    )}
                    {notif?.adminPendingEvaluatorsCount > 0 && (
                      <Link
                        to="/approve_evaluator"
                        onClick={() => setShowNotifDropdown(false)}
                        className="p-2 rounded bg-success-subtle text-decoration-none d-flex justify-content-between align-items-center"
                      >
                        <span className="small font-weight-bold text-success-emphasis">
                          <i className="fa-solid fa-award mr-1"></i> รายชื่อผู้นิเทศรออนุมัติ
                        </span>
                        <span className="badge badge-success">{notif.adminPendingEvaluatorsCount}</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>

              <div className="dropdown-divider m-0"></div>
              <Link
                to={notifLink}
                onClick={() => setShowNotifDropdown(false)}
                className="dropdown-item text-center py-2 text-primary small font-weight-bold"
              >
                เปิดหน้ารายการหลัก <i className="fa-solid fa-arrow-right ml-1"></i>
              </Link>
            </div>
          )}
        </li>

        {/* User Profile Dropdown */}
        <li className="nav-item dropdown ml-1" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => {
              setShowUserDropdown((prev) => !prev);
              setShowNotifDropdown(false);
            }}
            className="btn btn-light border-0 d-flex align-items-center gap-2 py-1 px-2"
            style={{ borderRadius: '20px', backgroundColor: '#f1f5f9' }}
          >
            <span
              className="rounded-circle d-inline-flex align-items-center justify-content-center text-white font-weight-bold"
              style={{
                width: '28px',
                height: '28px',
                fontSize: '12px',
                background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
              }}
            >
              <i className="fa-solid fa-user"></i>
            </span>
            <span className="d-none d-sm-inline-block text-left" style={{ lineHeight: 1.15 }}>
              <span className="d-block font-weight-bold text-dark" style={{ fontSize: '12.5px' }}>
                {displayName}
              </span>
              <span className="d-block text-primary" style={{ fontSize: '10.5px', fontWeight: 600 }}>
                {roleLabel}
              </span>
            </span>
            <i className="fa-solid fa-chevron-down text-muted d-none d-sm-inline" style={{ fontSize: '10px' }}></i>
          </button>

          {showUserDropdown && (
            <div
              className="dropdown-menu dropdown-menu-right show shadow-lg border-0 p-2"
              style={{
                minWidth: '230px',
                borderRadius: '14px',
                position: 'absolute',
                right: 0,
                top: '100%',
                zIndex: 1060,
              }}
            >
              <div className="px-3 py-2 border-bottom mb-1">
                <div className="font-weight-bold text-dark small">{displayName}</div>
                <span className="badge bg-primary-subtle text-primary mt-1">{roleLabel}</span>
              </div>

              <Link
                to={isAdminAccount ? '/profile' : '/editprofile'}
                onClick={() => setShowUserDropdown(false)}
                className="dropdown-item rounded py-2 small"
              >
                <i className="fa-solid fa-id-card text-primary mr-2"></i> แก้ไขข้อมูลส่วนตัว
              </Link>

              {!isAdminAccount && roleId !== 'admin_school' && (
                <Link
                  to="/editSignature"
                  onClick={() => setShowUserDropdown(false)}
                  className="dropdown-item rounded py-2 small"
                >
                  <i className="fa-solid fa-signature text-info mr-2"></i> จัดการลายเซ็นดิจิทัล
                </Link>
              )}

              <Link
                to="/chgpasswd"
                onClick={() => setShowUserDropdown(false)}
                className="dropdown-item rounded py-2 small"
              >
                <i className="fa-solid fa-key text-warning mr-2"></i> เปลี่ยนรหัสผ่าน
              </Link>

              <div className="dropdown-divider my-1"></div>

              <button
                type="button"
                onClick={() => {
                  setShowUserDropdown(false);
                  logout();
                }}
                className="dropdown-item rounded py-2 small text-danger font-weight-bold"
              >
                <i className="fa-solid fa-arrow-right-from-bracket mr-2"></i> ออกจากระบบ
              </button>
            </div>
          )}
        </li>
      </ul>
    </nav>
  );
};

export default Header;
