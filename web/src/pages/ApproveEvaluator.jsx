import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';

const ApproveEvaluator = () => {
    const [nominations, setNominations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchPending, setSearchPending] = useState('');
    const [searchHistory, setSearchHistory] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch all nominations and join with user info to show names
            const { data: nomData, error: nomError } = await supabase
                .from('tbl_EvaluatorNominations')
                .select('*')
                .order('created_at', { ascending: false });

            if (nomError) {
                if (nomError.code === '42P01') {
                    console.warn("Table tbl_EvaluatorNominations does not exist yet.");
                    setNominations([]);
                } else {
                    throw nomError;
                }
            } else {
                const rawNoms = nomData || [];
                const peopleIds = Array.from(new Set(
                    rawNoms.flatMap(n => [n.nominee_people_id, n.nominated_by]).filter(Boolean)
                ));

                // Fetch referenced users, prefix, school, academic standing, and subject
                const [userRes, prefixRes, schoolRes, academicRes, subjectRes] = await Promise.all([
                    peopleIds.length > 0
                        ? supabase.from('tbl_Users').select('people_id, prefix, name, lastname, school, academic_id, teach_subject').in('people_id', peopleIds)
                        : Promise.resolve({ data: [] }),
                    supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
                    supabase.from('tbl_school').select('school_id, school_name'),
                    supabase.from('tbl_system_Academic_Standing').select('academic_id, academic_standing'),
                    supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject')
                ]);

                const prefixMap = {};
                prefixRes.data?.forEach(p => { prefixMap[p.prefix_id] = p.prefix; });

                const schoolMap = {};
                schoolRes.data?.forEach(s => { schoolMap[s.school_id] = s.school_name; });

                const academicMap = {};
                academicRes.data?.forEach(a => { academicMap[a.academic_id] = a.academic_standing; });

                const subjectMap = {};
                subjectRes.data?.forEach(sub => { subjectMap[sub.teach_subject_id] = sub.teach_subject; });

                const userMap = {};
                userRes.data?.forEach(u => { userMap[u.people_id] = u; });

                const formatUser = (peopleId) => {
                    const u = userMap[peopleId];
                    if (!u) return { name: 'ไม่ทราบชื่อ', school: '', academic: '-', subject: '-' };
                    const prefix = prefixMap[u.prefix] || '';
                    return {
                        name: `${prefix}${u.name} ${u.lastname}`.trim() || 'ไม่ทราบชื่อ',
                        school: schoolMap[u.school] || '',
                        academic: academicMap[u.academic_id] || '-',
                        subject: subjectMap[u.teach_subject] || '-'
                    };
                };

                const enrichedData = rawNoms.map(nom => {
                    const nominee = formatUser(nom.nominee_people_id);
                    const nominator = formatUser(nom.nominated_by);
                    return {
                        ...nom,
                        nominee_name: nominee.name,
                        nominee_school: nominee.school,
                        nominee_academic: nominee.academic,
                        nominee_subject: nominee.subject,
                        nominator_name: nominator.name,
                        nominator_school: nominator.school
                    };
                });
                setNominations(enrichedData);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            Swal.fire('ข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลได้: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (nom, newStatus) => {
        const id = nom.id;
        const nomineePeopleId = nom.nominee_people_id;
        const actionText = newStatus === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ';
        const actionIcon = newStatus === 'approved' ? 'success' : 'warning';
        
        const result = await Swal.fire({
            title: `ยืนยันการ${actionText}?`,
            text: `คุณต้องการ${actionText}การเสนอแต่งตั้งของ "${nom.nominee_name}" ใช่หรือไม่?`,
            icon: actionIcon,
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: newStatus === 'approved' ? '#10b981' : '#ef4444'
        });

        if (result.isConfirmed) {
            setActionLoading(true);
            try {
                const { error } = await supabase
                    .from('tbl_EvaluatorNominations')
                    .update({ status: newStatus, updated_at: new Date() })
                    .eq('id', id);
                
                if (error) throw error;

                // If approved, mark is_evaluator in tbl_Users
                if (newStatus === 'approved' && nomineePeopleId) {
                    await supabase
                        .from('tbl_Users')
                        .update({ is_evaluator: 1 })
                        .eq('people_id', nomineePeopleId);
                }

                Swal.fire('สำเร็จ', `ทำรายการ${actionText}เรียบร้อยแล้ว`, 'success');
                setSelectedIds(prev => prev.filter(item => item !== id));
                fetchData();
            } catch (error) {
                Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้: ' + error.message, 'error');
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleBulkAction = async (targetIds, newStatus) => {
        if (!targetIds || targetIds.length === 0) {
            Swal.fire('แจ้งเตือน', 'กรุณาเลือกรายการที่ต้องการทำรายการ', 'info');
            return;
        }

        const actionText = newStatus === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ';
        const isApprove = newStatus === 'approved';

        const result = await Swal.fire({
            title: `ยืนยันการ${actionText} ${targetIds.length} รายการ?`,
            html: `คุณต้องการ${actionText}การเสนอแต่งตั้งผู้นิเทศที่เลือกจำนวน <b>${targetIds.length}</b> ท่านใช่หรือไม่?`,
            icon: isApprove ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonColor: isApprove ? '#28a745' : '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: `ใช่, ${actionText}ทั้งหมด`,
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            setActionLoading(true);
            try {
                const { error } = await supabase
                    .from('tbl_EvaluatorNominations')
                    .update({ status: newStatus, updated_at: new Date() })
                    .in('id', targetIds);

                if (error) throw error;

                // If approved, update is_evaluator in tbl_Users for nominees
                if (newStatus === 'approved') {
                    const nominees = nominations
                        .filter(n => targetIds.includes(n.id))
                        .map(n => n.nominee_people_id)
                        .filter(Boolean);
                    if (nominees.length > 0) {
                        await supabase
                            .from('tbl_Users')
                            .update({ is_evaluator: 1 })
                            .in('people_id', nominees);
                    }
                }

                Swal.fire('สำเร็จ', `ทำรายการ${actionText} ${targetIds.length} รายการเรียบร้อยแล้ว`, 'success');
                setSelectedIds([]);
                fetchData();
            } catch (error) {
                console.error('Error in bulk action:', error);
                Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้: ' + error.message, 'error');
            } finally {
                setActionLoading(false);
            }
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved': return <span className="badge badge-success px-2 py-1"><i className="fas fa-check-circle mr-1"></i> อนุมัติแล้ว</span>;
            case 'rejected': return <span className="badge badge-danger px-2 py-1"><i className="fas fa-times-circle mr-1"></i> ไม่อนุมัติ</span>;
            default: return <span className="badge badge-warning px-2 py-1 text-dark"><i className="fas fa-clock mr-1"></i> รออนุมัติ</span>;
        }
    };

    const pendingNoms = useMemo(() => nominations.filter(n => n.status === 'pending'), [nominations]);
    const historyNoms = useMemo(() => nominations.filter(n => n.status !== 'pending'), [nominations]);

    const filteredPendingNoms = useMemo(() => {
        if (!searchPending.trim()) return pendingNoms;
        const q = searchPending.trim().toLowerCase();
        return pendingNoms.filter(nom =>
            (nom.nominee_name || '').toLowerCase().includes(q) ||
            (nom.nominee_school || '').toLowerCase().includes(q) ||
            (nom.nominee_people_id || '').includes(q) ||
            (nom.nominator_name || '').toLowerCase().includes(q) ||
            (nom.nominator_school || '').toLowerCase().includes(q)
        );
    }, [pendingNoms, searchPending]);

    const filteredHistoryNoms = useMemo(() => {
        if (!searchHistory.trim()) return historyNoms;
        const q = searchHistory.trim().toLowerCase();
        return historyNoms.filter(nom =>
            (nom.nominee_name || '').toLowerCase().includes(q) ||
            (nom.nominee_school || '').toLowerCase().includes(q) ||
            (nom.nominee_people_id || '').includes(q) ||
            (nom.nominator_name || '').toLowerCase().includes(q) ||
            (nom.nominator_school || '').toLowerCase().includes(q)
        );
    }, [historyNoms, searchHistory]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filteredPendingNoms.map(n => n.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    if (loading) {
        return (
            <div className="text-center p-5">
                <div className="spinner-border text-warning" role="status"></div>
                <p className="mt-2 text-muted">กำลังโหลดข้อมูลการเสนอแต่งตั้งผู้นิเทศ...</p>
            </div>
        );
    }

    return (
        <div className="container-fluid py-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                    <h4 className="font-weight-bold text-dark mb-1">
                        <i className="fa-solid fa-user-check text-success mr-2"></i> พิจารณาแต่งตั้งผู้นิเทศ / คณะกรรมการประเมิน
                    </h4>
                    <p className="text-muted small mb-0">
                        สำหรับผู้ดูแลระบบเขตพื้นที่ฯ อนุมัติรายชื่อผู้นิเทศที่ผู้บริหารสถานศึกษาเสนอเข้ามา
                    </p>
                </div>
            </div>

            {/* Pending Nominations Card */}
            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h5 className="font-weight-bold mb-0 text-dark">
                        <i className="fa-solid fa-hourglass-start text-warning mr-2"></i> รายการรอการพิจารณา
                        <span className="badge badge-warning ml-2 text-dark font-weight-bold">{pendingNoms.length}</span>
                    </h5>
                    
                    <div className="d-flex align-items-center gap-2">
                        {selectedIds.length > 0 && (
                            <div className="btn-group btn-group-sm">
                                <button
                                    type="button"
                                    className="btn btn-success font-weight-bold"
                                    disabled={actionLoading}
                                    onClick={() => handleBulkAction(selectedIds, 'approved')}
                                >
                                    <i className="fa-solid fa-check-double mr-1"></i> อนุมัติที่เลือก ({selectedIds.length})
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger font-weight-bold"
                                    disabled={actionLoading}
                                    onClick={() => handleBulkAction(selectedIds, 'rejected')}
                                >
                                    <i className="fa-solid fa-times mr-1"></i> ปฏิเสธที่เลือก
                                </button>
                            </div>
                        )}
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="ค้นหาชื่อ, โรงเรียน..."
                            style={{ maxWidth: '220px' }}
                            value={searchPending}
                            onChange={(e) => setSearchPending(e.target.value)}
                        />
                    </div>
                </div>

                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th style={{ width: '40px' }} className="text-center">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={filteredPendingNoms.length > 0 && selectedIds.length === filteredPendingNoms.length}
                                            disabled={filteredPendingNoms.length === 0}
                                        />
                                    </th>
                                    <th>ผู้ได้รับการเสนอชื่อ</th>
                                    <th>วิทยฐานะ / กลุ่มสาระ</th>
                                    <th>สถานศึกษา</th>
                                    <th>ผู้เสนอชื่อ (ผอ.)</th>
                                    <th>วันที่เสนอ</th>
                                    <th style={{ width: '160px' }} className="text-center">การจัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPendingNoms.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4 text-muted">
                                            {searchPending ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา' : 'ไม่มีรายการรอการอนุมัติในขณะนี้'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPendingNoms.map((nom) => (
                                        <tr key={nom.id}>
                                            <td className="text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(nom.id)}
                                                    onChange={() => handleSelectRow(nom.id)}
                                                />
                                            </td>
                                            <td>
                                                <div className="font-weight-bold text-dark">{nom.nominee_name}</div>
                                                <div className="text-muted small" style={{ fontSize: '11px' }}>
                                                    {nom.nominee_people_id}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge badge-light border text-dark font-weight-normal d-block mb-1">
                                                    {nom.nominee_academic}
                                                </span>
                                                <span className="text-muted small">
                                                    {nom.nominee_subject}
                                                </span>
                                            </td>
                                            <td className="small">{nom.nominee_school || '-'}</td>
                                            <td>
                                                <div className="small font-weight-bold">{nom.nominator_name}</div>
                                                <div className="text-muted small" style={{ fontSize: '11px' }}>
                                                    {nom.nominator_school}
                                                </div>
                                            </td>
                                            <td className="small text-muted">
                                                {nom.created_at ? new Date(nom.created_at).toLocaleDateString('th-TH') : '-'}
                                            </td>
                                            <td className="text-center">
                                                <div className="btn-group btn-group-sm">
                                                    <button
                                                        type="button"
                                                        className="btn btn-success font-weight-bold px-2"
                                                        disabled={actionLoading}
                                                        onClick={() => handleAction(nom, 'approved')}
                                                        title="อนุมัติแต่งตั้ง"
                                                    >
                                                        <i className="fa-solid fa-check mr-1"></i> อนุมัติ
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger px-2"
                                                        disabled={actionLoading}
                                                        onClick={() => handleAction(nom, 'rejected')}
                                                        title="ปฏิเสธ"
                                                    >
                                                        <i className="fa-solid fa-xmark"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h5 className="font-weight-bold mb-0 text-dark">
                        <i className="fa-solid fa-clock-rotate-left text-secondary mr-2"></i> ประวัติการพิจารณาแต่งตั้ง
                        <span className="badge badge-secondary ml-2">{historyNoms.length}</span>
                    </h5>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="ค้นหาประวัติ..."
                        style={{ maxWidth: '220px' }}
                        value={searchHistory}
                        onChange={(e) => setSearchHistory(e.target.value)}
                    />
                </div>

                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th style={{ width: '45px' }} className="text-center">#</th>
                                    <th>ผู้ได้รับการเสนอชื่อ</th>
                                    <th>สถานศึกษา</th>
                                    <th>ผู้เสนอชื่อ</th>
                                    <th>วันที่ดำเนินการ</th>
                                    <th style={{ width: '130px' }} className="text-center">ผลการพิจารณา</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredHistoryNoms.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-4 text-muted">
                                            {searchHistory ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา' : 'ยังไม่มีประวัติการพิจารณา'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredHistoryNoms.map((nom, idx) => (
                                        <tr key={nom.id}>
                                            <td className="text-center text-muted small">{idx + 1}</td>
                                            <td>
                                                <div className="font-weight-bold text-dark">{nom.nominee_name}</div>
                                                <div className="text-muted small" style={{ fontSize: '11px' }}>
                                                    {nom.nominee_academic} • {nom.nominee_subject}
                                                </div>
                                            </td>
                                            <td className="small">{nom.nominee_school || '-'}</td>
                                            <td className="small">{nom.nominator_name}</td>
                                            <td className="small text-muted">
                                                {nom.updated_at ? new Date(nom.updated_at).toLocaleDateString('th-TH') : '-'}
                                            </td>
                                            <td className="text-center">
                                                {getStatusBadge(nom.status)}
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
    );
};

export default ApproveEvaluator;
