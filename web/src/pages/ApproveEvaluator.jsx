import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Swal from 'sweetalert2';

const ApproveEvaluator = () => {
    const [nominations, setNominations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

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
                // Enrich data with names (in a real app you might use a DB view or join, but here we can do it manually or rely on UI)
                // For simplicity we will fetch all users and map them
                const { data: users, error: userError } = await supabase.from('tbl_Users').select('people_id, name, lastname');
                
                let enrichedData = nomData || [];
                if (!userError && users) {
                    enrichedData = enrichedData.map(nom => {
                        const nominee = users.find(u => u.people_id === nom.nominee_people_id);
                        const nominator = users.find(u => u.people_id === nom.nominated_by);
                        return {
                            ...nom,
                            nominee_name: nominee ? `${nominee.name} ${nominee.lastname}` : 'ไม่ทราบชื่อ',
                            nominator_name: nominator ? `${nominator.name} ${nominator.lastname}` : 'ไม่ทราบชื่อ'
                        };
                    });
                }
                setNominations(enrichedData);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            Swal.fire('ข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลได้: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

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
            try {
                const { error } = await supabase
                    .from('tbl_EvaluatorNominations')
                    .update({ status: newStatus, updated_at: new Date() })
                    .eq('id', id);
                
                if (error) throw error;

                Swal.fire('สำเร็จ', `ทำรายการ${actionText}เรียบร้อยแล้ว`, 'success');
                fetchData();
            } catch (error) {
                Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้: ' + error.message, 'error');
            }
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved': return <span className="badge badge-success">อนุมัติแล้ว</span>;
            case 'rejected': return <span className="badge badge-danger">ไม่อนุมัติ</span>;
            default: return <span className="badge badge-warning">รออนุมัติ</span>;
        }
    };

    const pendingNoms = nominations.filter(n => n.status === 'pending');
    const historyNoms = nominations.filter(n => n.status !== 'pending');

    if (loading) return <div>กำลังโหลดข้อมูล...</div>;

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header bg-warning text-dark">
                            <h3 className="card-title">รายการรออนุมัติ ({pendingNoms.length})</h3>
                        </div>
                        <div className="card-body table-responsive p-0">
                            <table className="table table-hover text-nowrap">
                                <thead>
                                    <tr>
                                        <th>วันที่เสนอ</th>
                                        <th>ผู้ถูกเสนอแต่งตั้ง</th>
                                        <th>เสนอโดย (ผอ.)</th>
                                        <th>การจัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingNoms.length > 0 ? pendingNoms.map((nom) => (
                                        <tr key={nom.id}>
                                            <td>{new Date(nom.created_at).toLocaleDateString('th-TH')}</td>
                                            <td>{nom.nominee_name} <br/><small className="text-muted">{nom.nominee_people_id}</small></td>
                                            <td>{nom.nominator_name} <br/><small className="text-muted">{nom.nominated_by}</small></td>
                                            <td>
                                                <button 
                                                    className="btn btn-sm btn-success mr-2"
                                                    onClick={() => handleAction(nom.id, 'approved')}
                                                >
                                                    <i className="fas fa-check"></i> อนุมัติ
                                                </button>
                                                <button 
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => handleAction(nom.id, 'rejected')}
                                                >
                                                    <i className="fas fa-times"></i> ปฏิเสธ
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="text-center">ไม่มีรายการรออนุมัติ</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card mt-4">
                        <div className="card-header bg-secondary text-white">
                            <h3 className="card-title">ประวัติการอนุมัติ</h3>
                        </div>
                        <div className="card-body table-responsive p-0">
                            <table className="table table-hover text-nowrap">
                                <thead>
                                    <tr>
                                        <th>วันที่เสนอ</th>
                                        <th>ผู้ถูกเสนอแต่งตั้ง</th>
                                        <th>เสนอโดย (ผอ.)</th>
                                        <th>สถานะ</th>
                                        <th>อัพเดทล่าสุด</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyNoms.length > 0 ? historyNoms.map((nom) => (
                                        <tr key={nom.id}>
                                            <td>{new Date(nom.created_at).toLocaleDateString('th-TH')}</td>
                                            <td>{nom.nominee_name}</td>
                                            <td>{nom.nominator_name}</td>
                                            <td>{getStatusBadge(nom.status)}</td>
                                            <td>{nom.updated_at ? new Date(nom.updated_at).toLocaleDateString('th-TH') : ''}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="text-center">ไม่มีประวัติการทำรายการ</td>
                                        </tr>
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

export default ApproveEvaluator;
