import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import useUserLookups from '../hooks/useUserLookups';

const CheckupUserDuplicate = () => {
  const { lookups, loading: lookupsLoading } = useUserLookups();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: ids, error: idError } = await supabase
        .from('tbl_Users')
        .select('people_id')
        .not('people_id', 'is', null)
        .neq('people_id', '');
      if (idError) throw idError;

      const counts = {};
      (ids || []).forEach((row) => {
        counts[row.people_id] = (counts[row.people_id] || 0) + 1;
      });

      const dupIds = Object.keys(counts).filter((key) => counts[key] > 1);
      if (dupIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tbl_Users')
        .select('*')
        .in('people_id', dupIds)
        .order('people_id', { ascending: true });
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

  if (loading || lookupsLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  const getEditModule = (level) => {
    if (level === 'teacher') return 'teacher_edit';
    if (level === 'directorschool') return 'directorschool_edit';
    return 'teacher_edit';
  };

  return (
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> ผู้ใช้งานข้อมูลผิดพลาด</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead>
                  <tr>
                    <th>ที่</th>
                    <th>เลขประจำตัวประชาชน</th>
                    <th>ชื่อ - นามสกุล</th>
                    <th>โรงเรียน</th>
                    <th>Level</th>
                    <th>ความผิดพลาด</th>
                    <th>แก้ไขข้อมูล</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center">
                        <h2 className="text-danger">ยังไม่มีข้อมูล</h2>
                      </td>
                    </tr>
                  )}
                  {rows.map((row, idx) => (
                    <tr key={`${row.id}-${idx}`}>
                      <td className="text-center">{idx + 1}</td>
                      <td>{row.people_id}</td>
                      <td>{(lookups.prefix[row.prefix] || '') + row.name + ' ' + row.lastname}</td>
                      <td>{lookups.school[row.school] || ''}</td>
                      <td>{row.level}</td>
                      <td><span className="text-danger">เลขประจำตัวประชาชนซ้ำ</span></td>
                      <td>
                        <Link to={`/${getEditModule(row.level)}?id=${row.id}&peopleid_error=peopleidDup`} className="btn btn-danger">
                          <i className="fa-regular fa-edit"></i> แก้ไข
                        </Link>
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

export default CheckupUserDuplicate;
