import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { thaiDateFull } from '../utils/thaiDate';

const EducationYear = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tbl_education_year').select('*').order('id', { ascending: true });
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSetCurrent = async (row) => {
    const result = await Swal.fire({
      title: 'ตั้งค่าปีการศึกษา ?',
      text: `ตั้งค่าปี ${row.year} ภาคเรียนที่ ${row.section} เป็นปีการศึกษาปัจจุบันหรือไม่ ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ตั้งเป็นปีการศึกษาปัจจุบัน!',
      cancelButtonText: 'ไม่ ยกเลิกการดำเนินการ!',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const { error: err1 } = await supabase.from('tbl_education_year').update({ active: '0' }).eq('active', '1');
      if (err1) {
        console.error('❌ Reset active error:', err1);
        throw new Error(`Reset failed: ${err1.message} (code: ${err1.code})`);
      }
      const { error: err2 } = await supabase.from('tbl_education_year').update({ active: '1' }).eq('id', row.id);
      if (err2) {
        console.error('❌ Set active error:', err2);
        throw new Error(`Set active failed: ${err2.message} (code: ${err2.code})`);
      }
      Swal.fire('สำเร็จ', `ตั้งค่าปี ${row.year} ภาคเรียนที่ ${row.section} เป็นปีการศึกษาปัจจุบันแล้ว`, 'success');
      loadData();
    } catch (err) {
      console.error('❌ handleSetCurrent error:', err);
      Swal.fire('Error', `เกิดข้อผิดพลาด: ${err.message}`, 'error');
    }
  };

  if (loading) {
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
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> จัดการปีการศึกษา</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped">
                <thead>
                  <tr>
                    <th>ที่</th>
                    <th>ปีงบประมาณ</th>
                    <th>ภาคเรียนที่</th>
                    <th>วันเริ่มปีงบประมาณ</th>
                    <th>วันสิ้นสุดปีงบประมาณ</th>
                    <th>ปีปัจจุบัน</th>
                    <th>Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const active = String(row.active) === '1';
                    return (
                      <tr key={row.id} className={active ? 'bg-warning' : ''}>
                        <td className="text-center">{row.id}</td>
                        <td className="text-center">{row.year}</td>
                        <td className="text-center">{row.section}</td>
                        <td className="text-center">{thaiDateFull(row.date_start, 2)}</td>
                        <td className="text-center">{thaiDateFull(row.date_end, 2)}</td>
                        <td className="text-center">
                          {active
                            ? <i className="fa-solid fa-circle-check fa-lg text-success"></i>
                            : <i className="fa-solid fa-circle-xmark fa-lg text-danger"></i>}
                        </td>
                        <td>
                          <div className="btn-group">
                            {!active && (
                              <button type="button" className="btn btn-sm btn-primary" onClick={() => handleSetCurrent(row)}>
                                <i className="fa-regular fa-pen-to-square"></i> ปีปัจจุบัน
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center"><h2 className="text-danger">ยังไม่มีข้อมูล</h2></td>
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

export default EducationYear;
