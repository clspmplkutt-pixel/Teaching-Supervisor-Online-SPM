import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import { maskThaiId } from '../utils/scoreCalculator';
import LoadingSpinner from '../components/LoadingSpinner';
import Swal from 'sweetalert2';

const NominateEvaluator = () => {
    const { profile, loading: profileLoading } = useUserProfile();
    const [teachers, setTeachers] = useState([]);
    const [nominations, setNominations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [externalId, setExternalId] = useState('');
    const [lookups, setLookups] = useState({
        prefix: {},
        academic: {},
        teachSubject: {},
        position: {},
    });

    const directorPeopleId = profile?.people_id;
    const schoolId = profile?.school;

    const fetchData = useCallback(async () => {
        if (!schoolId && !directorPeopleId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [teacherRes, nomRes, prefixRes, academicRes, subjectRes, positionRes] = await Promise.all([
                // Fetch teachers in the same school
                supabase
                    .from('tbl_Users')
                    .select('id, people_id, prefix, name, lastname, position_id, academic_id, teach_subject, level, school')
                    .eq('school', schoolId)
                    .in('level', ['teacher', 'headdepartment'])
                    .order('name', { ascending: true }),
                // Fetch current nominations made by this director
                supabase
                    .from('tbl_EvaluatorNominations')
                    .select('*')
                    .eq('nominated_by', directorPeopleId)
                    .order('created_at', { ascending: false }),
                supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
                supabase.from('tbl_system_Academic_Standing').select('academic_id, academic_standing'),
                supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject'),
                supabase.from('tbl_system_PersonPositionType').select('position_id, position_name'),
            ]);

            const pMap = {};
            prefixRes.data?.forEach(p => { pMap[p.prefix_id] = p.prefix; });
            const aMap = {};
            academicRes.data?.forEach(a => { aMap[a.academic_id] = a.academic_standing; });
            const sMap = {};
            subjectRes.data?.forEach(s => { sMap[s.teach_subject_id] = s.teach_subject; });
            const posMap = {};
            positionRes.data?.forEach(pos => { posMap[pos.position_id] = pos.position_name; });

            setLookups({
                prefix: pMap,
                academic: aMap,
                teachSubject: sMap,
                position: posMap,
            });

            setTeachers(teacherRes.data || []);

            if (nomRes.error) {
                if (nomRes.error.code === '42P01') {
                    console.warn("Table tbl_EvaluatorNominations does not exist yet.");
                    setNominations([]);
                } else {
                    throw nomRes.error;
                }
            } else {
                setNominations(nomRes.data || []);
            }
        } catch (error) {
            console.error("Error fetching nomination data:", error);
            Swal.fire('ข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลได้: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [schoolId, directorPeopleId]);

    useEffect(() => {
        if (!profileLoading) {
            fetchData();
        }
    }, [profileLoading, fetchData]);

    const nominatedMap = useMemo(() => {
        const map = {};
        nominations.forEach(n => {
            map[n.nominee_people_id] = n.status;
        });
        return map;
    }, [nominations]);

    const filteredTeachers = useMemo(() => {
        if (!searchTerm.trim()) return teachers;
        const q = searchTerm.toLowerCase();
        return teachers.filter(t => {
            const fullName = `${lookups.prefix[t.prefix] || ''}${t.name} ${t.lastname}`.toLowerCase();
            const subject = (lookups.teachSubject[t.teach_subject] || '').toLowerCase();
            const academic = (lookups.academic[t.academic_id] || '').toLowerCase();
            return fullName.includes(q) || subject.includes(q) || academic.includes(q) || (t.people_id || '').includes(q);
        });
    }, [teachers, searchTerm, lookups]);

    const handleNominate = async (nomineePeopleId, nomineeName) => {
        if (nominatedMap[nomineePeopleId]) {
            Swal.fire('แจ้งเตือน', 'บุคคลนี้ได้รับการเสนอชื่อแล้ว', 'warning');
            return;
        }

        const result = await Swal.fire({
            title: 'ยืนยันการเสนอแต่งตั้ง?',
            text: `คุณต้องการเสนอชื่อ "${nomineeName}" เพื่อแต่งตั้งเป็นผู้นิเทศ/คณะกรรมการประเมิน ใช่หรือไม่?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันการเสนอชื่อ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#2563eb',
        });

        if (result.isConfirmed) {
            try {
                const { error } = await supabase
                    .from('tbl_EvaluatorNominations')
                    .insert([{
                        nominee_people_id: nomineePeopleId,
                        nominated_by: directorPeopleId,
                        status: 'pending'
                    }]);

                if (error) {
                    if (error.code === '42P01') {
                        throw new Error("ตาราง tbl_EvaluatorNominations ยังไม่ถูกสร้างในฐานข้อมูล");
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
        if (!externalId.trim()) return;

        try {
            // Verify if user exists
            const { data: extUser, error: extError } = await supabase
                .from('tbl_Users')
                .select('people_id, prefix, name, lastname')
                .eq('people_id', externalId.trim())
                .maybeSingle();

            if (extError) throw extError;
            if (!extUser) {
                Swal.fire('ไม่พบผู้ใช้', 'ไม่พบข้อมูลผู้ใช้งานด้วยเลขประจำตัวประชาชนนี้ในระบบ', 'warning');
                return;
            }

            const extName = `${lookups.prefix[extUser.prefix] || ''}${extUser.name} ${extUser.lastname}`.trim();
            handleNominate(extUser.people_id, extName);
            setExternalId('');
        } catch (err) {
            Swal.fire('ข้อผิดพลาด', err.message, 'error');
        }
    };

    if (loading || profileLoading) {
        return <LoadingSpinner title="เสนอแต่งตั้งผู้นิเทศ" message="กำลังโหลดข้อมูลครูและประวัติการเสนอชื่อ..." />;
    }

    return (
        <div className="container-fluid py-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                    <h4 className="font-weight-bold text-dark mb-1">
                        <i className="fa-solid fa-user-shield text-primary mr-2"></i> เสนอแต่งตั้งผู้นิเทศภายในสถานศึกษา
                    </h4>
                    <p className="text-muted small mb-0">
                        ผู้อำนวยการสถานศึกษาเสนอชื่อครูผู้มีคุณสมบัติ (คศ.2 ขึ้นไป หรือหัวหน้ากลุ่มสาระ) เพื่อแต่งตั้งเป็นคณะกรรมการประเมิน
                    </p>
                </div>
            </div>

            <div className="row">
                {/* ── ครูในสถานศึกษา ── */}
                <div className="col-lg-8">
                    <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
                        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <h5 className="font-weight-bold mb-0 text-dark">
                                <i className="fa-solid fa-users text-primary mr-2"></i> รายชื่อครูในโรงเรียน
                                <span className="badge badge-light border ml-2">{filteredTeachers.length} ท่าน</span>
                            </h5>
                            <div style={{ maxWidth: '280px', width: '100%' }}>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="ค้นหาชื่อ, กลุ่มสาระ, วิทยฐานะ..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th style={{ width: '45px' }} className="text-center">#</th>
                                            <th>ชื่อ - สกุล</th>
                                            <th>วิทยฐานะ</th>
                                            <th>กลุ่มสาระการเรียนรู้</th>
                                            <th style={{ width: '140px' }} className="text-center">สถานะ / ดำเนินการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTeachers.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="text-center py-4 text-muted">
                                                    ไม่พบรายชื่อครูที่ตรงกับเงื่อนไข
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredTeachers.map((t, idx) => {
                                                const fullName = `${lookups.prefix[t.prefix] || ''}${t.name} ${t.lastname}`.trim();
                                                const nomStatus = nominatedMap[t.people_id];
                                                const isNominated = Boolean(nomStatus);

                                                return (
                                                    <tr key={t.id || t.people_id}>
                                                        <td className="text-center text-muted small">{idx + 1}</td>
                                                        <td>
                                                            <div className="font-weight-bold text-dark">{fullName}</div>
                                                            <div className="text-muted small" style={{ fontSize: '11px' }}>
                                                                เลข ปชช.: {maskThaiId(t.people_id)}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className="badge badge-light border text-dark font-weight-normal">
                                                                {lookups.academic[t.academic_id] || 'ครูผู้ช่วย/ครู'}
                                                            </span>
                                                        </td>
                                                        <td className="small text-muted">
                                                            {lookups.teachSubject[t.teach_subject] || '-'}
                                                        </td>
                                                        <td className="text-center">
                                                            {isNominated ? (
                                                                nomStatus === 'approved' ? (
                                                                    <span className="badge badge-success px-2 py-1">
                                                                        <i className="fa-solid fa-check mr-1"></i> ได้รับแต่งตั้งแล้ว
                                                                    </span>
                                                                ) : nomStatus === 'rejected' ? (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-outline-warning btn-sm"
                                                                        onClick={() => handleNominate(t.people_id, fullName)}
                                                                    >
                                                                        <i className="fa-solid fa-redo mr-1"></i> เสนอใหม่
                                                                    </button>
                                                                ) : (
                                                                    <span className="badge badge-warning px-2 py-1 text-dark">
                                                                        <i className="fa-solid fa-clock mr-1"></i> รออนุมัติ
                                                                    </span>
                                                                )
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-primary btn-sm px-3"
                                                                    style={{ borderRadius: '20px' }}
                                                                    onClick={() => handleNominate(t.people_id, fullName)}
                                                                >
                                                                    <i className="fa-solid fa-user-plus mr-1"></i> เสนอชื่อ
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── เสนอชื่อครูต่างโรงเรียน + ประวัติการเสนอชื่อ ── */}
                <div className="col-lg-4">
                    {/* เสนอนอกสถานศึกษา */}
                    <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
                        <div className="card-header bg-white py-3 border-bottom">
                            <h6 className="font-weight-bold mb-0 text-dark">
                                <i className="fa-solid fa-user-tag text-info mr-2"></i> เสนอชื่อครู/ผู้ทรงคุณวุฒิต่างสถานศึกษา
                            </h6>
                        </div>
                        <div className="card-body p-3">
                            <form onSubmit={handleNominateExternal}>
                                <div className="form-group mb-2">
                                    <label className="small text-muted mb-1">เลขประจำตัวประชาชน (13 หลัก):</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="ระบุเลขประจำตัวประชาชน 13 หลัก"
                                        value={externalId}
                                        maxLength={13}
                                        onChange={(e) => setExternalId(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-info btn-sm btn-block font-weight-bold"
                                    disabled={externalId.length !== 13}
                                >
                                    <i className="fa-solid fa-search mr-1"></i> ตรวจสอบและเสนอชื่อ
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* รายการที่เสนอชื่อไว้ */}
                    <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
                        <div className="card-header bg-white py-3 border-bottom">
                            <h6 className="font-weight-bold mb-0 text-dark">
                                <i className="fa-solid fa-clipboard-check text-success mr-2"></i> ประวัติการเสนอชื่อ ({nominations.length})
                            </h6>
                        </div>
                        <div className="card-body p-0">
                            {nominations.length === 0 ? (
                                <div className="text-center py-4 text-muted small">
                                    ยังไม่มีประวัติการเสนอชื่อ
                                </div>
                            ) : (
                                <ul className="list-group list-group-flush small">
                                    {nominations.map((nom) => {
                                        const nomTeacher = teachers.find(t => t.people_id === nom.nominee_people_id);
                                        const displayName = nomTeacher
                                            ? `${lookups.prefix[nomTeacher.prefix] || ''}${nomTeacher.name} ${nomTeacher.lastname}`
                                            : maskThaiId(nom.nominee_people_id);

                                        return (
                                            <li key={nom.id} className="list-group-item d-flex justify-content-between align-items-center py-2 px-3">
                                                <div>
                                                    <div className="font-weight-bold text-dark">{displayName}</div>
                                                    <div className="text-muted" style={{ fontSize: '11px' }}>
                                                        {nom.created_at ? new Date(nom.created_at).toLocaleDateString('th-TH') : '-'}
                                                    </div>
                                                </div>
                                                <div>
                                                    {nom.status === 'approved' && (
                                                        <span className="badge badge-success px-2 py-1">อนุมัติแล้ว</span>
                                                    )}
                                                    {nom.status === 'rejected' && (
                                                        <span className="badge badge-danger px-2 py-1">ไม่อนุมัติ</span>
                                                    )}
                                                    {nom.status === 'pending' && (
                                                        <span className="badge badge-warning text-dark px-2 py-1">รออนุมัติ</span>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NominateEvaluator;
