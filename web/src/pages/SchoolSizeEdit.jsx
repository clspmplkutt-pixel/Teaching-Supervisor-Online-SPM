import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const SchoolSizeEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idParam = searchParams.get('schoolsize_id') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    schoolsize_id: '',
    schoolsize_name: '',
    schoolsize_details: '',
    schoolsize_min: '',
    schoolsize_max: '',
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('tbl_schoolsize').select('*').eq('schoolsize_id', idParam).maybeSingle();
        if (error) throw error;
        if (!data) {
          Swal.fire('Error', 'ไม่พบข้อมูลขนาดโรงเรียน', 'error');
          navigate('/school_size');
          return;
        }
        if (mounted) {
          setForm({
            schoolsize_id: data.schoolsize_id || '',
            schoolsize_name: data.schoolsize_name || '',
            schoolsize_details: data.schoolsize_details || '',
            schoolsize_min: data.schoolsize_min || '',
            schoolsize_max: data.schoolsize_max || '',
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (idParam) load();
    return () => { mounted = false; };
  }, [idParam, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const min = Number(form.schoolsize_min);
    const max = Number(form.schoolsize_max);
    if (Number.isNaN(min) || Number.isNaN(max)) return true;
    if (max !== 0 && min > max) {
      Swal.fire('ผิดพลาด', 'จำนวนนักเรียนที่น้อยที่สุด มากกว่า จำนวนนักเรียนที่มากที่สุดไม่ได้', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tbl_schoolsize')
        .update({
          schoolsize_details: form.schoolsize_details,
          schoolsize_min: form.schoolsize_min,
          schoolsize_max: form.schoolsize_max,
        })
        .eq('schoolsize_id', form.schoolsize_id);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'แก้ไขข้อมูลสำเร็จ', 'success');
      navigate('/school_size');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด', 'error');
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
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> แก้ไขข้อมูลขนาดโรงเรียน</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="mb-3 col-6">
                  <label htmlFor="schoolsize_id">ID:</label>
                  <input type="text" className="form-control" id="schoolsize_id" name="schoolsize_id" value={form.schoolsize_id} readOnly />
                </div>
                <div className="mb-3 col-6">
                  <label htmlFor="schoolsize_name">ชื่อขนาดโรงเรียน:</label>
                  <input type="text" className="form-control" id="schoolsize_name" name="schoolsize_name" value={form.schoolsize_name} readOnly />
                </div>
              </div>
              <div className="mb-3 col-12">
                <label htmlFor="schoolsize_details">คำอธิบาย:</label>
                <input type="text" className="form-control" id="schoolsize_details" name="schoolsize_details" value={form.schoolsize_details} onChange={handleChange} />
              </div>
              <div className="mb-3 col-12">
                <label htmlFor="schoolsize_min">จำนวนนักเรียนที่น้อยที่สุด:</label>
                <input type="number" className="form-control" id="schoolsize_min" name="schoolsize_min" value={form.schoolsize_min} onChange={handleChange} />
              </div>
              <div className="mb-3 col-12">
                <label htmlFor="schoolsize_max">จำนวนนักเรียนที่มากที่สุด <span className="text-danger">(** หากใส่ 0 หมายถึงมากกว่าขึ้นไป ให้ใส่เฉพาะโรงเรียนขนาดใหญ่พิเศษเท่านั้น **)</span>:</label>
                <input type="number" className="form-control" id="schoolsize_max" name="schoolsize_max" value={form.schoolsize_max} onChange={handleChange} />
              </div>
              <div className="mb-3">
                <button type="submit" className="btn btn-primary mt-3" disabled={saving}>บันทึก</button>
                <button type="button" className="btn btn-danger mt-3 ml-2" onClick={() => navigate('/school_size')}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolSizeEdit;
