import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchableSelect from '../components/SearchableSelect';
import { showToast } from '../utils/toast';

const StrandsAdd = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetTeachSubject = searchParams.get('Teach_Subject') || searchParams.get('teach_subject_id') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teachSubjects, setTeachSubjects] = useState([]);
  const [form, setForm] = useState({
    teach_subject_id: presetTeachSubject,
    strands_order: '',
    strands_id: '',
    strands_name: '',
  });

  const subjectOptions = useMemo(
    () =>
      teachSubjects.map((row) => ({
        value: String(row.teach_subject_id),
        label: row.teach_subject,
        subLabel: `รหัสกลุ่มสาระ ${row.teach_subject_id}`,
      })),
    [teachSubjects]
  );

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
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (form.teach_subject_id && form.strands_order !== '') {
      setForm((prev) => ({
        ...prev,
        strands_id: `${form.teach_subject_id}${form.strands_order}`,
      }));
    } else {
      setForm((prev) => ({ ...prev, strands_id: '' }));
    }
  }, [form.teach_subject_id, form.strands_order]);

  const handleSubjectSelect = (value) => {
    setForm((prev) => ({
      ...prev,
      teach_subject_id: value || '',
      strands_order: '',
      strands_id: '',
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!form.teach_subject_id || !form.strands_order || !form.strands_name.trim()) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกกลุ่มสาระ ลำดับที่ และชื่อสาระการเรียนรู้', 'warning');
      return;
    }

    setSaving(true);
    try {
      const { data: exists, error: existsError } = await supabase
        .from('tbl_strands')
        .select('strands_id')
        .eq('strands_id', form.strands_id)
        .maybeSingle();
      if (existsError) throw existsError;

      if (exists) {
        Swal.fire(
          'รหัสสาระซ้ำ',
          `รหัสสาระการเรียนรู้ ${form.strands_id} มีอยู่ในระบบแล้ว กรุณาตรวจสอบลำดับสาระอีกครั้ง`,
          'warning'
        );
        return;
      }

      const { error } = await supabase.from('tbl_strands').insert([
        {
          strands_id: form.strands_id,
          teach_subject_id: form.teach_subject_id,
          strands_order: form.strands_order,
          strands_name: form.strands_name.trim(),
        },
      ]);
      if (error) throw error;

      showToast('เพิ่มข้อมูลสาระการเรียนรู้สำเร็จ');
      navigate(`/strands?Teach_Subject=${encodeURIComponent(form.teach_subject_id)}`);
    } catch (err) {
      console.error(err);
      Swal.fire('ไม่สามารถบันทึกได้', err.message || 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลกลุ่มสาระการเรียนรู้..." />;
  }

  const backUrl = form.teach_subject_id
    ? `/strands?Teach_Subject=${encodeURIComponent(form.teach_subject_id)}`
    : '/strands';

  return (
    <div className="row justify-content-center">
      <div className="col-sm-12 col-md-10 col-lg-8">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h3 className="card-title m-0 font-weight-bold text-dark">
              <i className="fa-solid fa-sitemap text-info mr-2"></i>
              เพิ่มข้อมูลสาระการเรียนรู้รายวิชา
            </h3>
            <Link to={backUrl} className="btn btn-sm btn-outline-secondary">
              <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับ
            </Link>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">
                  กลุ่มสาระการเรียนรู้ <span className="text-danger">*</span>
                </label>
                <SearchableSelect
                  options={subjectOptions}
                  value={form.teach_subject_id}
                  onChange={handleSubjectSelect}
                  placeholder="-- เลือกกลุ่มสาระการเรียนรู้ --"
                  required
                />
              </div>

              <div className="row">
                <div className="mb-3 col-md-6">
                  <label htmlFor="strands_order" className="form-label">
                    ลำดับสาระที่ <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="form-control"
                    id="strands_order"
                    name="strands_order"
                    placeholder="เช่น 1, 2, 3"
                    value={form.strands_order}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="mb-3 col-md-6">
                  <label htmlFor="strands_id" className="form-label">รหัสสาระการเรียนรู้ (สร้างอัตโนมัติ)</label>
                  <input
                    type="text"
                    className="form-control bg-light"
                    id="strands_id"
                    name="strands_id"
                    placeholder="ระบบคำนวณจากกลุ่มสาระ + ลำดับ"
                    value={form.strands_id}
                    readOnly
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="strands_name" className="form-label">
                  ชื่อสาระการเรียนรู้ <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="strands_name"
                  name="strands_name"
                  placeholder="ระบุชื่อสาระการเรียนรู้ (เช่น การอ่าน, จำนวนและพีชคณิต)"
                  value={form.strands_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="d-flex flex-wrap gap-2 pt-2 border-top">
                <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={saving}>
                  <i className="fa-solid fa-floppy-disk mr-1"></i>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
                <Link to={backUrl} className="btn btn-light border px-4">
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

export default StrandsAdd;
