import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { showToast } from '../utils/toast';

const LearningModelAdd = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    model_id: '',
    model_name: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const modelIdClean = String(form.model_id || '').trim();
    const modelNameClean = String(form.model_name || '').trim();
    if (!modelIdClean || !modelNameClean) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาระบุรหัสรูปแบบและชื่อรูปแบบการจัดการเรียนรู้', 'warning');
      return;
    }

    setSaving(true);
    try {
      const { data: exists, error: existsError } = await supabase
        .from('tbl_learningModel')
        .select('model_id')
        .eq('model_id', modelIdClean)
        .maybeSingle();
      if (existsError) throw existsError;

      if (exists) {
        Swal.fire(
          'รหัสซ้ำในระบบ',
          `รหัสรูปแบบการจัดการเรียนรู้ ${modelIdClean} มีอยู่ในระบบแล้ว กรุณาระบุรหัสอื่น`,
          'warning'
        );
        return;
      }

      const { error } = await supabase.from('tbl_learningModel').insert([
        {
          model_id: modelIdClean,
          model_name: modelNameClean,
          model_status: '1',
        },
      ]);
      if (error) throw error;

      showToast('เพิ่มรูปแบบการจัดการเรียนรู้สำเร็จ');
      navigate('/learningModel');
    } catch (err) {
      console.error(err);
      Swal.fire('ไม่สามารถบันทึกได้', err.message || 'เกิดข้อผิดพลาดในการเพิ่มรูปแบบการจัดการเรียนรู้', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-sm-12 col-md-10 col-lg-8">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h3 className="card-title m-0 font-weight-bold text-dark">
              <i className="fa-solid fa-lightbulb text-warning mr-2"></i>
              เพิ่มรูปแบบการจัดการเรียนรู้
            </h3>
            <Link to="/learningModel" className="btn btn-sm btn-outline-secondary">
              <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับ
            </Link>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="model_id" className="form-label">
                  รหัสรูปแบบการจัดการเรียนรู้ <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  className="form-control"
                  id="model_id"
                  name="model_id"
                  placeholder="ระบุรหัสรูปแบบ"
                  value={form.model_id}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="model_name" className="form-label">
                  ชื่อรูปแบบการจัดการเรียนรู้ <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="model_name"
                  name="model_name"
                  placeholder="ระบุชื่อรูปแบบการจัดการเรียนรู้"
                  value={form.model_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="d-flex flex-wrap gap-2 pt-2 border-top">
                <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={saving}>
                  <i className="fa-solid fa-floppy-disk mr-1"></i>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
                <Link to="/learningModel" className="btn btn-light border px-4">
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

export default LearningModelAdd;
