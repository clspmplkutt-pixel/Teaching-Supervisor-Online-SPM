import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const SidebarAdmin = () => {
    const { logout } = useAuth();
    const location = useLocation();
    const [pendingUsers, setPendingUsers] = useState(0);
    const [errorUsers, _setErrorUsers] = useState(0);
    const [duplicateUsers, _setDuplicateUsers] = useState(0);

    useEffect(() => {
        let mounted = true;
        const fetchPendingUsers = async () => {
            try {
                const { count } = await supabase
                    .from('tbl_Users')
                    .select('*', { count: 'exact', head: true })
                    .eq('level', 'teacher')
                    .eq('register_isConfirm', '0');
                if (mounted && count !== null) {
                    setPendingUsers(count);
                }
            } catch (err) {
                console.error('Error fetching pending users count:', err);
            }
        };
        fetchPendingUsers();
        return () => { mounted = false; };
    }, []);

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
                        <Link to="/admin_monitor" className={`nav-link ${isActive('/admin_monitor')}`}>
                            <i className="nav-icon fa-solid fa-chart-line text-purple"></i>
                            <p>กำกับติดตามการใช้งาน</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/khet" className={`nav-link ${isActive('/khet')}`}>
                            <i className="nav-icon fa-solid fa-school-circle-check text-danger"></i>
                            <p>จัดการสหวิทยาเขต</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/school" className={`nav-link ${isActive('/school')}`}>
                            <i className="nav-icon fa-solid fa-school text-success"></i>
                            <p>จัดการโรงเรียน</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/budget_year" className={`nav-link ${isActive('/budget_year')}`}>
                            <i className="nav-icon fa-solid fa-baht-sign text-warning"></i>
                            <p>จัดการปีงบประมาณ</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/education_year" className={`nav-link ${isActive('/education_year')}`}>
                            <i className="nav-icon fa-solid fa-school-flag text-blue"></i>
                            <p>จัดการปีการศึกษา</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/confirm-user" className={`nav-link ${isActive('/confirm-user')}`}>
                            <i className="nav-icon fa-solid fa-person-circle-check text-danger"></i>
                            <p>
                                ผู้ใช้งานรอการอนุมัติ
                                <span className={`badge ${pendingUsers === 0 ? 'badge-info' : 'badge-danger'} right`}>
                                    {pendingUsers}
                                </span>
                            </p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/checkup-user" className={`nav-link ${isActive('/checkup-user')}`}>
                            <i className="nav-icon fa-solid fa-triangle-exclamation text-danger"></i>
                            <p>
                                ข้อมูลผู้ใช้ผิดพลาด
                                <span className={`badge ${errorUsers === 0 ? 'badge-info' : 'badge-danger'} right`}>
                                    {errorUsers}
                                </span>
                            </p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/checkup-duplicate" className={`nav-link ${isActive('/checkup-duplicate')}`}>
                            <i className="nav-icon fa-solid fa-triangle-exclamation text-danger"></i>
                            <p>
                                เลขประจำตัวประชาชนซ้ำ
                                <span className={`badge ${duplicateUsers === 0 ? 'badge-info' : 'badge-danger'} right`}>
                                    {duplicateUsers}
                                </span>
                            </p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="#" className="nav-link">
                            <i className="nav-icon fa-solid fa-users-gear text-success"></i>
                            <p>
                                จัดการผู้ใช้งาน
                                <i className="fas fa-angle-left right"></i>
                            </p>
                        </Link>
                        <ul className="nav nav-treeview">
                            <li className="nav-item">
                                <Link to="/users/district-director" className="nav-link">
                                    <i className="far fa-circle nav-icon"></i>
                                    <p>ผู้อำนวยการเขตพื้นที่</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/users/supervision" className="nav-link">
                                    <i className="far fa-circle nav-icon"></i>
                                    <p>ผู้ประเมิน</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/users/supervisor" className="nav-link">
                                    <i className="far fa-circle nav-icon"></i>
                                    <p>ศึกษานิเทศก์</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/users/chairman" className="nav-link">
                                    <i className="far fa-circle nav-icon"></i>
                                    <p>ประธานสหวิทยาเขต</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/users/director-school" className="nav-link">
                                    <i className="far fa-circle nav-icon"></i>
                                    <p>ผอ.โรงเรียน/รอง ผอ.</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/users/head-department" className="nav-link">
                                    <i className="far fa-circle nav-icon"></i>
                                    <p>หัวหน้ากลุ่มสาระโรงเรียน</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/users/teacher" className="nav-link">
                                    <i className="far fa-circle nav-icon"></i>
                                    <p>ครู</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/users/change-position" className="nav-link">
                                    <i className="fa-solid fa-person-booth nav-icon text-blue"></i>
                                    <p>เปลี่ยนตำแหน่ง</p>
                                </Link>
                            </li>
                        </ul>
                    </li>

                    <li className="nav-item">
                        <Link to="#" className="nav-link">
                            <i className="nav-icon fa-solid fa-gear text-maroon"></i>
                            <p>
                                ตั้งค่าพื้นฐาน
                                <i className="fas fa-angle-left right"></i>
                            </p>
                        </Link>
                        <ul className="nav nav-treeview">
                            <li className="nav-item">
                                <Link to="/settings/prefix" className="nav-link">
                                    <i className="fa-solid fa-mars-double nav-icon"></i>
                                    <p>คำนำหน้า</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/settings/gender" className="nav-link">
                                    <i className="fa-solid fa-person nav-icon"></i>
                                    <p>เพศ</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/settings/school-size" className="nav-link">
                                    <i className="fa-solid fa-school nav-icon"></i>
                                    <p>ขนาดโรงเรียน</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/settings/teach-subject" className="nav-link">
                                    <i className="fa-solid fa-graduation-cap nav-icon"></i>
                                    <p>กลุ่มสาระการเรียนรู้</p>
                                </Link>
                            </li>
                        </ul>
                    </li>

                    <li className="nav-item">
                        <Link to="/config" className={`nav-link ${isActive('/config')}`}>
                            <i className="nav-icon fa-solid fa-gears text-info"></i>
                            <p>ตั้งค่าระบบ</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/profile" className={`nav-link ${isActive('/profile')}`}>
                            <i className="nav-icon fa-solid fa-user-gear text-info"></i>
                            <p>ปรับปรุงข้อมูลส่วนตัว</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/change-password" className={`nav-link ${isActive('/change-password')}`}>
                            <i className="nav-icon fa-solid fa-key text-danger"></i>
                            <p>เปลี่ยนรหัสผ่าน</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/log" className={`nav-link ${isActive('/log')}`}>
                            <i className="nav-icon fa-solid fa-anchor-lock text-warning"></i>
                            <p>ข้อมูลการเข้าระบบ</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <Link to="/import-dmc" className={`nav-link ${isActive('/import-dmc')}`}>
                            <i className="nav-icon fa-solid fa-file-import text-success"></i>
                            <p>นำเข้าข้อมูล DMC</p>
                        </Link>
                    </li>

                    <li className="nav-item">
                        <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} className="nav-link">
                            <i className="nav-icon fa-solid fa-arrow-right-from-bracket text-danger"></i>
                            <p>ออกจากระบบ</p>
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
    );
};

export default SidebarAdmin;
