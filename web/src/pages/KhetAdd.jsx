import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useSchoolLookups from '../hooks/useSchoolLookups';

const KhetAdd = () => {
  const navigate = useNavigate();
  const { lists, loading } = useSchoolLookups();
  const [form, setForm] = useState({ khet_code: '', khet_name: '', khet_province: '' });
  const [saving, setSaving] = useState(false);

  const provinceOptions = useMemo(
    () => (lists.provinces || []).filter((p) => String(p.province_id) === '53' || String(p.province_id) === '65'),
    [lists.provinces]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!form.khet_province) {
      Swal.fire('Warning', 'กรุณาเลือกจังหวัด', 'info');
      return false;
    }
    if (!form.khet_code || form.khet_code.length !== 4) {
      Swal.fire('Error', 'รหัสสหวิทยาเขตต้องมี 4 หลัก', 'error');
      return false;
    }
    if (!form.khet_name) {
      Swal.fire('Warning', 'กรุณากรอกชื่อสหวิทยาเขต', 'info');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const { data: exists } = await supabase.from('tbl_khet').select('khet_code').eq('khet_code', form.khet_code).maybeSingle();
      if (exists) {
        Swal.fire('Error', 'ไม่สามารถเพิ่มข้อมูลได้ เนื่องจากรหัสสหวิทยาเขตซ้ำ', 'error');
        navigate('/khet');
        return;
      }
      const { error } = await supabase.from('tbl_khet').insert([{
        khet_code: form.khet_code,
        khet_name: form.khet_name,
        khet_province: form.khet_province,
      }]);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'เพิ่มข้อมูลสำเร็จ', 'success');
      navigate('/khet');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
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
      <div className="col-sm-12 col-md-12 col-lg-8 col-xl-8">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> เพิ่มข้อมูลสหวิทยาเขต</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3 mt-3">
                <label htmlFor="khet_province">ตั้งอยู่จังหวัด:</label>
                <select className="form-control form-select-lg" name="khet_province" id="khet_province" value={form.khet_province} onChange={handleChange} required>
                  <option value="">เลือกจังหวัดที่สหวิทยาเขตตั้งอยู่</option>
                  {provinceOptions.map((row) => (
                    <option key={row.province_id} value={row.province_id}>{row.province_name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="khet_code">รหัสสหวิทยาเขต:</label>
                <input type="text" className="form-control" id="khet_code" placeholder="รหัสสหวิทยาเขต ห้ามซ้ำกับที่มีอยู่" name="khet_code" maxLength="4" value={form.khet_code} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label htmlFor="khet_name">ชื่อสหวิทยาเขต:</label>
                <input type="text" className="form-control" id="khet_name" placeholder="ชื่อสหวิทยาเขต" name="khet_name" value={form.khet_name} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <button type="submit" className="btn btn-primary mt-3" disabled={saving}>บันทึก</button>
                <button type="button" className="btn btn-danger mt-3 ml-2" onClick={() => navigate('/khet')}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KhetAdd;
