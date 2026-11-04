import React, { useEffect, useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';

const TblConfig = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [values, setValues] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

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
      console.error('TblConfig load error:', err);
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
      Swal.fire('สำเร็จ', `บันทึกค่า "${row.config_name}" เรียบร้อยแล้ว`, 'success');
      loadData();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถแก้ไขข้อมูลได้: ' + err.message, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(r =>
      (r.config_name || '').toLowerCase().includes(q) ||
      (r.config_comment || '').toLowerCase().includes(q) ||
      (String(values[r.config_oid] || '')).toLowerCase().includes(q)
    );
  }, [rows, values, searchTerm]);

  if (loading) {
    return <LoadingSpinner title="การตั้งค่าระบบ (System Configuration)" message="กำลังโหลดข้อมูล..." />;
  }

  return (
    <div className="container-fluid py-3">
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h5 className="font-weight-bold mb-0 text-dark">
              <i className="fa-solid fa-gears text-primary mr-2"></i> ตั้งค่าระบบกลาง (System Configuration)
            </h5>
            <p className="text-muted small mb-0 mt-1">
              พารามิเตอร์และค่าคงที่ของระบบนิเทศการจัดการเรียนรู้ ({rows.length} รายการ)
            </p>
          </div>

          <div style={{ maxWidth: '280px', width: '100%' }}>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="ค้นหาชื่อค่า หรือคำอธิบาย..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="card-body p-4">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th style={{ width: '50px' }} className="text-center">#</th>
                  <th style={{ width: '220px' }}>ชื่อตัวแปร (Key)</th>
                  <th>คำอธิบาย</th>
                  <th style={{ minWidth: '260px' }}>ค่า (Value)</th>
                  <th style={{ width: '100px' }} className="text-center">แก้ไขได้</th>
                  <th style={{ width: '100px' }} className="text-center">บันทึก</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const isEditable = String(row.config_edit) === '1';
                  const isSaving = savingId === row.config_oid;
                  const isChanged = values[row.config_oid] !== row.config_value;

                  return (
                    <tr key={row.config_oid}>
                      <td className="text-center text-muted small font-mono">{row.config_oid}</td>
                      <td>
                        <code className="text-primary font-weight-bold" style={{ fontSize: '12.5px' }}>
                          {row.config_name}
                        </code>
                      </td>
                      <td className="small text-muted">{row.config_comment || '-'}</td>
                      <td>
                        {isEditable ? (
                          <input
                            type="text"
                            className={`form-control form-control-sm ${isChanged ? 'border-primary' : ''}`}
                            value={values[row.config_oid] ?? ''}
                            onChange={(e) => handleChange(row.config_oid, e.target.value)}
                          />
                        ) : (
                          <span className="font-mono text-dark" style={{ fontSize: '13px' }}>
                            {row.config_value || '-'}
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        {isEditable ? (
                          <span className="badge badge-success px-2 py-1">เปิด</span>
                        ) : (
                          <span className="badge badge-secondary px-2 py-1">ล็อก</span>
                        )}
                      </td>
                      <td className="text-center">
                        {isEditable ? (
                          <button
                            type="button"
                            className={`btn btn-sm ${isChanged ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'}`}
                            onClick={() => handleSave(row)}
                            disabled={isSaving}
                            title="บันทึกค่านี้"
                          >
                            {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-save"></i>}
                          </button>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      ไม่พบค่าการตั้งค่าที่ตรงกับคำค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TblConfig;
