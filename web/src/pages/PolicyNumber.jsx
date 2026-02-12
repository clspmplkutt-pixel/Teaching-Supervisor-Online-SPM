import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const PolicyNumber = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [academicMap, setAcademicMap] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [policyRes, academicRes] = await Promise.all([
        supabase.from('tbl_policy_number').select('*').order('auto_id', { ascending: true }),
        supabase.from('tbl_system_Academic_Standing').select('academic_id, academic_standing'),
      ]);
      if (policyRes.error) throw policyRes.error;
      if (academicRes.error) throw academicRes.error;

      const map = {};
      (academicRes.data || []).forEach((row) => {
        map[row.academic_id] = row.academic_standing;
      });
      setAcademicMap(map);
      setRows(policyRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> ตัวชี้วัดการประเมิน</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>วิทยฐานะ</th>
                    <th>ด้านที่</th>
                    <th>ข้อที่</th>
                    <th>รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.auto_id}>
                      <td className="text-center">{row.auto_id}</td>
                      <td className="text-center">{academicMap[row.academic] || row.academic}</td>
                      <td className="text-center">{row.side}</td>
                      <td className="text-center">{row.no_order}</td>
                      <td>{row.text}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center"><h2 className="text-danger">ยังไม่มีข้อมูล</h2></td>
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

export default PolicyNumber;
