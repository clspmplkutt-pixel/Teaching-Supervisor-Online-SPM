import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';
import LoadingSpinner from '../components/LoadingSpinner';

const ChangePosition = () => {
    const [loading, setLoading] = useState(true);
    const [lookups, setLookups] = useState({
        prefix: {},
        gender: {},
        personType: {}
    });
    const [search, setSearch] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPosition, setNewPosition] = useState('');
    const [newLevel, setNewLevel] = useState('');

    // mapping ประเภทบุคลากร → ระดับ login
    const levelOptions = [
        { value: 'teacher', label: 'ครูผู้สอน' },
        { value: 'headdepartment', label: 'หัวหน้ากลุ่มสาระโรงเรียน' },
        { value: 'directorschool', label: 'ผู้อำนวยการ/รองผู้อำนวยการโรงเรียน' },
        { value: 'chairman', label: 'ประธานสหวิทยาเขต' },
        { value: 'supervision', label: 'ผู้นิเทศ' },
        { value: 'supervisor', label: 'ศึกษานิเทศก์' },
        { value: 'districdirector', label: 'ผู้อำนวยการเขต/รอง ผอ. เขต' },
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // ไม่ต้องโหลด users ทั้งหมดแล้ว, ค้นหาแยกเอา
            const [prefixRes, genderRes, personTypeRes] = await Promise.all([
                supabase.from('tbl_system_prefix').select('prefix_id, prefix_name'),
                supabase.from('tbl_system_gender').select('gender, gender_name'),
                supabase.from('tbl_system_PersonType').select('persontype_id, persontype_name')
            ]);

            const prefixMap = {};
            prefixRes.data?.forEach((p) => { prefixMap[p.prefix_id] = p.prefix_name; });
            const genderMap = {};
            genderRes.data?.forEach((g) => { genderMap[g.gender] = g.gender_name; });
            const personTypeMap = {};
            personTypeRes.data?.forEach((pt) => { personTypeMap[pt.persontype_id] = pt.persontype_name; });

            setLookups({ prefix: prefixMap, gender: genderMap, personType: personTypeMap });
        } catch (err) {
            console.error('ChangePosition load error:', err);
            Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลได้', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!search.trim()) return;

        setSearchLoading(true);
        setSearchResults([]);
        setSelectedUser(null);

        try {
            const { data, error } = await supabase
                .from('tbl_Users')
                .select('*')
                .or(`people_id.eq.${search.trim()},name.ilike.%${search.trim()}%,lastname.ilike.%${search.trim()}%`)
                .order('name', { ascending: true })
                .limit(30);

            if (error) throw error;
            setSearchResults(data || []);
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleChangePosition = async (e) => {
        e.preventDefault();
        if (!selectedUser || !newPosition || !newLevel) {
            Swal.fire('Warning', 'กรุณาเลือกผู้ใช้, ตำแหน่งใหม่ และระดับการใช้งาน', 'warning');
            return;
        }

        try {
            const result = await Swal.fire({
                title: 'ยืนยันการเปลี่ยนตำแหน่ง?',
                html: `คุณต้องการเปลี่ยนตำแหน่งของ <strong>${selectedUser.name} ${selectedUser.lastname}</strong><br/>จาก <strong>${lookups.personType[selectedUser.persontype_id]}</strong><br/>เป็น <strong>${lookups.personType[newPosition]}</strong><br/>ระดับการเข้าใช้: <strong class="text-primary">${levelOptions.find(l => l.value === newLevel)?.label}</strong>`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'ยืนยัน',
                cancelButtonText: 'ยกเลิก'
            });

            if (!result.isConfirmed) return;

            const { error } = await supabase
                .from('tbl_Users')
                .update({ persontype_id: newPosition, level: newLevel })
                .eq('id', selectedUser.id);

            if (error) throw error;

            Swal.fire('สำเร็จ', 'เปลี่ยนตำแหน่งเรียบร้อยแล้ว', 'success');
            setSelectedUser(null);
            setNewPosition('');
            setNewLevel('');
            loadData();
        } catch (err) {
            console.error('ChangePosition error:', err);
            Swal.fire('Error', 'ไม่สามารถเปลี่ยนตำแหน่งได้', 'error');
        }
    };

    if (loading) {
        return <LoadingSpinner title="เปลี่ยนตำแหน่ง" message="กำลังโหลดข้อมูล..." />;
    }

    return (
        <div className="row">
            <div className="col-12">
                <div className="card card-primary">
                    <div className="card-header">
                        <h3 className="card-title">
                            <i className="fa-solid fa-person-booth mr-2"></i>
                            เปลี่ยนตำแหน่งผู้ใช้งาน
                        </h3>
                    </div>
                    <div className="card-body">
                        <div className="alert alert-info">
                            <i className="fa-solid fa-circle-info mr-2"></i>
                            <strong>คำแนะนำ:</strong> ใช้หน้านี้เพื่อเปลี่ยนตำแหน่งของผู้ใช้ในระบบ เช่น เปลี่ยนจากครูเป็นผู้อำนวยการ
                        </div>

                        <form onSubmit={handleChangePosition}>
                            <div className="row">
                                <div className="col-12 mb-3">
                                    <label>
                                        ค้นหาและเลือกผู้ใช้ที่ต้องการเปลี่ยนตำแหน่ง <span className="text-danger">*</span>
                                    </label>
                                    <div className="input-group">
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="ค้นหาด้วย เลขบัตรประชาชน / ชื่อ / นามสกุล"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                        <div className="input-group-append">
                                            <button type="button" className="btn btn-primary" onClick={handleSearch} disabled={searchLoading}>
                                                <i className="fas fa-search"></i> ค้นหา
                                            </button>
                                        </div>
                                    </div>

                                    {searchLoading && (
                                        <div className="text-center mt-3">
                                            <div className="spinner-border spinner-border-sm text-primary" role="status"></div> กำลังค้นหา...
                                        </div>
                                    )}

                                    {!searchLoading && searchResults.length > 0 && (
                                        <div className="table-responsive mt-3 border rounded">
                                            <table className="table table-sm table-hover table-striped mb-0">
                                                <thead className="thead-light">
                                                    <tr>
                                                        <th>เลขบัตร</th>
                                                        <th>ชื่อ - นามสกุล</th>
                                                        <th>ตำแหน่งปัจจุบัน</th>
                                                        <th className="text-center">เลือก</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {searchResults.map((u) => (
                                                        <tr key={u.id} className={selectedUser?.id === u.id ? 'table-warning' : ''}>
                                                            <td>{u.people_id}</td>
                                                            <td>{lookups.prefix[u.prefix] || ''}{u.name} {u.lastname}</td>
                                                            <td><span className="badge badge-info">{lookups.personType[u.persontype_id] || 'ไม่ระบุ'}</span></td>
                                                            <td className="text-center">
                                                                <button
                                                                    type="button"
                                                                    className={`btn btn-sm ${selectedUser?.id === u.id ? 'btn-warning' : 'btn-outline-warning'}`}
                                                                    onClick={() => setSelectedUser(u)}
                                                                >
                                                                    <i className="fa-solid fa-check"></i> เลือก
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {!searchLoading && search && searchResults.length === 0 && (
                                        <div className="alert alert-warning mt-3 py-2">
                                            ไม่พบข้อมูลที่ตรงกับ <strong>"{search}"</strong>
                                        </div>
                                    )}
                                </div>

                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label>
                                            ตำแหน่งใหม่ (ประเภทบุคลากร) <span className="text-danger">*</span>
                                        </label>
                                        <select className="form-control" value={newPosition} onChange={(e) => setNewPosition(e.target.value)} required>
                                            <option value="">-- เลือกตำแหน่งใหม่ --</option>
                                            {Object.entries(lookups.personType).map(([id, name]) => (
                                                <option key={id} value={id}>{name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>
                                            ระดับการเข้าใช้งาน (สำคัญ!) <span className="text-danger">*</span>
                                        </label>
                                        <select className="form-control" value={newLevel} onChange={(e) => setNewLevel(e.target.value)} required>
                                            <option value="">-- เลือกระดับ (ใช้ตอน Login) --</option>
                                            {levelOptions.map((l) => (
                                                <option key={l.value} value={l.value}>{l.label}</option>
                                            ))}
                                        </select>
                                        <small className="text-danger"><i className="fas fa-exclamation-triangle"></i> ต้องเลือกให้ตรงกับตำแหน่ง มิฉะนั้น Login ไม่ได้!</small>
                                    </div>
                                </div>
                            </div>

                            {selectedUser && (
                                <div className="card bg-light mb-3">
                                    <div className="card-header">ข้อมูลผู้ใช้ที่เลือก</div>
                                    <div className="card-body">
                                        <div className="row">
                                            <div className="col-md-6">
                                                <p>
                                                    <strong>ชื่อ-นามสกุล:</strong>{' '}
                                                    {lookups.prefix[selectedUser.prefix] || ''} {selectedUser.name}{' '}
                                                    {selectedUser.lastname}
                                                </p>
                                                <p>
                                                    <strong>เลขประจำตัวประชาชน:</strong> {selectedUser.people_id}
                                                </p>
                                            </div>
                                            <div className="col-md-6">
                                                <p>
                                                    <strong>ตำแหน่งปัจจุบัน:</strong>{' '}
                                                    <span className="badge badge-info">
                                                        {lookups.personType[selectedUser.persontype_id] || 'ไม่ระบุ'}
                                                    </span>
                                                </p>
                                                <p>
                                                    <strong>สถานะ:</strong>{' '}
                                                    {selectedUser.register_isConfirm === '1' ? (
                                                        <span className="badge badge-success">อนุมัติแล้ว</span>
                                                    ) : (
                                                        <span className="badge badge-warning">รอการอนุมัติ</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="text-center">
                                <button type="submit" className="btn btn-primary btn-lg" disabled={!selectedUser || !newPosition}>
                                    <i className="fa-solid fa-check mr-2"></i>
                                    ยืนยันการเปลี่ยนตำแหน่ง
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-lg ml-2"
                                    onClick={() => {
                                        setSelectedUser(null);
                                        setNewPosition('');
                                    }}
                                >
                                    <i className="fa-solid fa-xmark mr-2"></i>
                                    ล้างข้อมูล
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangePosition;
