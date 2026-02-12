import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const ContentStandardsAdd = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetTeachSubject = searchParams.get('Teach_Subject') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teachSubjects, setTeachSubjects] = useState([]);
  const [strands, setStrands] = useState([]);
  const [form, setForm] = useState({
    Teach_Subject: presetTeachSubject,
    strands_id: '',
    content_s_name: '',
    content_s_detail: '',
  });

  const currentTeachSubject = useMemo(() => {
    return teachSubjects.find((row) => String(row.teach_subject_id) === String(form.Teach_Subject));
  }, [teachSubjects, form.Teach_Subject]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tbl_system_Teach_Subject')
          .select('*')
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
      Teach_Subject: presetTeachSubject || '',
      strands_id: '',
    }));
  }, [presetTeachSubject]);

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
    return () => { mounted = false; };
  }, [form.Teach_Subject]);

  useEffect(() => {
    if (currentTeachSubject?.teach_subject_short) {
      setForm((prev) => ({
        ...prev,
        content_s_name: `${currentTeachSubject.teach_subject_short} `,
      }));
    }
  }, [currentTeachSubject?.teach_subject_short]);

  const handleTeachSubjectChange = (value) => {
    if (!value) {
      navigate('/content_standards_add');
      setForm((prev) => ({ ...prev, Teach_Subject: '', strands_id: '' }));
      return;
    }
    navigate(`/content_standards_add?Teach_Subject=${value}`);
    setForm((prev) => ({ ...prev, Teach_Subject: value, strands_id: '' }));
  };

  const handleStrandsChange = (value) => {
    const short = currentTeachSubject?.teach_subject_short || '';
    const orderId = value ? String(value).substr(4, 1) : '';
    setForm((prev) => ({
      ...prev,
      strands_id: value,
      content_s_name: value ? `${short} ${orderId}.` : prev.content_s_name,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const contentName = (form.content_s_name || '').trim();
      const { data: exists, error: existsError } = await supabase
        .from('tbl_content_standards')
        .select('id')
        .eq('content_s_name', contentName)
        .maybeSingle();
      if (existsError) throw existsError;
      if (exists) {
        Swal.fire('Error', `ชื่อมาตรฐานการเรียนรู้ ${contentName} มีอยู่แล้วครับ`, 'error');
        navigate(`/content_standards_add${form.Teach_Subject ? `?Teach_Subject=${form.Teach_Subject}` : ''}`);
        return;
      }

      const detail = (form.content_s_detail || '').replace(/[\r\n]/g, '');
      const { error } = await supabase.from('tbl_content_standards').insert([{
        strands_id: form.strands_id,
        content_s_name: contentName,
        content_s_detail: detail,
      }]);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'เพิ่มข้อมูลสำเร็จ', 'success');
      navigate('/content_standards');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด', 'error');
      navigate('/content_standards');
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
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> เพิ่มข้อมูลมาตรฐานการเรียนรู้รายวิชา</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3 mt-3">
                <label htmlFor="Teach_Subject">กลุ่มสาระการเรียนรู้:</label>
                <select
                  className="form-control form-select-lg"
                  name="Teach_Subject"
                  id="Teach_Subject"
                  value={form.Teach_Subject}
                  onChange={(e) => handleTeachSubjectChange(e.target.value)}
                  required
                >
                  <option value="">เลือกกลุ่มสาระการเรียนรู้</option>
                  {teachSubjects.map((row) => (
                    <option key={row.teach_subject_id} value={row.teach_subject_id}>{row.teach_subject}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="strands_id">สาระการเรียนรู้:</label>
                <select
                  className="form-control form-select-lg"
                  name="strands_id"
                  id="strands_id"
                  value={form.strands_id}
                  onChange={(e) => handleStrandsChange(e.target.value)}
                  required
                  disabled={!form.Teach_Subject}
                >
                  <option value="">สาระการเรียนรู้</option>
                  {strands.map((row) => (
                    <option key={row.strands_id} value={row.strands_id}>
                      สาระที่ {row.strands_order} {row.strands_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="content_s_name">
                  ชื่อสาระการเรียนรู้: <span className="text-danger">ยกตัวอย่างเช่น ท 1.1,ค 1.1 ระหว่างตัวอักษรและตัวเลขให้เว้นเพียง 1 ข่อง และตามด้วยลำดับที่ของสาระ</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="content_s_name"
                  name="content_s_name"
                  placeholder="ชื่อสาระการเรียนรู้"
                  value={form.content_s_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="content_s_detail">
                  คำอธิบายมาตรฐานการเรียนรู้รายวิชา: <span className="text-danger">ไม่ต้องกดปุ่ม Enter เพื่อขึ้นบรรทัดใหม่</span>
                </label>
                <textarea
                  name="content_s_detail"
                  id="content_s_detail"
                  cols="30"
                  rows="10"
                  className="form-control"
                  value={form.content_s_detail}
                  onChange={handleChange}
                ></textarea>
              </div>
              <div className="mb-3">
                <button type="submit" className="btn btn-primary mt-3" disabled={saving}>บันทึก</button>
                <button type="button" className="btn btn-danger mt-3 ml-2" onClick={() => navigate('/content_standards')}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentStandardsAdd;
