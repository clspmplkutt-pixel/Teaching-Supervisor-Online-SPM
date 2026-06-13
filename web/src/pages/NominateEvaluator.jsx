import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';

const NominateEvaluator = () => {
    const { user } = useAuth();
    const [teachers, setTeachers] = useState([]);
    const [nominations, setNominations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [externalId, setExternalId] = useState('');

    const directorPeopleId = user?.user_metadata?.people_id;
    const schoolId = user?.user_metadata?.school;

    useEffect(() => {
        if (directorPeopleId) {
            fetchData();
        }
    }, [directorPeopleId, fetchData]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch teachers in the same school
            const { data: teacherData, error: teacherError } = await supabase
                .from('tbl_Users')
                .select('people_id, prefix, name, lastname, position_id')
                .eq('school', schoolId)
                .eq('level', 'teacher');
            
            if (teacherError) throw teacherError;
            setTeachers(teacherData || []);

            // Fetch current nominations made by this director
            const { data: nomData, error: nomError } = await supabase
                .from('tbl_EvaluatorNominations')
                .select('*')
                .eq('nominated_by', directorPeopleId)
                .order('created_at', { ascending: false });

            if (nomError) {
                // If the table does not exist yet, we catch the error gracefully
                if (nomError.code === '42P01') {
                    console.warn("Table tbl_EvaluatorNominations does not exist yet. Please run the SQL schema script.");
                    setNominations([]);
                } else {
                    throw nomError;
                }
            } else {
                setNominations(nomData || []);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            Swal.fire('ข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลได้: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [schoolId, directorPeopleId]);

    const handleNominate = async (nomineePeopleId, nomineeName) => {
        // Check if already nominated
        const alreadyNominated = nominations.find(n => n.nominee_people_id === nomineePeopleId);
        if (alreadyNominated) {
            Swal.fire('แจ้งเตือน', 'บุคคลนี้ได้รับการเสนอชื่อแล้ว', 'warning');
            return;
        }

        const result = await Swal.fire({
            title: 'ยืนยันการเสนอแต่งตั้ง?',
            text: `คุณต้องการเสนอชื่อ ${nomineeName} เพื่อแต่งตั้งเป็นผู้นิเทศ/คณะกรรมการประเมิน ใช่หรือไม่?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            try {
                // Try inserting to tbl_EvaluatorNominations
                const { error } = await supabase
                    .from('tbl_EvaluatorNominations')
                    .insert([{
                        nominee_people_id: nomineePeopleId,
                        nominated_by: directorPeopleId,
                        status: 'pending'
                    }]);
                
                if (error) {
                     if (error.code === '42P01') {
                        throw new Error("ตาราง tbl_EvaluatorNominations ยังไม่ถูกสร้างในฐานข้อมูล (โปรดรัน SQL script)");
                     }
                     throw error;
                }

                Swal.fire('สำเร็จ', 'เสนอแต่งตั้งเรียบร้อยแล้ว รอการอนุมัติจากผู้ดูแลระบบ', 'success');
                fetchData();
            } catch (error) {
                Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้: ' + error.message, 'error');
            }
        }
    };

    const handleNominateExternal = async (e) => {
        e.preventDefault();
        if (!externalId || externalId.length !== 13) {
            Swal.fire('แจ้งเตือน', 'กรุณากรอกเลขบัตรประชาชน 13 หลักให้ถูกต้อง', 'warning');
            return;
        }

        try {
            // Search for external user in tbl_Users
            const { data: userRecord, error: userError } = await supabase
                .from('tbl_Users')
                .select('people_id, prefix, name, lastname')
                .eq('people_id', externalId)
                .maybeSingle();
            
            if (userError) throw userError;

            if (!userRecord) {
                Swal.fire({
                    title: 'ไม่พบบุคคลนี้ในระบบ',
                    text: 'กรุณาให้บุคคลภายนอกทำการสมัครสมาชิก (Register) เข้ามาในระบบก่อน จากนั้นจึงนำเลขบัตรประชาชนมาค้นหาอีกครั้ง',
                    icon: 'warning'
                });
                return;
            }

            const fullName = `${userRecord.name} ${userRecord.lastname}`;
            handleNominate(userRecord.people_id, fullName);
            setExternalId('');

        } catch (error) {
            console.error("Error nominating external user:", error);
            Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการค้นหาข้อมูล: ' + error.message, 'error');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved': return <span className="badge badge-success">อนุมัติแล้ว</span>;
            case 'rejected': return <span className="badge badge-danger">ไม่อนุมัติ</span>;
            default: return <span className="badge badge-warning">รออนุมัติ</span>;
        }
    };

    if (loading) return <div>กำลังโหลดข้อมูล...</div>;

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-12 col-lg-8">
                    <div className="card">
                        <div className="card-header bg-primary text-white">
                            <h3 className="card-title">รายชื่อครูในโรงเรียน</h3>
                        </div>
                        <div className="card-body table-responsive p-0">
                            <table className="table table-hover text-nowrap">
                                <thead>
                                    <tr>
                                        <th>เลขบัตรประชาชน</th>
                                        <th>ชื่อ-สกุล</th>
                                        <th>การจัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teachers.length > 0 ? teachers.map((teacher, index) => (
                                        <tr key={index}>
                                            <td>{teacher.people_id}</td>
                                            <td>{teacher.name} {teacher.lastname}</td>
                                            <td>
                                                <button 
                                                    className="btn btn-sm btn-success"
                                                    onClick={() => handleNominate(teacher.people_id, `${teacher.name} ${teacher.lastname}`)}
                                                >
                                                    <i className="fas fa-user-plus mr-1"></i> เสนอแต่งตั้ง
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="3" className="text-center">ไม่มีข้อมูลครูในโรงเรียน</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card mt-4">
                        <div className="card-header bg-info text-white">
                            <h3 className="card-title">ประวัติการเสนอแต่งตั้ง</h3>
                        </div>
                        <div className="card-body table-responsive p-0">
                            <table className="table table-hover text-nowrap">
                                <thead>
                                    <tr>
                                        <th>เลขบัตรผู้ถูกเสนอ</th>
                                        <th>สถานะ</th>
                                        <th>วันที่เสนอ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {nominations.length > 0 ? nominations.map((nom, index) => (
                                        <tr key={index}>
                                            <td>{nom.nominee_people_id}</td>
                                            <td>{getStatusBadge(nom.status)}</td>
                                            <td>{new Date(nom.created_at).toLocaleDateString('th-TH')}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="3" className="text-center">ยังไม่มีประวัติการเสนอชื่อ</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-4">
                    <div className="card">
                        <div className="card-header bg-secondary text-white">
                            <h3 className="card-title">เสนอชื่อบุคคลภายนอก</h3>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleNominateExternal}>
                                <div className="form-group">
                                    <label>เลขประจำตัวประชาชน 13 หลัก</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="เลขบัตรประชาชนผู้ทรงคุณวุฒิ"
                                        value={externalId}
                                        onChange={(e) => setExternalId(e.target.value)}
                                        maxLength={13}
                                    />
                                    <small className="form-text text-muted">
                                        บุคคลภายนอกต้องลงทะเบียนเข้าสู่ระบบก่อน จึงจะสามารถค้นหาและเสนอชื่อได้
                                    </small>
                                </div>
                                <button type="submit" className="btn btn-primary w-100">
                                    <i className="fas fa-search mr-1"></i> ค้นหาและเสนอชื่อ
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NominateEvaluator;
