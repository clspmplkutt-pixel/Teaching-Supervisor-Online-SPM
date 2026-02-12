import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const SchoolSize = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('tbl_schoolsize').select('*');
        if (error) throw error;
        if (mounted) setRows(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
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
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> ขนาดโรงเรียน</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>ชื่อ</th>
                    <th>ความหมาย</th>
                    <th>จำนวน นร.น้อยสุด</th>
                    <th>จำนวน นร.มากสุด</th>
                    <th>Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.schoolsize_id}>
                      <td className="text-center">{row.schoolsize_id}</td>
                      <td>{row.schoolsize_name}</td>
                      <td>{row.schoolsize_details}</td>
                      <td>{row.schoolsize_min}</td>
                      <td>{row.schoolsize_max}</td>
                      <td>
                        <div className="btn-group">
                          <Link to={`/schoolsize_edit?schoolsize_id=${row.schoolsize_id}`} className="btn btn-sm btn-warning">
                            <i className="fa-regular fa-pen-to-square"></i> แก้ไข
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center"><h2 className="text-danger">ยังไม่มีข้อมูล</h2></td>
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

export default SchoolSize;
