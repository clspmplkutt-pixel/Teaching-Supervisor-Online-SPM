import React, { useState, useRef, useEffect } from 'react';
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
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const userName = user?.user_metadata?.name || user?.name || 'Guest';
    const userRole = user?.user_metadata?.role || user?.role || 'User';
    const roleId = getRoleId(user);

    // ครู → ไปหน้าสถานะแผน, ผอ. และกรรมการ → ไปหน้าตรวจแผนการสอน
    const notifLink = roleId === 'teacher' ? '/statusplan' : '/Plan_Check';

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showDropdown]);

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
                    <a href="https://secondary.obec.go.th" target="_blank" rel="noreferrer" className="nav-link text-cyan">
                        <i className="fa-solid fa-globe"></i> สพม.พิษณุโลก อุตรดิตถ์
                    </a>
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
                    </span>
                </li>

                {/* 🔔 Notification Bell Dropdown */}
                <li className="nav-item dropdown" ref={dropdownRef}>
                    <button
                        type="button"
                        className="nav-link px-2 btn btn-link position-relative"
                        onClick={() => setShowDropdown(!showDropdown)}
                        title={notifCount > 0 ? `มี ${notifCount} รายการรอดำเนินการ` : 'ศูนย์แจ้งเตือน'}
                        style={{ border: 'none', background: 'none' }}
                    >
                        <i className={`fas fa-bell ${notifCount > 0 ? 'text-warning animate__animated animate__shakeX' : 'text-secondary'}`} style={{ fontSize: '16px' }}></i>
                        {notifCount > 0 && (
                            <span
                                className="badge badge-danger navbar-badge"
                                style={{ fontSize: '10px', top: '2px', right: '4px' }}
                            >
                                {notifCount > 99 ? '99+' : notifCount}
                            </span>
                        )}
                    </button>

                    {/* Dropdown Menu */}
                    {showDropdown && (
                        <div
                            className="dropdown-menu dropdown-menu-lg dropdown-menu-right show shadow-lg border-0"
                            style={{
                                minWidth: '300px',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                zIndex: 1050,
                            }}
                        >
                            <div className="bg-primary px-3 py-2 text-white d-flex justify-content-between align-items-center">
                                <span className="font-weight-bold" style={{ fontSize: '13px' }}>
                                    <i className="fa-solid fa-bell mr-1"></i> การแจ้งเตือนงานค้าง
                                </span>
                                <span className="badge badge-warning text-dark font-weight-bold" style={{ fontSize: '11px' }}>
                                    {notifCount} รายการ
                                </span>
                            </div>

                            <div className="p-3">
                                {notifCount === 0 ? (
                                    <div className="text-center py-3 text-muted">
                                        <i className="fa-solid fa-circle-check fa-2x text-success mb-2"></i>
                                        <p className="mb-0 small">ยอดเยี่ยม! ไม่มีงานค้างในระบบ</p>
                                        <small className="text-muted">ทุกรายการได้รับการดำเนินการเรียบร้อยแล้ว</small>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="d-flex align-items-start mb-2">
                                            <div className="mr-2 text-warning mt-1">
                                                <i className="fa-solid fa-triangle-exclamation"></i>
                                            </div>
                                            <div className="flex-fill">
                                                <div className="font-weight-bold small text-dark">
                                                    {roleId === 'teacher' && 'มีแผนการสอนที่ต้องดำเนินการ'}
                                                    {roleId === 'directorschool' && 'มีแผนการสอนรอการตรวจ/อนุมัติ'}
                                                    {['supervision', 'chairman', 'supervisor'].includes(roleId) && 'มีแผนการสอนรอให้คะแนนประเมิน'}
                                                    {!['teacher', 'directorschool', 'supervision', 'chairman', 'supervisor'].includes(roleId) && 'มีรายการรอดำเนินการ'}
                                                </div>
                                                <div className="text-muted small">
                                                    พบ {notifCount} รายการที่ต้องการการดำเนินการจากท่าน
                                                </div>
                                            </div>
                                        </div>

                                        <Link
                                            to={notifLink}
                                            onClick={() => setShowDropdown(false)}
                                            className="btn btn-primary btn-block btn-sm font-weight-bold mt-2 shadow-sm"
                                            style={{ borderRadius: '8px' }}
                                        >
                                            <i className="fa-solid fa-arrow-right-to-bracket mr-1"></i> ไปยังหน้ารายการงานค้าง
                                        </Link>
                                    </div>
                                )}
                            </div>

                            <div className="dropdown-divider m-0"></div>
                            <Link
                                to={notifLink}
                                onClick={() => setShowDropdown(false)}
                                className="dropdown-item dropdown-footer text-center py-2 text-primary small font-weight-bold"
                            >
                                ดูงานที่รอดำเนินการทั้งหมด <i className="fa-solid fa-chevron-right ml-1" style={{ fontSize: '10px' }}></i>
                            </Link>
                        </div>
                    )}
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
