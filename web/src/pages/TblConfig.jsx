import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const TblConfig = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [values, setValues] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tbl_config').select('*').order('config_oid', { ascending: true });
      if (error) throw error;
      setRows(data || []);
      const map = {};
      (data || []).forEach((row) => { map[row.config_oid] = row.config_value; });
      setValues(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (id, value) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async (row) => {
    if (String(row.config_edit) !== '1') return;
    setSavingId(row.config_oid);
    try {
      const { error } = await supabase
        .from('tbl_config')
        .update({ config_value: values[row.config_oid] })
        .eq('config_oid', row.config_oid);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'แก้ไขข้อมูลสำเร็จ', 'success');
      loadData();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด', 'error');
    } finally {
      setSavingId(null);
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
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> ตั้งค่าระบบ</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped">
                <thead>
                  <tr>
                    <th>ลำดับ</th>
                    <th>คำอธิบาย</th>
                    <th>ชื่อค่า</th>
                    <th>ค่า</th>
                    <th>แก้ไข</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.config_oid}>
                      <td className="text-center">{row.config_oid}</td>
                      <td>{row.config_comment}</td>
                      <td>{row.config_name}</td>
                      <td>
                        {String(row.config_edit) === '1' ? (
                          <input
                            type="text"
                            className="form-control"
                            value={values[row.config_oid] ?? ''}
                            onChange={(e) => handleChange(row.config_oid, e.target.value)}
                          />
                        ) : (
                          row.config_value
                        )}
                      </td>
                      <td className="text-center">
                        {String(row.config_edit) === '1' ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => handleSave(row)}
                            disabled={savingId === row.config_oid}
                          >
                            บันทึก
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
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

export default TblConfig;
