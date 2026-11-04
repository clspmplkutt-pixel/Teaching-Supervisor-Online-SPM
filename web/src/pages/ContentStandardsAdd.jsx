import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchableSelect from '../components/SearchableSelect';
import { showToast } from '../utils/toast';

const ContentStandardsAdd = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetTeachSubject = searchParams.get('Teach_Subject') || searchParams.get('teach_subject_id') || '';
  const presetStrandsId = searchParams.get('strands_id') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teachSubjects, setTeachSubjects] = useState([]);
  const [strands, setStrands] = useState([]);
  const [form, setForm] = useState({
    Teach_Subject: presetTeachSubject || (presetStrandsId ? presetStrandsId.slice(0, 4) : ''),
    strands_id: presetStrandsId,
    content_s_name: '',
    content_s_detail: '',
  });

  const currentTeachSubject = useMemo(
    () => teachSubjects.find((row) => String(row.teach_subject_id) === String(form.Teach_Subject)),
    [teachSubjects, form.Teach_Subject]
  );

  const subjectOptions = useMemo(
    () =>
      teachSubjects.map((row) => ({
        value: String(row.teach_subject_id),
        label: row.teach_subject,
        subLabel: row.teach_subject_short ? `อักษรย่อ: ${row.teach_subject_short}` : '',
      })),
    [teachSubjects]
  );

  const strandOptions = useMemo(
    () =>
      strands.map((row) => ({
        value: String(row.strands_id),
        label: `สาระที่ ${row.strands_order}: ${row.strands_name}`,
        subLabel: `รหัสสาระ ${row.strands_id}`,
      })),
    [strands]
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
    let mounted = true;
    const loadStrands = async () => {
      if (!form.Teach_Subject) {
        setStrands([]);
        return;
      }
      const { data, error } = await supabase
        .from('tbl_strands')
        .select('*')
        .eq('teach_subject_id', form.Teach_Subject)
        .order('strands_id', { ascending: true });
      if (error) {
        console.error(error);
        return;
      }
      if (mounted) setStrands(data || []);
    };
    loadStrands();
    return () => {
      mounted = false;
    };
  }, [form.Teach_Subject]);

  useEffect(() => {
    if (!currentTeachSubject?.teach_subject_short) return;
    setForm((prev) => {
      if (prev.content_s_name) return prev;
      if (prev.strands_id) {
        const orderId = String(prev.strands_id).slice(4);
        return { ...prev, content_s_name: `${currentTeachSubject.teach_subject_short} ${orderId}.` };
      }
      return { ...prev, content_s_name: `${currentTeachSubject.teach_subject_short} ` };
    });
  }, [currentTeachSubject]);

  const handleTeachSubjectChange = (value) => {
    const subj = teachSubjects.find((r) => String(r.teach_subject_id) === String(value));
    const short = subj?.teach_subject_short ? `${subj.teach_subject_short} ` : '';
    setForm((prev) => ({
      ...prev,
      Teach_Subject: value || '',
      strands_id: '',
      content_s_name: short,
    }));
  };

  const handleStrandsChange = (value) => {
    const short = currentTeachSubject?.teach_subject_short || '';
    const orderId = value ? String(value).slice(4) : '';
    setForm((prev) => ({
      ...prev,
      strands_id: value || '',
      content_s_name: value && short ? `${short} ${orderId}.` : prev.content_s_name,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const contentName = (form.content_s_name || '').trim();
    if (!form.Teach_Subject || !form.strands_id || !contentName) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกกลุ่มสาระ สาระการเรียนรู้ และรหัสมาตรฐานการเรียนรู้', 'warning');
      return;
    }

    setSaving(true);
    try {
      const { data: exists, error: existsError } = await supabase
        .from('tbl_content_standards')
        .select('id')
        .eq('content_s_name', contentName)
        .maybeSingle();
      if (existsError) throw existsError;

      if (exists) {
        Swal.fire(
          'รหัสมาตรฐานซ้ำ',
          `รหัสมาตรฐานการเรียนรู้ "${contentName}" มีอยู่ในระบบแล้ว กรุณาตรวจสอบอีกครั้ง`,
          'warning'
        );
        return;
      }

      const detail = (form.content_s_detail || '').replace(/[\r\n]+/g, ' ').trim();
      const { error } = await supabase.from('tbl_content_standards').insert([
        {
          strands_id: form.strands_id,
          content_s_name: contentName,
          content_s_detail: detail,
        },
      ]);
      if (error) throw error;

      showToast('เพิ่มข้อมูลมาตรฐานการเรียนรู้สำเร็จ');
      navigate(
        `/content_standards?Teach_Subject=${encodeURIComponent(form.Teach_Subject)}&strands_id=${encodeURIComponent(
          form.strands_id
        )}`
      );
    } catch (err) {
      console.error(err);
      Swal.fire('ไม่สามารถบันทึกได้', err.message || 'เกิดข้อผิดพลาดในการเพิ่มมาตรฐานการเรียนรู้', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลกลุ่มสาระการเรียนรู้..." />;
  }

  const backUrl = form.Teach_Subject
    ? `/content_standards?Teach_Subject=${encodeURIComponent(form.Teach_Subject)}`
    : '/content_standards';

  return (
    <div className="row justify-content-center">
      <div className="col-sm-12 col-md-10 col-lg-8">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h3 className="card-title m-0 font-weight-bold text-dark">
              <i className="fa-solid fa-book-bookmark text-success mr-2"></i>
              เพิ่มข้อมูลมาตรฐานการเรียนรู้รายวิชา
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
                  value={form.Teach_Subject}
                  onChange={handleTeachSubjectChange}
                  placeholder="-- เลือกกลุ่มสาระการเรียนรู้ --"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  สาระการเรียนรู้ <span className="text-danger">*</span>
                </label>
                <SearchableSelect
                  options={strandOptions}
                  value={form.strands_id}
                  onChange={handleStrandsChange}
                  placeholder={form.Teach_Subject ? '-- เลือกสาระการเรียนรู้ --' : '-- กรุณาเลือกกลุ่มสาระก่อน --'}
                  disabled={!form.Teach_Subject}
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="content_s_name" className="form-label">
                  รหัสมาตรฐานการเรียนรู้ <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="content_s_name"
                  name="content_s_name"
                  placeholder="เช่น ท 1.1, ค 1.1, ว 2.1"
                  value={form.content_s_name}
                  onChange={handleChange}
                  required
                />
                <small className="text-muted">
                  ตัวอย่างเช่น <code>ท 1.1</code> หรือ <code>ค 1.1</code> (เว้นวรรคระหว่างอักษรย่อกลุ่มสาระกับตัวเลข 1 ช่อง)
                </small>
              </div>

              <div className="mb-4">
                <label htmlFor="content_s_detail" className="form-label">
                  คำอธิบายมาตรฐานการเรียนรู้ <span className="text-danger">*</span>
                </label>
                <textarea
                  name="content_s_detail"
                  id="content_s_detail"
                  rows="5"
                  className="form-control"
                  placeholder="ระบุคำอธิบายมาตรฐานการเรียนรู้ (ระบบจะจัดรูปแบบบรรทัดให้อัตโนมัติ)"
                  value={form.content_s_detail}
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

export default ContentStandardsAdd;
