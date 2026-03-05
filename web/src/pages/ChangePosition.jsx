import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';
import LoadingSpinner from '../components/LoadingSpinner';

const ChangePosition = () => {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [lookups, setLookups] = useState({
        prefix: {},
        gender: {},
        personType: {}
    });
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
            const [prefixRes, genderRes, personTypeRes, usersRes] = await Promise.all([
                supabase.from('tbl_system_prefix').select('prefix_id, prefix_name'),
                supabase.from('tbl_system_gender').select('gender, gender_name'),
                supabase.from('tbl_system_PersonType').select('persontype_id, persontype_name'),
                supabase.from('tbl_Users').select('*').order('name', { ascending: true })
            ]);

            const prefixMap = {};
            prefixRes.data?.forEach((p) => { prefixMap[p.prefix_id] = p.prefix_name; });
            const genderMap = {};
            genderRes.data?.forEach((g) => { genderMap[g.gender] = g.gender_name; });
            const personTypeMap = {};
            personTypeRes.data?.forEach((pt) => { personTypeMap[pt.persontype_id] = pt.persontype_name; });

            setLookups({ prefix: prefixMap, gender: genderMap, personType: personTypeMap });
            setUsers(usersRes.data || []);
            setTeachers(
                (usersRes.data || []).filter(
                    (u) => u.persontype_id === '26' // Teacher
                )
            );
        } catch (err) {
            console.error('ChangePosition load error:', err);
            Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลได้', 'error');
        } finally {
            setLoading(false);
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
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label>
                                            เลือกผู้ใช้ <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className="form-control"
                                            value={selectedUser?.id || ''}
                                            onChange={(e) => {
                                                const user = users.find((u) => u.id === parseInt(e.target.value));
                                                setSelectedUser(user);
                                            }}
                                            required
                                        >
                                            <option value="">-- เลือกผู้ใช้ --</option>
                                            {users.map((user) => (
                                                <option key={user.id} value={user.id}>
                                                    {lookups.prefix[user.prefix] || ''} {user.name} {user.lastname}
                                                    {' '}({lookups.personType[user.persontype_id] || 'ไม่ระบุ'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
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

                        <hr className="my-4" />

                        <h5 className="mb-3">
                            <i className="fa-solid fa-users mr-2"></i>
                            รายชื่อครูในระบบ (ตำแหน่งปัจจุบัน: ครู)
                        </h5>
                        <div className="table-responsive">
                            <table className="table table-bordered table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th className="text-center" style={{ width: '50px' }}>
                                            #
                                        </th>
                                        <th>ชื่อ-นามสกุล</th>
                                        <th>เลขประจำตัวประชาชน</th>
                                        <th className="text-center">ตำแหน่ง</th>
                                        <th className="text-center">สถานะ</th>
                                        <th className="text-center" style={{ width: '120px' }}>
                                            จัดการ
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teachers.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center text-muted">
                                                ไม่พบข้อมูลครูในระบบ
                                            </td>
                                        </tr>
                                    ) : (
                                        teachers.map((user, index) => (
                                            <tr key={user.id}>
                                                <td className="text-center">{index + 1}</td>
                                                <td>
                                                    {lookups.prefix[user.prefix] || ''} {user.name} {user.lastname}
                                                </td>
                                                <td>{user.people_id}</td>
                                                <td className="text-center">
                                                    <span className="badge badge-info">
                                                        {lookups.personType[user.persontype_id] || 'ไม่ระบุ'}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    {user.register_isConfirm === '1' ? (
                                                        <span className="badge badge-success">อนุมัติแล้ว</span>
                                                    ) : (
                                                        <span className="badge badge-warning">รอการอนุมัติ</span>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => setSelectedUser(user)}
                                                        title="เลือกเพื่อเปลี่ยนตำแหน่ง"
                                                    >
                                                        <i className="fa-solid fa-arrow-up-right-from-square"></i> เลือก
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangePosition;
