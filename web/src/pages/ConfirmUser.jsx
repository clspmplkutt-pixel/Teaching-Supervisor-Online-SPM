import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useUserLookups from '../hooks/useUserLookups';

const ConfirmUser = () => {
  const { lookups, loading: lookupsLoading } = useUserLookups();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tbl_Users')
        .select('*')
        .eq('level', 'teacher')
        .eq('register_isConfirm', '0')
        .order('school', { ascending: true })
        .order('academic_id', { ascending: true })
        .order('position_id', { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleConfirm = async (id) => {
    try {
      const { error } = await supabase
        .from('tbl_Users')
        .update({ register_isConfirm: '1' })
        .eq('id', id);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'ยืนยันผู้ใช้งานแล้ว', 'success');
      loadUsers();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ผิดพลาดในการยืนยัน', 'error');
    }
  };

  const handleBulkConfirm = async () => {
    if (selectedIds.length === 0) {
      Swal.fire('แจ้งเตือน', 'กรุณาเลือกผู้ใช้งานที่ต้องการอนุมัติ', 'info');
      return;
    }
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('tbl_Users')
        .update({ register_isConfirm: '1' })
        .in('id', selectedIds);
        
      if (error) throw error;
      Swal.fire('สำเร็จ', `ยืนยันผู้ใช้งาน ${selectedIds.length} รายการแล้ว`, 'success');
      setSelectedIds([]);
      loadUsers();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ผิดพลาดในการยืนยันรายการทั้งหมด', 'error');
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(rows.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (e, id) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  if (loading || lookupsLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-success">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h3 className="card-title m-0"><i className="fa-solid fa-school-circle-check"></i> ยืนยันผู้ใช้งาน</h3>
            {rows.length > 0 && (
                <button type="button" className="btn btn-primary btn-sm ml-auto" onClick={handleBulkConfirm} disabled={selectedIds.length === 0}>
                    <i className="fa-solid fa-users"></i> อนุมัติเป้าหมายที่เลือก ({selectedIds.length})
                </button>
            )}
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead>
                  <tr>
                    <th width="5%" className="text-center">
                        <input type="checkbox" onChange={handleSelectAll} checked={rows.length > 0 && selectedIds.length === rows.length} />
                    </th>
                    <th>ที่</th>
                    <th>ชื่อ - นามสกุล</th>
                    <th>โรงเรียน</th>
                    <th>กลุ่มสาระ</th>
                    <th>ตำแหน่ง</th>
                    <th>วิทยฐานะ</th>
                    <th>ประเภทบุคลากร</th>
                    <th>Operation</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="9" className="text-center">
                        <h2 className="text-danger">ยังไม่มีข้อมูล</h2>
                      </td>
                    </tr>
                  )}
                  {rows.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="text-center">
                          <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={(e) => handleSelectRow(e, row.id)} />
                      </td>
                      <td className="text-center">{idx + 1}</td>
                      <td>{(lookups.prefix[row.prefix] || '') + row.name + ' ' + row.lastname}</td>
                      <td>{lookups.school[row.school] || ''}</td>
                      <td>{lookups.teachSubject[row.teach_subject] || ''}</td>
                      <td>{lookups.position[row.position_id] || ''}</td>
                      <td>{lookups.academic[row.academic_id] || ''}</td>
                      <td>{lookups.personType[row.persontype_id] || ''}</td>
                      <td>
                        <button type="button" className="btn btn-success" onClick={() => handleConfirm(row.id)}>
                          <i className="fa-regular fa-circle-check"></i> ยืนยัน
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmUser;
