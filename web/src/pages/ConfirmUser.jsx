import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useUserLookups from '../hooks/useUserLookups';

const ConfirmUser = () => {
  const { lookups, loading: lookupsLoading } = useUserLookups();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

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
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> ยืนยันผู้ใช้งาน</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead>
                  <tr>
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
                      <td colSpan="8" className="text-center">
                        <h2 className="text-danger">ยังไม่มีข้อมูล</h2>
                      </td>
                    </tr>
                  )}
                  {rows.map((row, idx) => (
                    <tr key={row.id}>
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
