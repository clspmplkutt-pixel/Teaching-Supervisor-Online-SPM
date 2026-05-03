
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

const Header = () => {
    const { user, logout } = useAuth();
    const notifCount = useNotifications();
    const userName = user?.user_metadata?.name || 'Guest';
    const userRole = user?.user_metadata?.role || 'User';

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
            <ul className="navbar-nav ml-auto">
                <li className="nav-item">
                    <span className="nav-link">
                        {thai_date_full(new Date())} | <span className="text-blue">{userName} ({userRole}) <span className="badge badge-warning">React Version</span></span>
                    </span>
                </li>

                {/* 🔔 Notification Bell */}
                {notifCount > 0 && (
                    <li className="nav-item">
                        <Link to="/" className="nav-link" title={`มี ${notifCount} รายการรอดำเนินการ`}>
                            <i className="fas fa-bell text-warning"></i>
                            <span
                                className="badge badge-danger navbar-badge"
                                style={{ fontSize: '10px' }}
                            >
                                {notifCount > 99 ? '99+' : notifCount}
                            </span>
                        </Link>
                    </li>
                )}

                <li className="nav-item">
                    <a className="nav-link" data-widget="fullscreen" href="#" role="button">
                        <i className="fas fa-expand-arrows-alt"></i>
                    </a>
                </li>
                <li className="nav-item">
                    <button className="nav-link btn btn-link" onClick={logout} role="button">
                        <i className="fa-solid fa-arrow-right-from-bracket text-danger"></i>
                    </button>
                </li>
            </ul>
        </nav>
    );
};

export default Header;
