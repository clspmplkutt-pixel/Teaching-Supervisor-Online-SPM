import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';
import LoadingSpinner from '../components/LoadingSpinner';

const levelOptions = [
    { value: 'teacher', label: 'ครูผู้สอน' },
    { value: 'headdepartment', label: 'หัวหน้ากลุ่มสาระโรงเรียน' },
    { value: 'directorschool', label: 'ผู้อำนวยการ/รองผู้อำนวยการโรงเรียน' },
    { value: 'chairman', label: 'ประธานสหวิทยาเขต' },
    { value: 'supervision', label: 'ผู้นิเทศ' },
    { value: 'supervisor', label: 'ศึกษานิเทศก์' },
    { value: 'districdirector', label: 'ผู้อำนวยการเขต/รอง ผอ. เขต' },
];

const suggestLevelFromPosition = (posId) => {
    if (posId === '10007' || posId === '10006') return 'directorschool';
    if (posId === '10008' || posId === '10009') return 'districdirector';
    if (posId === '10010') return 'supervisor';
    if (['10000', '10001', '10999'].includes(posId)) return 'teacher';
    return '';
};

const ChangePosition = () => {
    const [loading, setLoading] = useState(true);
    const [lookups, setLookups] = useState({
        prefix: {},
        gender: {},
        position: {},
        personType: {},
        school: {}
    });
    const [positionsList, setPositionsList] = useState([]);
    const [personTypesList, setPersonTypesList] = useState([]);
    const [search, setSearch] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPositionId, setNewPositionId] = useState('');
    const [newPersonTypeId, setNewPersonTypeId] = useState('');
    const [newLevel, setNewLevel] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [prefixRes, genderRes, positionRes, personTypeRes, schoolRes] = await Promise.all([
                supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
                supabase.from('tbl_system_gender').select('gender, gender_name'),
                supabase.from('tbl_system_PersonPositionType').select('position_id, position_name').order('position_id'),
                supabase.from('tbl_system_PersonType').select('persontype_id, persontype_name').order('persontype_id'),
                supabase.from('tbl_school').select('school_id, school_name'),
            ]);

            const prefixMap = {};
            prefixRes.data?.forEach((p) => { prefixMap[p.prefix_id] = p.prefix; });
            const genderMap = {};
            genderRes.data?.forEach((g) => { genderMap[g.gender] = g.gender_name; });
            const positionMap = {};
            positionRes.data?.forEach((pos) => { positionMap[pos.position_id] = pos.position_name; });
            const personTypeMap = {};
            personTypeRes.data?.forEach((pt) => { personTypeMap[pt.persontype_id] = pt.persontype_name; });
            const schoolMap = {};
            schoolRes.data?.forEach((s) => { schoolMap[s.school_id] = s.school_name; });

            setPositionsList(positionRes.data || []);
            setPersonTypesList(personTypeRes.data || []);
            setLookups({
                prefix: prefixMap,
                gender: genderMap,
                position: positionMap,
                personType: personTypeMap,
                school: schoolMap
            });
        } catch (err) {
            console.error('ChangePosition load error:', err);
            Swal.fire('Error', 'ไม่สามารถโหลดข้อมูล lookup ได้', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!search.trim()) return;

        setSearchLoading(true);
        setSearchResults([]);
        setSelectedUser(null);

        try {
            const query = search.trim();
            const { data, error } = await supabase
                .from('tbl_Users')
                .select('*')
                .or(`people_id.eq.${query},name.ilike.%${query}%,lastname.ilike.%${query}%`)
                .order('name', { ascending: true })
                .limit(20);

            if (error) throw error;
            setSearchResults(data || []);
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setNewPositionId(user.position_id || '');
        setNewPersonTypeId(user.persontype_id || '');
        setNewLevel(user.level || '');
    };

    const handlePositionChange = (e) => {
        const posId = e.target.value;
        setNewPositionId(posId);
        const suggested = suggestLevelFromPosition(posId);
        if (suggested) {
            setNewLevel(suggested);
        }
    };

    const handleChangePosition = async (e) => {
        e.preventDefault();
        if (!selectedUser || !newPositionId || !newLevel) {
            Swal.fire('แจ้งเตือน', 'กรุณาระบุตำแหน่งและระดับการใช้งานที่ต้องการเปลี่ยน', 'warning');
            return;
        }

        const oldPosName = lookups.position[selectedUser.position_id] || selectedUser.position_id || '-';
        const newPosName = lookups.position[newPositionId] || newPositionId;
        const oldLevelLabel = levelOptions.find(l => l.value === selectedUser.level)?.label || selectedUser.level || '-';
        const newLevelLabel = levelOptions.find(l => l.value === newLevel)?.label || newLevel;

        const result = await Swal.fire({
            title: 'ยืนยันการเปลี่ยนตำแหน่ง/สิทธิ์?',
            html: `
                <div class="text-left py-2" style="font-size: 14px; line-height: 1.8;">
                    <strong>ผู้ใช้งาน:</strong> ${lookups.prefix[selectedUser.prefix] || ''}${selectedUser.name} ${selectedUser.lastname}<br/>
                    <strong>สังกัด:</strong> ${lookups.school[selectedUser.school] || selectedUser.school || '-'}<hr/>
                    <div><span class="text-muted">ตำแหน่งเดิม:</span> <strong>${oldPosName}</strong></div>
                    <div><span class="text-primary font-weight-bold">ตำแหน่งใหม่:</span> <strong>${newPosName}</strong></div>
                    <div class="mt-2"><span class="text-muted">สิทธิ์ระบบเดิม:</span> <strong>${oldLevelLabel}</strong></div>
                    <div><span class="text-success font-weight-bold">สิทธิ์ระบบใหม่:</span> <strong>${newLevelLabel}</strong></div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันการเปลี่ยนแปลง',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#2563eb',
        });

        if (!result.isConfirmed) return;

        try {
            const updatePayload = {
                position_id: newPositionId,
                level: newLevel,
            };
            if (newPersonTypeId) {
                updatePayload.persontype_id = newPersonTypeId;
            }

            const { error } = await supabase
                .from('tbl_Users')
                .update(updatePayload)
                .eq('id', selectedUser.id);

            if (error) throw error;

            Swal.fire('สำเร็จ', 'เปลี่ยนตำแหน่งและสิทธิ์การใช้งานเรียบร้อยแล้ว', 'success');
            setSelectedUser(null);
            setSearchResults([]);
            setSearch('');
        } catch (err) {
            console.error('ChangePosition error:', err);
            Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเปลี่ยนตำแหน่งได้: ' + err.message, 'error');
        }
    };

    if (loading) {
        return <LoadingSpinner title="เปลี่ยนตำแหน่งผู้ใช้งาน" message="กำลังโหลดข้อมูล..." />;
    }

    return (
        <div className="container-fluid py-3">
            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
                <div className="card-header bg-white py-3 border-bottom">
                    <h5 className="font-weight-bold mb-0 text-dark">
                        <i className="fa-solid fa-person-circle-exclamation text-primary mr-2"></i> เปลี่ยนตำแหน่งและสิทธิ์การเข้าใช้งาน
                    </h5>
                    <p className="text-muted small mb-0 mt-1">
                        ปรับปรุงตำแหน่งราชการ (position_id), ประเภทบุคลากร และสิทธิ์ระดับบทบาท (level) ของบุคลากรในระบบ
                    </p>
                </div>

                <div className="card-body p-4">
                    {/* Search Step */}
                    <form onSubmit={handleSearch} className="mb-4">
                        <div className="row align-items-end">
                            <div className="col-md-6 col-lg-5">
                                <label className="font-weight-bold small text-muted">ค้นหาผู้ใช้งาน (ชื่อ, นามสกุล หรือเลขประจำตัวประชาชน):</label>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="เช่น สมชาย, 1659900..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        required
                                    />
                                    <div className="input-group-append">
                                        <button className="btn btn-primary font-weight-bold" type="submit" disabled={searchLoading}>
                                            {searchLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-magnifying-glass mr-1"></i>} ค้นหา
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Search Results Table */}
                    {searchResults.length > 0 && !selectedUser && (
                        <div className="card border mb-4" style={{ borderRadius: '10px' }}>
                            <div className="card-header bg-light py-2">
                                <strong className="text-dark small">ผลการค้นหา ({searchResults.length} คน) — กรุณาเลือกบุคคลที่ต้องการแก้ไข</strong>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0 small">
                                    <thead>
                                        <tr>
                                            <th>ชื่อ - สกุล</th>
                                            <th>เลขประจำตัวประชาชน</th>
                                            <th>สถานศึกษา</th>
                                            <th>ตำแหน่งปัจจุบัน</th>
                                            <th>สิทธิ์ระบบ</th>
                                            <th style={{ width: '100px' }} className="text-center">เลือก</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {searchResults.map((u) => (
                                            <tr key={u.id}>
                                                <td className="font-weight-bold">
                                                    {lookups.prefix[u.prefix] || ''}{u.name} {u.lastname}
                                                </td>
                                                <td>{u.people_id}</td>
                                                <td>{lookups.school[u.school] || u.school || '-'}</td>
                                                <td>{lookups.position[u.position_id] || u.position_id || '-'}</td>
                                                <td>
                                                    <span className="badge badge-light border">
                                                        {levelOptions.find(l => l.value === u.level)?.label || u.level}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-primary btn-sm px-3"
                                                        style={{ borderRadius: '20px' }}
                                                        onClick={() => handleSelectUser(u)}
                                                    >
                                                        เลือก
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Modification Form */}
                    {selectedUser && (
                        <div className="card border-primary mb-3 shadow-sm" style={{ borderRadius: '12px', borderWidth: '2px' }}>
                            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2 px-3">
                                <div className="font-weight-bold">
                                    <i className="fa-solid fa-user-pen mr-2"></i> ปรับปรุงตำแหน่ง: {lookups.prefix[selectedUser.prefix] || ''}{selectedUser.name} {selectedUser.lastname}
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-light py-0 px-2 font-weight-bold"
                                    onClick={() => setSelectedUser(null)}
                                >
                                    เปลี่ยนคน
                                </button>
                            </div>

                            <div className="card-body p-4">
                                <div className="row mb-4 p-3 bg-light rounded">
                                    <div className="col-md-4">
                                        <div className="text-muted small">สถานศึกษา</div>
                                        <div className="font-weight-bold">{lookups.school[selectedUser.school] || '-'}</div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="text-muted small">ตำแหน่งเดิม</div>
                                        <div className="font-weight-bold text-dark">{lookups.position[selectedUser.position_id] || selectedUser.position_id || '-'}</div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="text-muted small">สิทธิ์ระบบเดิม</div>
                                        <div className="font-weight-bold text-primary">{levelOptions.find(l => l.value === selectedUser.level)?.label || selectedUser.level}</div>
                                    </div>
                                </div>

                                <form onSubmit={handleChangePosition}>
                                    <div className="row">
                                        <div className="col-md-4 mb-3">
                                            <label className="font-weight-bold small">ตำแหน่งใหม่ (position_id):</label>
                                            <select
                                                className="form-control"
                                                value={newPositionId}
                                                onChange={handlePositionChange}
                                                required
                                            >
                                                <option value="">-- เลือกตำแหน่งใหม่ --</option>
                                                {positionsList.map(pos => (
                                                    <option key={pos.position_id} value={pos.position_id}>
                                                        {pos.position_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-md-4 mb-3">
                                            <label className="font-weight-bold small">ประเภทบุคลากร (persontype_id):</label>
                                            <select
                                                className="form-control"
                                                value={newPersonTypeId}
                                                onChange={(e) => setNewPersonTypeId(e.target.value)}
                                            >
                                                <option value="">-- เลือกประเภทบุคลากร --</option>
                                                {personTypesList.map(pt => (
                                                    <option key={pt.persontype_id} value={pt.persontype_id}>
                                                        {pt.persontype_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-md-4 mb-3">
                                            <label className="font-weight-bold small text-primary">สิทธิ์การเข้าใช้งานระบบ (level):</label>
                                            <select
                                                className="form-control"
                                                value={newLevel}
                                                onChange={(e) => setNewLevel(e.target.value)}
                                                required
                                            >
                                                <option value="">-- เลือกระดับสิทธิ์ --</option>
                                                {levelOptions.map(l => (
                                                    <option key={l.value} value={l.value}>
                                                        {l.label} ({l.value})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
                                        <button
                                            type="button"
                                            className="btn btn-secondary px-3"
                                            onClick={() => setSelectedUser(null)}
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary font-weight-bold px-4"
                                        >
                                            <i className="fa-solid fa-save mr-1"></i> บันทึกการเปลี่ยนแปลง
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChangePosition;
