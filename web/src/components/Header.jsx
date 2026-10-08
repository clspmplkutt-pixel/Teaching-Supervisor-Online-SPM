
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import useNotifications from '../hooks/useNotifications';

const thai_date_full = (date) => {
    const d = new Date(date);
    const months = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
};

const getRoleId = (user) =>
    user?.level_id || user?.user_metadata?.role || user?.role || 'teacher';

const Header = () => {
    const { user, logout } = useAuth();
    const notifCount = useNotifications();
    const userName = user?.user_metadata?.name || 'Guest';
    const userRole = user?.user_metadata?.role || 'User';
    const roleId = getRoleId(user);

    // ครู → ไปหน้าสถานะแผน, ผอ. และกรรมการ → ไปหน้าตรวจแผนการสอน
    const notifLink = roleId === 'teacher' ? '/statusplan' : '/Plan_Check';

    return (
        <nav className="main-header navbar navbar-expand navbar-white navbar-light">
            {/* Left navbar links */}
            <ul className="navbar-nav">
                <li className="nav-item">
                    <a className="nav-link" data-widget="pushmenu" href="#" role="button"><i className="fas fa-bars"></i></a>
                </li>
                <li className="nav-item d-none d-sm-inline-block">
                    <Link to="/" className="nav-link text-blue"><i className="fa-solid fa-house"></i> หน้าหลัก</Link>
                </li>
                <li className="nav-item d-none d-sm-inline-block">
                    <a href="#" className="nav-link text-cyan"><i className="fa-solid fa-envelope"></i> ติดต่อเรา</a>
                </li>
            </ul>

            {/* Right navbar links */}
            <ul className="navbar-nav ml-auto align-items-center">
                <li className="nav-item">
                    <span className="nav-link py-1 px-2" style={{ fontSize: '13px' }}>
                        <span className="d-none d-md-inline text-muted">{thai_date_full(new Date())} | </span>
                        <span className="text-primary font-weight-bold">
                            {userName} <span className="text-muted font-weight-normal">({userRole})</span>
                        </span>
                        <span className="badge badge-warning d-none d-lg-inline-block ml-1">React</span>
                    </span>
                </li>

                {/* 🔔 Notification Bell */}
                <li className="nav-item">
                    <Link
                        to={notifLink}
                        className="nav-link px-2"
                        title={notifCount > 0 ? `มี ${notifCount} รายการรอดำเนินการ` : 'ไม่มีรายการค้างดำเนินการ'}
                    >
                        <i className={`fas fa-bell ${notifCount > 0 ? 'text-warning animate__animated animate__shakeX' : 'text-secondary'}`}></i>
                        {notifCount > 0 && (
                            <span
                                className="badge badge-danger navbar-badge"
                                style={{ fontSize: '10px', top: '4px', right: '4px' }}
                            >
                                {notifCount > 99 ? '99+' : notifCount}
                            </span>
                        )}
                    </Link>
                </li>

                <li className="nav-item d-none d-sm-inline-block">
                    <a className="nav-link px-2" data-widget="fullscreen" href="#" role="button" title="เต็มจอ">
                        <i className="fas fa-expand-arrows-alt"></i>
                    </a>
                </li>
                <li className="nav-item">
                    <button className="nav-link btn btn-link px-2" onClick={logout} role="button" title="ออกจากระบบ">
                        <i className="fa-solid fa-arrow-right-from-bracket text-danger"></i>
                    </button>
                </li>
            </ul>
        </nav>
    );
};

export default Header;
