import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

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
    setSaving(true);
    try {
      const { data: exists, error: existsError } = await supabase
        .from('tbl_learningModel')
        .select('model_id')
        .eq('model_id', form.model_id)
        .maybeSingle();
      if (existsError) throw existsError;
      if (exists) {
        Swal.fire('Error', `สาระการเรียนรู้ ${form.model_id} : ${form.model_name} มีอยู่แล้วครับ`, 'error');
        navigate('/learningModel');
        return;
      }

      const { error } = await supabase.from('tbl_learningModel').insert([{
        model_id: form.model_id,
        model_name: form.model_name,
        model_status: '1',
      }]);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'เพิ่มข้อมูลสำเร็จ', 'success');
      navigate('/learningModel');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด', 'error');
      navigate('/learningModel');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-8 col-xl-8">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> เพิ่มรูปแบบการจัดการเรียนรู้</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="model_id">รหัสรูปแบบ : </label>
                <input
                  type="number"
                  className="form-control"
                  id="model_id"
                  name="model_id"
                  placeholder="รหัสรูปแบบ"
                  value={form.model_id}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="model_name">รูปแบบการจัดการเรียนรู้: </label>
                <input
                  type="text"
                  className="form-control"
                  id="model_name"
                  name="model_name"
                  placeholder="รูปแบบการจัดการเรียนรู้"
                  value={form.model_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <button type="submit" className="btn btn-primary mt-3" disabled={saving}>บันทึก</button>
                <button type="button" className="btn btn-danger mt-3 ml-2" onClick={() => navigate('/learningModel')}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningModelAdd;
