import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useNotifications from '../hooks/useNotifications';

const SidebarTeacher = () => {
    const location = useLocation();
    const notifCount = useNotifications();

    const isActive = (path) => {
        return location.pathname === path ? 'active' : '';
    };

    return (
        <div className="sidebar">
            <div className="form-inline">
                <div className="input-group" data-widget="sidebar-search">
                    <input className="form-control form-control-sidebar" type="search" placeholder="Search" aria-label="Search" />
                    <div className="input-group-append">
                        <button className="btn btn-sidebar">
                            <i className="fas fa-search fa-fw"></i>
                        </button>
                    </div>
                </div>
            </div>

            <nav className="mt-2">
                <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
                    <li className="nav-item">
                        <Link to="/" className={`nav-link ${isActive('/')}`}>
                            <i className="nav-icon fas fa-home text-blue"></i>
                            <p>หน้าหลัก</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/statusplan" className={`nav-link ${isActive('/statusplan')}`}>
                            <i className="nav-icon fa-regular fa-clock text-info"></i>
                            <p>
                                สถานะแผนการสอน
                                {notifCount > 0 && (
                                    <span className="badge badge-warning right ml-1" style={{ fontSize: '10px' }}>
                                        {notifCount > 99 ? '99+' : notifCount}
                                    </span>
                                )}
                            </p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/sendplan" className={`nav-link ${isActive('/sendplan')}`}>
                            <i className="nav-icon fa-regular fa-paper-plane text-success"></i>
                            <p>ส่งแผนการสอน</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/statusplan-clip" className={`nav-link ${isActive('/statusplan-clip')}`}>
                            <i className="nav-icon fa-brands fa-youtube text-danger"></i>
                            <p>ส่งคลิปการสอน</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/editprofile" className={`nav-link ${isActive('/editprofile')}`}>
                            <i className="nav-icon fa-solid fa-address-card text-warning"></i>
                            <p>ข้อมูลส่วนตัว</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/edit-signature" className={`nav-link ${isActive('/edit-signature')}`}>
                            <i className="nav-icon fa-solid fa-signature text-info"></i>
                            <p>จัดการลายเซ็นต์</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/view_scoring" className={`nav-link ${isActive('/view_scoring')}`}>
                            <i className="nav-icon fa-solid fa-star text-warning"></i>
                            <p>ดูคะแนนการประเมิน</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/change-password" className={`nav-link ${isActive('/change-password')}`}>
                            <i className="nav-icon fa-solid fa-key text-danger"></i>
                            <p>เปลี่ยนรหัสผ่าน</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <a href="#" onClick={(e) => { e.preventDefault(); window.location.href = '/logout'; }} className="nav-link">
                            <i className="nav-icon fa-solid fa-arrow-right-from-bracket text-danger"></i>
                            <p>ออกจากระบบ</p>
                        </a>
                    </li>
                </ul>
            </nav>

            <div className="sidebar-custom">
                <a href="#" className="btn btn-link">
                    <i className="fas fa-cogs"></i> ตั้งค่าระบบ
                </a>
                <br />
            </div>
        </div>
    );
};

export default SidebarTeacher;
