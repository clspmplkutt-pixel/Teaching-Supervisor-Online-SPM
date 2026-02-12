import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const Log = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tbl_log')
        .select('*')
        .order('id', { ascending: false })
        .limit(100);
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
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> การเข้าใช้งานระบบ</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>ผู้ใช้งาน</th>
                    <th>IP Address</th>
                    <th>เวลาเข้าใช้งาน</th>
                    <th>ระดับผู้เข้าใช้</th>
                    <th>เบาว์เซอร์</th>
                    <th>ความละเอียดจอ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="text-center">{row.id}</td>
                      <td className="text-center">{row.user}</td>
                      <td className="text-center">{row.ipaddress}</td>
                      <td className="text-center">{row.datetimein}</td>
                      <td className="text-center">{row.level}</td>
                      <td>{row.browser_name_regex}</td>
                      <td>{row.screenresolution}</td>
                    </tr>
                  ))}
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

export default Log;
