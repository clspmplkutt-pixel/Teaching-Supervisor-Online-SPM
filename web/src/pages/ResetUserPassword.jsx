import React, { useEffect, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { encryptLegacyPassword } from '../utils/legacyCrypto';
import { useSearchParams } from 'react-router-dom';
import { useUserProfile } from '../hooks/useUserProfile';
import { maskThaiId } from '../utils/scoreCalculator';

const ResetUserPassword = () => {
    const { profile, loading: profileLoading } = useUserProfile();
    const roleId = profile?.level || profile?.level_id;
    const userSchool = profile?.school;
    const isAdminSchool = roleId === 'admin_school';

    const [searchParams] = useSearchParams();
    const defaultSearch = searchParams.get('people_id') || '';
    const [search, setSearch] = useState(defaultSearch);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null); // user to reset
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [lookups, setLookups] = useState({ prefix: {}, school: {} });

    useEffect(() => {
        const fetchLookups = async () => {
            const [{ data: prefixData }, { data: schoolData }] = await Promise.all([
                supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
                supabase.from('tbl_school').select('school_id, school_name'),
            ]);
            const prefixMap = {};
            prefixData?.forEach((p) => { prefixMap[p.prefix_id] = p.prefix; });
            const schoolMap = {};
            schoolData?.forEach((s) => { schoolMap[s.school_id] = s.school_name; });
            setLookups({ prefix: prefixMap, school: schoolMap });
        };
        fetchLookups();
    }, []);

    const performSearch = useCallback(async (query) => {
        if (!query.trim()) return;
        setLoading(true);
        setUsers([]);
        setSelected(null);
        try {
            let dbQuery = supabase
                .from('tbl_Users')
                .select('id, people_id, name, lastname, prefix, school, level, birthday')
                .or(`people_id.eq.${query.trim()},name.ilike.%${query.trim()}%,lastname.ilike.%${query.trim()}%`);

            if (isAdminSchool && userSchool) {
                dbQuery = dbQuery.eq('school', userSchool);
            }

            const { data, error } = await dbQuery.limit(20);
            if (error) throw error;
            setUsers(data || []);
            
            if (data?.length === 1 && data[0].people_id === query.trim()) {
                setSelected(data[0]);
            }
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [isAdminSchool, userSchool]);

    useEffect(() => {
        if (defaultSearch && !profileLoading) {
            performSearch(defaultSearch);
        }
    }, [defaultSearch, profileLoading, performSearch]);

    const handleSearch = (e) => {
        e.preventDefault();
        performSearch(search);
    };

    const handleSelectUser = (u) => {
        setSelected(u);
        setNewPwd('');
        setConfirmPwd('');
    };

    const applyPreset = (presetType) => {
        if (!selected) return;
        if (presetType === 'birthday') {
            if (!selected.birthday) {
                Swal.fire('ไม่มีข้อมูล', 'ผู้ใช้นี้ยังไม่ได้ระบุวันเกิดในระบบ', 'info');
                return;
            }
            // format YYYYMMDD
            const b = selected.birthday.replace(/[^0-9]/g, '');
            setNewPwd(b);
            setConfirmPwd(b);
        } else if (presetType === 'people_id') {
            setNewPwd(selected.people_id);
            setConfirmPwd(selected.people_id);
        } else if (presetType === 'default') {
            setNewPwd('123456');
            setConfirmPwd('123456');
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        if (!selected) return;
        if (newPwd.length < 6) {
            Swal.fire('ข้อผิดพลาด', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'warning');
            return;
        }
        if (newPwd !== confirmPwd) {
            Swal.fire('ข้อผิดพลาด', 'รหัสผ่านทั้งสองช่องไม่ตรงกัน', 'warning');
            return;
        }

        const fullName = `${lookups.prefix[selected.prefix] || ''}${selected.name} ${selected.lastname}`;
        const confirm = await Swal.fire({
            title: 'ยืนยันการตั้งรหัสผ่านใหม่?',
            html: `
                <div class="text-left py-2" style="font-size: 14px;">
                    <div>ผู้ใช้งาน: <b>${fullName}</b></div>
                    <div>เลข ปชช.: <code>${selected.people_id}</code></div>
                    <div class="mt-2 text-danger font-weight-bold">รหัสผ่านใหม่ที่จะตั้ง: <code style="font-size: 16px;">${newPwd}</code></div>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันรีเซ็ตรหัสผ่าน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#f59e0b',
        });

        if (!confirm.isConfirmed) return;

        try {
            const encrypted = encryptLegacyPassword(newPwd);
            const { error } = await supabase
                .from('tbl_Users')
                .update({ passwd: encrypted })
                .eq('id', selected.id);

            if (error) throw error;

            await Swal.fire({
                title: 'รีเซ็ตรหัสผ่านสำเร็จ',
                html: `
                    <div>ได้เปลี่ยนรหัสผ่านของ <b>${fullName}</b> เรียบร้อยแล้ว</div>
                    <div class="alert alert-info mt-3 p-2 font-mono">รหัสผ่านใหม่: <b>${newPwd}</b></div>
                `,
                icon: 'success',
                confirmButtonText: 'คัดลอกรหัสผ่าน & ปิด',
            });

            navigator.clipboard?.writeText(newPwd);
            setSelected(null);
            setNewPwd('');
            setConfirmPwd('');
        } catch (err) {
            console.error('Reset password error:', err);
            Swal.fire('Error', 'ไม่สามารถรีเซ็ตรหัสผ่านได้: ' + err.message, 'error');
        }
    };

    return (
        <div className="container-fluid py-3">
            <div className="row justify-content-center">
                <div className="col-lg-9">
                    <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
                        <div className="card-header bg-white py-3 border-bottom">
                            <h5 className="font-weight-bold mb-0 text-dark">
                                <i className="fa-solid fa-key text-warning mr-2"></i> รีเซ็ตรหัสผ่านผู้ใช้งาน (Reset Password)
                            </h5>
                            <p className="text-muted small mb-0 mt-1">
                                ค้นหาบุคลากรและกำหนดรหัสผ่านใหม่ {isAdminSchool ? `(จำกัดเฉพาะโรงเรียน${lookups.school[userSchool] || ''})` : ''}
                            </p>
                        </div>

                        <div className="card-body p-4">
                            {/* Search Box */}
                            <form onSubmit={handleSearch} className="mb-4">
                                <div className="row align-items-end">
                                    <div className="col-md-7">
                                        <label className="font-weight-bold small text-muted">ค้นหาผู้ใช้งาน (ชื่อ, นามสกุล หรือเลขประจำตัวประชาชน):</label>
                                        <div className="input-group">
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="เช่น สมชาย หรือ 1659900..."
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                required
                                            />
                                            <div className="input-group-append">
                                                <button className="btn btn-warning font-weight-bold text-dark" type="submit" disabled={loading}>
                                                    {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-magnifying-glass mr-1"></i>} ค้นหา
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>

                            {/* Search Results */}
                            {users.length > 0 && !selected && (
                                <div className="card border mb-4" style={{ borderRadius: '10px' }}>
                                    <div className="card-header bg-light py-2">
                                        <strong className="text-dark small">พบผู้ใช้งาน {users.length} รายการ — เลือกคนที่ต้องการรีเซ็ต</strong>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="table table-hover align-middle mb-0 small">
                                            <thead>
                                                <tr>
                                                    <th>ชื่อ - สกุล</th>
                                                    <th>เลขประจำตัวประชาชน</th>
                                                    <th>สถานศึกษา</th>
                                                    <th>บทบาท</th>
                                                    <th style={{ width: '100px' }} className="text-center">เลือก</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map((u) => (
                                                    <tr key={u.id}>
                                                        <td className="font-weight-bold">
                                                            {lookups.prefix[u.prefix] || ''}{u.name} {u.lastname}
                                                        </td>
                                                        <td>{maskThaiId(u.people_id)}</td>
                                                        <td>{lookups.school[u.school] || '-'}</td>
                                                        <td><span className="badge badge-light border">{u.level || '-'}</span></td>
                                                        <td className="text-center">
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-warning btn-sm text-dark font-weight-bold px-3"
                                                                style={{ borderRadius: '20px' }}
                                                                onClick={() => handleSelectUser(u)}
                                                            >
                                                                รีเซ็ต
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Reset Password Form */}
                            {selected && (
                                <div className="card border-warning mb-3 shadow-sm" style={{ borderRadius: '12px', borderWidth: '2px' }}>
                                    <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center py-2 px-3">
                                        <div className="font-weight-bold">
                                            <i className="fa-solid fa-shield-halved mr-2"></i> ตั้งรหัสผ่านใหม่: {lookups.prefix[selected.prefix] || ''}{selected.name} {selected.lastname}
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-light py-0 px-2 font-weight-bold"
                                            onClick={() => setSelected(null)}
                                        >
                                            เปลี่ยนคน
                                        </button>
                                    </div>

                                    <div className="card-body p-4">
                                        {/* Presets Toolbar */}
                                        <div className="mb-3">
                                            <label className="font-weight-bold small text-muted d-block mb-1">
                                                ตัวเลือกด่วน (Quick Presets):
                                            </label>
                                            <div className="d-flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-secondary btn-sm"
                                                    onClick={() => applyPreset('birthday')}
                                                >
                                                    <i className="fa-solid fa-cake-candles mr-1"></i> วันเกิด (YYYYMMDD)
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-secondary btn-sm"
                                                    onClick={() => applyPreset('people_id')}
                                                >
                                                    <i className="fa-solid fa-id-card mr-1"></i> เลขประจำตัวประชาชน (13 หลัก)
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-secondary btn-sm"
                                                    onClick={() => applyPreset('default')}
                                                >
                                                    <i className="fa-solid fa-asterisk mr-1"></i> ค่าเริ่มต้น (123456)
                                                </button>
                                            </div>
                                        </div>

                                        <form onSubmit={handleReset}>
                                            <div className="row">
                                                <div className="col-md-6 mb-3">
                                                    <label className="font-weight-bold small text-muted">รหัสผ่านใหม่:</label>
                                                    <div className="input-group">
                                                        <input
                                                            type={showPwd ? 'text' : 'password'}
                                                            className="form-control"
                                                            placeholder="กำหนดรหัสผ่านใหม่"
                                                            value={newPwd}
                                                            onChange={(e) => setNewPwd(e.target.value)}
                                                            required
                                                            minLength={6}
                                                        />
                                                        <div className="input-group-append">
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-secondary"
                                                                onClick={() => setShowPwd(!showPwd)}
                                                            >
                                                                <i className={`fa-solid ${showPwd ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-6 mb-3">
                                                    <label className="font-weight-bold small text-muted">ยืนยันรหัสผ่านใหม่อีกครั้ง:</label>
                                                    <input
                                                        type={showPwd ? 'text' : 'password'}
                                                        className="form-control"
                                                        placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                                                        value={confirmPwd}
                                                        onChange={(e) => setConfirmPwd(e.target.value)}
                                                        required
                                                        minLength={6}
                                                    />
                                                </div>
                                            </div>

                                            {newPwd && confirmPwd && newPwd !== confirmPwd && (
                                                <div className="text-danger small mb-2">
                                                    <i className="fa-solid fa-triangle-exclamation mr-1"></i> รหัสผ่านทั้งสองช่องไม่ตรงกัน
                                                </div>
                                            )}

                                            <div className="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary px-3"
                                                    onClick={() => setSelected(null)}
                                                >
                                                    ยกเลิก
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="btn btn-warning font-weight-bold text-dark px-4"
                                                    disabled={!newPwd || newPwd !== confirmPwd}
                                                >
                                                    <i className="fa-solid fa-check mr-1"></i> ยืนยันรีเซ็ตรหัสผ่าน
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetUserPassword;
