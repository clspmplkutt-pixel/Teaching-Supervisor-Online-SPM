import React, { useEffect, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { encryptLegacyPassword } from '../utils/legacyCrypto';
import { useSearchParams } from 'react-router-dom';

const ResetUserPassword = () => {
    const [searchParams] = useSearchParams();
    const defaultSearch = searchParams.get('people_id') || '';
    const [search, setSearch] = useState(defaultSearch);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selected, setSelected] = useState(null); // user ที่เลือกจะ reset
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [lookups, setLookups] = useState({ prefix: {}, school: {} });

    // ดึง lookup prefix + school
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
            const { data, error } = await supabase
                .from('tbl_Users')
                .select('people_id, name, lastname, prefix, school, level, approved')
                .or(`people_id.eq.${query.trim()},name.ilike.%${query.trim()}%,lastname.ilike.%${query.trim()}%`)
                .limit(20);
            if (error) throw error;
            setUsers(data || []);
            
            // Auto select if only one match and it matches the initially searched people_id
            if (data?.length === 1 && data[0].people_id === query.trim()) {
                setSelected(data[0]);
            }
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (defaultSearch) {
            performSearch(defaultSearch);
        }
    }, [defaultSearch, performSearch]);

    const handleSearch = (e) => {
        e.preventDefault();
        performSearch(search);
    };

    const handleReset = async (e) => {
        e.preventDefault();
        if (!selected) return;
        if (newPwd.length < 6) {
            Swal.fire('Error', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
            return;
        }
        if (newPwd !== confirmPwd) {
            Swal.fire('Error', 'รหัสผ่านไม่ตรงกัน', 'error');
            return;
        }
        const confirm = await Swal.fire({
            title: 'ยืนยันการ Reset รหัสผ่าน?',
            html: `รีเซ็ตรหัสผ่านของ <b>${lookups.prefix[selected.prefix] || ''}${selected.name} ${selected.lastname}</b><br/>รหัสใหม่: <b>${newPwd}</b>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
        });
        if (!confirm.isConfirmed) return;

        setSaving(true);
        try {
            const encrypted = encryptLegacyPassword(newPwd);
            const { error } = await supabase
                .from('tbl_Users')
                .update({ passwd: encrypted })
                .eq('people_id', selected.people_id);
            if (error) throw error;
            Swal.fire('สำเร็จ! ✅', `รีเซ็ตรหัสผ่านของ ${selected.name} ${selected.lastname} เรียบร้อยแล้ว`, 'success');
            setNewPwd('');
            setConfirmPwd('');
            setSelected(null);
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="row">
            <div className="col-12">
                <div className="card card-danger">
                    <div className="card-header">
                        <h3 className="card-title">
                            <i className="fa-solid fa-key mr-2"></i>
                            Reset รหัสผ่านบุคลากร (Admin)
                        </h3>
                    </div>
                    <div className="card-body">

                        {/* ค้นหาผู้ใช้ */}
                        <form onSubmit={handleSearch}>
                            <div className="input-group mb-3">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="ค้นหาด้วย เลขบัตรประชาชน / ชื่อ / นามสกุล"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <div className="input-group-append">
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        <i className="fas fa-search"></i> ค้นหา
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* ผลการค้นหา */}
                        {loading && (
                            <div className="text-center p-3">
                                <div className="spinner-border text-primary" role="status"></div>
                                <p className="mt-2">กำลังค้นหา...</p>
                            </div>
                        )}

                        {!loading && users.length > 0 && (
                            <div className="table-responsive mb-4">
                                <table className="table table-bordered table-hover table-striped">
                                    <thead className="thead-dark">
                                        <tr>
                                            <th>เลขบัตร</th>
                                            <th>ชื่อ - นามสกุล</th>
                                            <th>โรงเรียน</th>
                                            <th>ระดับ</th>
                                            <th>สถานะ</th>
                                            <th>เลือก</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((u) => (
                                            <tr
                                                key={u.people_id}
                                                className={selected?.people_id === u.people_id ? 'table-warning' : ''}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => { setSelected(u); setNewPwd(''); setConfirmPwd(''); }}
                                            >
                                                <td><code>{u.people_id}</code></td>
                                                <td>{lookups.prefix[u.prefix] || ''}{u.name} {u.lastname}</td>
                                                <td>{lookups.school[u.school] || u.school}</td>
                                                <td>{u.level}</td>
                                                <td>
                                                    {u.approved === '1'
                                                        ? <span className="badge badge-success">อนุมัติแล้ว</span>
                                                        : <span className="badge badge-warning">รอการอนุมัติ</span>
                                                    }
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className={`btn btn-sm ${selected?.people_id === u.people_id ? 'btn-warning' : 'btn-outline-warning'}`}
                                                        onClick={() => { setSelected(u); setNewPwd(''); setConfirmPwd(''); }}
                                                    >
                                                        <i className="fa-solid fa-key"></i> เลือก
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {!loading && search && users.length === 0 && (
                            <div className="alert alert-warning">ไม่พบผู้ใช้งานที่ค้นหา</div>
                        )}

                        {/* ฟอร์ม Reset รหัสผ่าน */}
                        {selected && (
                            <div className="card card-warning mt-3">
                                <div className="card-header">
                                    <h4 className="card-title">
                                        <i className="fa-solid fa-lock-open mr-2"></i>
                                        Reset รหัสผ่านของ: {lookups.prefix[selected.prefix] || ''}{selected.name} {selected.lastname}
                                        <small className="ml-2 text-muted">({selected.people_id})</small>
                                    </h4>
                                </div>
                                <div className="card-body">
                                    <form onSubmit={handleReset}>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label>รหัสผ่านใหม่ :</label>
                                                    <input
                                                        type="password"
                                                        className="form-control"
                                                        value={newPwd}
                                                        onChange={(e) => setNewPwd(e.target.value)}
                                                        placeholder="อย่างน้อย 6 ตัวอักษร"
                                                        required
                                                        minLength={6}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label>ยืนยันรหัสผ่านใหม่ :</label>
                                                    <input
                                                        type="password"
                                                        className="form-control"
                                                        value={confirmPwd}
                                                        onChange={(e) => setConfirmPwd(e.target.value)}
                                                        placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <button type="submit" className="btn btn-danger" disabled={saving}>
                                            <i className="fa-solid fa-key mr-1"></i>
                                            {saving ? 'กำลังบันทึก...' : 'Reset รหัสผ่าน'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary ml-2"
                                            onClick={() => { setSelected(null); setNewPwd(''); setConfirmPwd(''); }}
                                        >
                                            ยกเลิก
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetUserPassword;
