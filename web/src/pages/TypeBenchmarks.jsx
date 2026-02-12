import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const TypeBenchmarks = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tbl_type_indicators')
        .select('*')
        .order('id', { ascending: true });
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
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> จัดการประเภทตัวชี้วัด</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>รหัสประเภท</th>
                    <th>ประเภทตัวชี้วัด</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="text-center">{row.id}</td>
                      <td className="text-center">{row.indicator_id}</td>
                      <td>{row.indicator_name}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-center"><h2 className="text-danger">ยังไม่มีข้อมูล</h2></td>
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

export default TypeBenchmarks;
