import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const StrandsAdd = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetTeachSubject = searchParams.get('Teach_Subject') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teachSubjects, setTeachSubjects] = useState([]);
  const [form, setForm] = useState({
    teach_subject_id: presetTeachSubject,
    strands_order: '',
    strands_id: '',
    strands_name: '',
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tbl_system_Teach_Subject')
          .select('*')
          .eq('teach_subject_status', '1')
          .order('teach_subject_id', { ascending: true });
        if (error) throw error;
        if (mounted) setTeachSubjects(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      teach_subject_id: presetTeachSubject || '',
      strands_order: '',
      strands_id: '',
    }));
  }, [presetTeachSubject]);

  useEffect(() => {
    if (form.teach_subject_id && form.strands_order !== '') {
      setForm((prev) => ({
        ...prev,
        strands_id: `${form.teach_subject_id}${form.strands_order}`,
      }));
    } else if (!form.strands_order || !form.teach_subject_id) {
      setForm((prev) => ({ ...prev, strands_id: '' }));
    }
  }, [form.teach_subject_id, form.strands_order]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'teach_subject_id') {
      if (!value) {
        navigate('/strands_add');
        setForm((prev) => ({ ...prev, teach_subject_id: '', strands_order: '', strands_id: '' }));
        return;
      }
      navigate(`/strands_add?Teach_Subject=${value}`);
      setForm((prev) => ({ ...prev, teach_subject_id: value, strands_order: '', strands_id: '' }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: exists, error: existsError } = await supabase
        .from('tbl_strands')
        .select('strands_id')
        .eq('strands_id', form.strands_id)
        .maybeSingle();
      if (existsError) throw existsError;
      if (exists) {
        Swal.fire('Error', `สาระการเรียนรู้ ${form.strands_id} : ${form.strands_name} มีอยู่แล้วครับ`, 'error');
        navigate('/strands');
        return;
      }
      const { error } = await supabase.from('tbl_strands').insert([{
        strands_id: form.strands_id,
        teach_subject_id: form.teach_subject_id,
        strands_order: form.strands_order,
        strands_name: form.strands_name,
      }]);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'เพิ่มข้อมูลสำเร็จ', 'success');
      navigate('/strands');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด', 'error');
      navigate('/strands');
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
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> เพิ่มข้อมูลสาระการเรียนรู้รายวิชา</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="teach_subject_id">กลุ่มสาระการเรียนรู้ : </label>
                <select
                  className="form-control form-select-lg"
                  name="teach_subject_id"
                  id="teach_subject_id"
                  value={form.teach_subject_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">เลือกกลุ่มสาระการเรียนรู้</option>
                  {teachSubjects.map((row) => (
                    <option key={row.teach_subject_id} value={row.teach_subject_id}>{row.teach_subject}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="strands_order">ลำดับที่ : </label>
                <input
                  type="number"
                  className="form-control"
                  id="strands_order"
                  name="strands_order"
                  placeholder="ลำดับที่"
                  step="1"
                  value={form.strands_order}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="strands_id">รหัสสาระการเรียนรู้ : </label>
                <input
                  type="number"
                  className="form-control"
                  id="strands_id"
                  name="strands_id"
                  placeholder="รหัสสาระการเรียนรู้"
                  value={form.strands_id}
                  readOnly
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="strands_name">สาระการเรียนรู้: </label>
                <input
                  type="text"
                  className="form-control"
                  id="strands_name"
                  name="strands_name"
                  placeholder="สาระการเรียนรู้"
                  value={form.strands_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <button type="submit" className="btn btn-primary mt-3" disabled={saving}>บันทึก</button>
                <button type="button" className="btn btn-danger mt-3 ml-2" onClick={() => navigate('/strands')}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrandsAdd;
