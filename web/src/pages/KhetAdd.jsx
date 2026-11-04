import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useSchoolLookups from '../hooks/useSchoolLookups';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchableSelect from '../components/SearchableSelect';
import { showToast } from '../utils/toast';

const KhetAdd = () => {
  const navigate = useNavigate();
  const { lists, loading } = useSchoolLookups();
  const [form, setForm] = useState({ khet_code: '', khet_name: '', khet_province: '' });
  const [saving, setSaving] = useState(false);

  const provinceOptions = useMemo(() => {
    const areaProvinces = (lists.provinces || []).filter(
      (p) => String(p.province_id) === '53' || String(p.province_id) === '65'
    );
    const source = areaProvinces.length > 0 ? areaProvinces : lists.provinces || [];
    return source.map((p) => ({
      value: String(p.province_id),
      label: p.province_name,
      subLabel: `รหัสจังหวัด ${p.province_id}`,
    }));
  }, [lists.provinces]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!form.khet_province) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกจังหวัดที่สหวิทยาเขตตั้งอยู่', 'warning');
      return false;
    }
    if (!form.khet_code || form.khet_code.trim().length !== 4) {
      Swal.fire('รหัสไม่ถูกต้อง', 'รหัสสหวิทยาเขตต้องมีความยาว 4 หลัก', 'warning');
      return false;
    }
    if (!form.khet_name.trim()) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อสหวิทยาเขต', 'warning');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !validate()) return;

    setSaving(true);
    try {
      const codeClean = form.khet_code.trim();
      const { data: exists } = await supabase
        .from('tbl_khet')
        .select('khet_code')
        .eq('khet_code', codeClean)
        .maybeSingle();

      if (exists) {
        Swal.fire('รหัสซ้ำ', `รหัสสหวิทยาเขต ${codeClean} มีอยู่ในระบบแล้ว กรุณาแก้ไขรหัสใหม่`, 'warning');
        return;
      }

      const { error } = await supabase.from('tbl_khet').insert([
        {
          khet_code: codeClean,
          khet_name: form.khet_name.trim(),
          khet_province: form.khet_province,
        },
      ]);
      if (error) throw error;

      showToast('เพิ่มข้อมูลสหวิทยาเขตสำเร็จ');
      navigate('/khet');
    } catch (err) {
      console.error(err);
      Swal.fire('ไม่สามารถบันทึกได้', err.message || 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลจังหวัด..." />;
  }

  return (
    <div className="row justify-content-center">
      <div className="col-sm-12 col-md-10 col-lg-8">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h3 className="card-title m-0 font-weight-bold text-dark">
              <i className="fa-solid fa-map-location-dot text-primary mr-2"></i>
              เพิ่มข้อมูลสหวิทยาเขต
            </h3>
            <Link to="/khet" className="btn btn-sm btn-outline-secondary">
              <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับ
            </Link>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group mb-3">
                <label className="form-label">
                  ตั้งอยู่จังหวัด <span className="text-danger">*</span>
                </label>
                <SearchableSelect
                  options={provinceOptions}
                  value={form.khet_province}
                  onChange={(val) => setForm((prev) => ({ ...prev, khet_province: val }))}
                  placeholder="-- เลือกจังหวัดที่สหวิทยาเขตตั้งอยู่ --"
                  required
                />
              </div>

              <div className="form-group mb-3">
                <label htmlFor="khet_code" className="form-label">
                  รหัสสหวิทยาเขต (4 หลัก) <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="khet_code"
                  name="khet_code"
                  placeholder="ระบุรหัสสหวิทยาเขต 4 หลัก (ห้ามซ้ำกับที่มีอยู่)"
                  maxLength="4"
                  value={form.khet_code}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group mb-4">
                <label htmlFor="khet_name" className="form-label">
                  ชื่อสหวิทยาเขต <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="khet_name"
                  name="khet_name"
                  placeholder="ระบุชื่อสหวิทยาเขต"
                  value={form.khet_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="d-flex flex-wrap gap-2 pt-2 border-top">
                <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={saving}>
                  <i className="fa-solid fa-floppy-disk mr-1"></i>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
                <Link to="/khet" className="btn btn-light border px-4">
                  ยกเลิก
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KhetAdd;
