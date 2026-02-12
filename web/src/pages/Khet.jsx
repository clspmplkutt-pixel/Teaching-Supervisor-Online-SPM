import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useSchoolLookups from '../hooks/useSchoolLookups';
import LoadingSpinner from '../components/LoadingSpinner';

const Khet = () => {
  const navigate = useNavigate();
  const { lookups, loading: lookupLoading } = useSchoolLookups();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tbl_khet').select('*').order('khet_code', { ascending: true });
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

  const handleRemove = (code) => {
    Swal.fire({
      title: 'ลบข้อมูลหรือไม่ ?',
      text: 'คุณจะไม่สามารถยกเลิกได้หากทำการลบไปแล้ว !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบข้อมูล!',
      cancelButtonText: 'ไม่ ยกเลิกการลบ!',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        navigate(`/khet_remove?khet_code=${code}`);
      }
    });
  };

  if (loading || lookupLoading) {
    return (
      <LoadingSpinner
        message="กำลังโหลดข้อมูลสหวิทยาเขต..."
        fullPage={false}
      />
    );
  }

  return (
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> จัดการสหวิทยาเขต</h3>
          </div>
          <div className="card-body">
            <div className="col-sm-12">
              <span className="float-sm-right">
                <Link className="btn btn-outline-info" to="/khet_add"><i className="fa-solid fa-plus"></i> เพิ่มสหวิทยาเขต</Link>
              </span>
            </div>
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped">
                <thead>
                  <tr>
                    <th>รหัสสหวิทยาเขต</th>
                    <th>ชื่อสหวิทยาเขต</th>
                    <th>จังหวัด</th>
                    <th>Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.khet_code}>
                      <td className="text-center">{row.khet_code}</td>
                      <td>{row.khet_name}</td>
                      <td>{lookups.provinces[row.khet_province] || row.khet_province}</td>
                      <td>
                        <div className="btn-group">
                          <Link to={`/khet_edit?khet_code=${row.khet_code}`} className="btn btn-sm btn-warning">
                            <i className="fa-regular fa-pen-to-square"></i> แก้ไข
                          </Link>
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => handleRemove(row.khet_code)}>
                            <i className="fa-regular fa-trash-can"></i> ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center"><h2 className="text-danger">ยังไม่มีข้อมูล</h2></td>
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

export default Khet;
