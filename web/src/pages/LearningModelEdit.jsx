import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const LearningModelEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modelId = searchParams.get('model_id') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    model_id: '',
    model_name: '',
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tbl_learningModel')
          .select('*')
          .eq('model_id', modelId)
          .maybeSingle();
        if (error) throw error;
        if (mounted && data) {
          setForm({
            model_id: data.model_id ?? '',
            model_name: data.model_name ?? '',
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (modelId) load();
    return () => { mounted = false; };
  }, [modelId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tbl_learningModel')
        .update({
          model_id: form.model_id,
          model_name: form.model_name,
          model_status: '1',
        })
        .eq('model_id', modelId);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'แก้ไขข้อมูลสำเร็จ', 'success');
      navigate('/learningModel');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด', 'error');
      navigate('/learningModel');
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

export default LearningModelEdit;
