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
                    console.warn("Table tbl_EvaluatorNominations does not exist yet. Please run the SQL schema script.");
                    setNominations([]);
                } else {
                    throw nomError;
                }
            } else {
                const rawNoms = nomData || [];
                const peopleIds = Array.from(new Set(
                    rawNoms.flatMap(n => [n.nominee_people_id, n.nominated_by]).filter(Boolean)
                ));

                // Fetch only users referenced in the nominations, along with prefix and school lookups
                const [userRes, prefixRes, schoolRes] = await Promise.all([
                    peopleIds.length > 0
                        ? supabase.from('tbl_Users').select('people_id, prefix, name, lastname, school').in('people_id', peopleIds)
                        : Promise.resolve({ data: [] }),
                    supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
                    supabase.from('tbl_school').select('school_id, school_name')
                ]);

                const prefixMap = {};
                prefixRes.data?.forEach(p => { prefixMap[p.prefix_id] = p.prefix; });

                const schoolMap = {};
                schoolRes.data?.forEach(s => { schoolMap[s.school_id] = s.school_name; });

                const userMap = {};
                userRes.data?.forEach(u => { userMap[u.people_id] = u; });

                const formatUser = (peopleId) => {
                    const u = userMap[peopleId];
                    if (!u) return { name: 'ไม่ทราบชื่อ', school: '' };
                    const prefix = prefixMap[u.prefix] || '';
                    return {
                        name: `${prefix}${u.name} ${u.lastname}`.trim() || 'ไม่ทราบชื่อ',
                        school: schoolMap[u.school] || ''
                    };
                };

                const enrichedData = rawNoms.map(nom => {
                    const nominee = formatUser(nom.nominee_people_id);
                    const nominator = formatUser(nom.nominated_by);
                    return {
                        ...nom,
                        nominee_name: nominee.name,
                        nominee_school: nominee.school,
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

    const handleAction = async (id, newStatus) => {
        const actionText = newStatus === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ';
        const actionIcon = newStatus === 'approved' ? 'success' : 'warning';
        
        const result = await Swal.fire({
            title: `ยืนยันการ${actionText}?`,
            text: `คุณต้องการ${actionText}การเสนอแต่งตั้งนี้ใช่หรือไม่?`,
            icon: actionIcon,
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            setActionLoading(true);
            try {
                const { error } = await supabase
                    .from('tbl_EvaluatorNominations')
                    .update({ status: newStatus, updated_at: new Date() })
                    .eq('id', id);
                
                if (error) throw error;

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
            default: return <span className="badge badge-warning px-2 py-1"><i className="fas fa-clock mr-1"></i> รออนุมัติ</span>;
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

    const isAllSelected = filteredPendingNoms.length > 0 && selectedIds.length === filteredPendingNoms.length;

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-12">
                    {/* Pending Nominations Card */}
                    <div className="card card-warning card-outline">
                        <div className="card-header d-flex flex-wrap justify-content-between align-items-center py-2">
                            <h3 className="card-title m-0 font-weight-bold">
                                <i className="fa-solid fa-user-check mr-2 text-warning"></i>
                                รายการรออนุมัติ
                                <span className="badge badge-warning ml-2 font-weight-normal" style={{ fontSize: '0.9rem' }}>
                                    {pendingNoms.length} รายการ
                                </span>
                            </h3>

                            {/* Action Buttons Toolbar */}
                            <div className="card-tools ml-auto d-flex flex-wrap align-items-center" style={{ gap: '0.5rem' }}>
                                {pendingNoms.length > 0 && (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-success font-weight-bold"
                                            onClick={() => handleBulkAction(pendingNoms.map(n => n.id), 'approved')}
                                            disabled={actionLoading}
                                            title="อนุมัติทุกรายการที่รออยู่ทันที"
                                        >
                                            <i className="fa-solid fa-circle-check mr-1"></i> อนุมัติทั้งหมด ({pendingNoms.length})
                                        </button>

                                        <button
                                            type="button"
                                            className={`btn btn-sm ${selectedIds.length > 0 ? 'btn-success' : 'btn-secondary'} font-weight-bold`}
                                            onClick={() => handleBulkAction(selectedIds, 'approved')}
                                            disabled={selectedIds.length === 0 || actionLoading}
                                            title="อนุมัติเฉพาะรายการที่เลือก"
                                        >
                                            <i className="fa-solid fa-check-double mr-1"></i> อนุมัติที่เลือก ({selectedIds.length})
                                        </button>

                                        {selectedIds.length > 0 && (
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => handleBulkAction(selectedIds, 'rejected')}
                                                disabled={actionLoading}
                                                title="ปฏิเสธรายการที่เลือก"
                                            >
                                                <i className="fa-solid fa-times mr-1"></i> ปฏิเสธที่เลือก
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="card-body p-3">
                            {/* Filter & Selection Summary */}
                            <div className="row g-2 mb-3 align-items-center">
                                <div className="col-md-6 col-lg-5">
                                    <div className="input-group input-group-sm">
                                        <div className="input-group-prepend">
                                            <span className="input-group-text"><i className="fas fa-search"></i></span>
                                        </div>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="ค้นหาชื่อครู, โรงเรียน, เลขบัตร, หรือผู้เสนอ..."
                                            value={searchPending}
                                            onChange={(e) => setSearchPending(e.target.value)}
                                        />
                                        {searchPending && (
                                            <div className="input-group-append">
                                                <button className="btn btn-outline-secondary" type="button" onClick={() => setSearchPending('')}>
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="col-md-6 col-lg-7 text-md-right mt-2 mt-md-0">
                                    {selectedIds.length > 0 ? (
                                        <span className="badge badge-info p-2 font-weight-normal mr-2" style={{ fontSize: '0.85rem' }}>
                                            <i className="fas fa-check-square mr-1"></i> เลือกแล้ว <strong>{selectedIds.length}</strong> จาก {filteredPendingNoms.length} รายการ
                                        </span>
                                    ) : (
                                        <small className="text-muted mr-2">
                                            ติ๊กเลือกรายการเพื่ออนุมัติพร้อมกันหลายคน หรือกดปุ่ม <strong>"อนุมัติทั้งหมด"</strong> ได้ทันที
                                        </small>
                                    )}

                                    {selectedIds.length > 0 && (
                                        <button
                                            type="button"
                                            className="btn btn-xs btn-outline-secondary"
                                            onClick={() => setSelectedIds([])}
                                        >
                                            ยกเลิกการเลือก
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Pending Table */}
                            <div className="table-responsive">
                                <table className="table table-bordered table-hover text-nowrap">
                                    <thead className="thead-light">
                                        <tr>
                                            <th width="4%" className="text-center">
                                                <input
                                                    type="checkbox"
                                                    onChange={handleSelectAll}
                                                    checked={isAllSelected}
                                                    disabled={filteredPendingNoms.length === 0}
                                                    title={isAllSelected ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมด"}
                                                    style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                                                />
                                            </th>
                                            <th width="5%" className="text-center">ที่</th>
                                            <th width="12%">วันที่เสนอ</th>
                                            <th width="32%">ผู้ถูกเสนอแต่งตั้ง (ครูผู้นิเทศ)</th>
                                            <th width="27%">เสนอโดย (ผู้บริหาร)</th>
                                            <th width="20%" className="text-center">การจัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPendingNoms.length > 0 ? filteredPendingNoms.map((nom, idx) => {
                                            const isSelected = selectedIds.includes(nom.id);
                                            return (
                                                <tr
                                                    key={nom.id}
                                                    className={isSelected ? 'table-success' : ''}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={(e) => {
                                                        // Prevent row click when clicking action buttons directly
                                                        if (e.target.closest('button') || e.target.closest('a')) return;
                                                        handleSelectRow(nom.id);
                                                    }}
                                                >
                                                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleSelectRow(nom.id)}
                                                            style={{ cursor: 'pointer', transform: 'scale(1.15)' }}
                                                        />
                                                    </td>
                                                    <td className="text-center text-muted">{idx + 1}</td>
                                                    <td>
                                                        <i className="far fa-calendar-alt mr-1 text-muted"></i>
                                                        {new Date(nom.created_at).toLocaleDateString('th-TH', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </td>
                                                    <td>
                                                        <div className="font-weight-bold text-primary" style={{ fontSize: '1rem' }}>
                                                            {nom.nominee_name}
                                                        </div>
                                                        <div className="text-muted small">
                                                            {nom.nominee_school ? (
                                                                <>
                                                                    <i className="fas fa-school mr-1 text-info"></i>
                                                                    <strong>{nom.nominee_school}</strong>
                                                                    <span className="mx-1">•</span>
                                                                </>
                                                            ) : null}
                                                            <code>{nom.nominee_people_id}</code>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="font-weight-bold text-dark">
                                                            {nom.nominator_name}
                                                        </div>
                                                        <div className="text-muted small">
                                                            {nom.nominator_school ? (
                                                                <>
                                                                    <i className="fas fa-building mr-1"></i>
                                                                    {nom.nominator_school}
                                                                </>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                        <div className="btn-group">
                                                            <button 
                                                                type="button"
                                                                className="btn btn-sm btn-success"
                                                                onClick={() => handleAction(nom.id, 'approved')}
                                                                disabled={actionLoading}
                                                                title="อนุมัติรายการนี้"
                                                            >
                                                                <i className="fas fa-check mr-1"></i> อนุมัติ
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                className="btn btn-sm btn-outline-danger"
                                                                onClick={() => handleAction(nom.id, 'rejected')}
                                                                disabled={actionLoading}
                                                                title="ปฏิเสธรายการนี้"
                                                            >
                                                                <i className="fas fa-times mr-1"></i> ปฏิเสธ
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan="6" className="text-center text-muted py-4">
                                                    <i className="fas fa-inbox fa-2x mb-2 text-muted"></i>
                                                    <p className="mb-0">
                                                        {searchPending ? 'ไม่พบรายการรออนุมัติตามคำค้นหา' : 'ไม่มีรายการรออนุมัติในขณะนี้'}
                                                    </p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* History Card */}
                    <div className="card card-secondary card-outline mt-4">
                        <div className="card-header d-flex flex-wrap justify-content-between align-items-center py-2">
                            <h3 className="card-title m-0">
                                <i className="fa-solid fa-clock-rotate-left mr-2 text-secondary"></i>
                                ประวัติการอนุมัติ
                                <span className="badge badge-secondary ml-2 font-weight-normal" style={{ fontSize: '0.85rem' }}>
                                    {historyNoms.length} รายการ
                                </span>
                            </h3>

                            {/* Search History */}
                            <div className="card-tools ml-auto">
                                <div className="input-group input-group-sm" style={{ width: '250px' }}>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="ค้นหาในประวัติ..."
                                        value={searchHistory}
                                        onChange={(e) => setSearchHistory(e.target.value)}
                                    />
                                    {searchHistory && (
                                        <div className="input-group-append">
                                            <button className="btn btn-outline-secondary" type="button" onClick={() => setSearchHistory('')}>
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="card-body p-3">
                            <div className="table-responsive">
                                <table className="table table-bordered table-striped table-hover text-nowrap">
                                    <thead className="thead-light">
                                        <tr>
                                            <th width="5%" className="text-center">ที่</th>
                                            <th width="12%">วันที่เสนอ</th>
                                            <th width="30%">ผู้ถูกเสนอแต่งตั้ง (ครูผู้นิเทศ)</th>
                                            <th width="28%">เสนอโดย (ผู้บริหาร)</th>
                                            <th width="12%" className="text-center">สถานะ</th>
                                            <th width="13%" className="text-center">อัพเดทล่าสุด</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredHistoryNoms.length > 0 ? filteredHistoryNoms.map((nom, idx) => (
                                            <tr key={nom.id}>
                                                <td className="text-center text-muted">{idx + 1}</td>
                                                <td>
                                                    <i className="far fa-calendar-alt mr-1 text-muted"></i>
                                                    {new Date(nom.created_at).toLocaleDateString('th-TH', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </td>
                                                <td>
                                                    <div className="font-weight-bold text-dark">
                                                        {nom.nominee_name}
                                                    </div>
                                                    <div className="text-muted small">
                                                        {nom.nominee_school ? `${nom.nominee_school} • ` : ''}
                                                        <code>{nom.nominee_people_id}</code>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="font-weight-bold text-dark">
                                                        {nom.nominator_name}
                                                    </div>
                                                    <div className="text-muted small">
                                                        {nom.nominator_school || '-'}
                                                    </div>
                                                </td>
                                                <td className="text-center">{getStatusBadge(nom.status)}</td>
                                                <td className="text-center text-muted small">
                                                    {nom.updated_at ? new Date(nom.updated_at).toLocaleDateString('th-TH', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) : '-'}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="6" className="text-center text-muted py-4">
                                                    <i className="fas fa-history fa-2x mb-2 text-muted"></i>
                                                    <p className="mb-0">
                                                        {searchHistory ? 'ไม่พบประวัติตามคำค้นหา' : 'ไม่มีประวัติการทำรายการ'}
                                                    </p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApproveEvaluator;
