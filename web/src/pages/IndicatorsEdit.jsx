import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const IndicatorsEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState(null);
  const [indicatorTypes, setIndicatorTypes] = useState([]);
  const [contentStandard, setContentStandard] = useState('');
  const [teachSubjectName, setTeachSubjectName] = useState('');
  const [gradeLevelName, setGradeLevelName] = useState('');

  const [form, setForm] = useState({
    indicator_id: '',
    indicator_group: '',
    indicators_details: '',
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: rowData, error: rowError }, typeRes] = await Promise.all([
          supabase.from('tbl_indicators').select('*').eq('id', id).maybeSingle(),
          supabase.from('tbl_type_indicators').select('*').eq('indicator_status', '1').order('indicator_id', { ascending: true }),
        ]);
        if (rowError) throw rowError;
        if (typeRes.error) throw typeRes.error;
        if (!rowData) return;

        const [teachRes, gradeRes, contentRes] = await Promise.all([
          supabase
            .from('tbl_system_Teach_Subject')
            .select('teach_subject')
            .eq('teach_subject_id', rowData.teach_subject_id)
            .maybeSingle(),
          supabase
            .from('tbl_system_GradeLevel')
            .select('grade_level_name')
            .eq('grade_level_id', rowData.grade_level_id)
            .maybeSingle(),
          supabase
            .from('tbl_content_standards')
            .select('*')
            .eq('content_s_name', rowData.content_s_name)
            .maybeSingle(),
        ]);
        if (teachRes.error) throw teachRes.error;
        if (gradeRes.error) throw gradeRes.error;
        if (contentRes.error) throw contentRes.error;

        if (mounted) {
          setRow(rowData);
          setIndicatorTypes(typeRes.data || []);
          setTeachSubjectName(teachRes.data?.teach_subject || '');
          setGradeLevelName(gradeRes.data?.grade_level_name || '');
          setContentStandard(contentRes.data ? `${contentRes.data.content_s_name} ${contentRes.data.content_s_detail}` : rowData.content_s_name);
          setForm({
            indicator_id: rowData.indicator_id || '',
            indicator_group: rowData.indicator_group || '',
            indicators_details: rowData.indicators_details || '',
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (id) load();
    return () => { mounted = false; };
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const detail = (form.indicators_details || '').replace(/[\r\n]/g, '').trim();
      const { error } = await supabase
        .from('tbl_indicators')
        .update({
          indicator_group: form.indicator_group,
          indicator_id: form.indicator_id,
          indicators_details: detail,
        })
        .eq('id', id);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'แก้ไขข้อมูลสำเร็จ', 'success');
      navigate(`/indicators?teach_subject_id=${row.teach_subject_id}&grade_level_id=${row.grade_level_id}`);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด', 'error');
      navigate('/indicators');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !row) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> แก้ไขตัวชี้วัดรายวิชา</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3 mt-3">
                <strong>กลุ่มสาระการเรียนรู้ : </strong> <span className="text-success">{teachSubjectName}</span>
              </div>
              <div className="mb-3 mt-3">
                <strong>ระดับชั้น : </strong> <span className="text-success">{gradeLevelName}</span>
              </div>
              <div className="mb-3">
                <strong>มาตรฐานการเรียนรู้ : </strong> <span className="text-success">{contentStandard}</span>
              </div>
              <div className="mb-3">
                <strong>ชื่อตัวชี้วัดการเรียนรู้ : </strong> <span className="text-success">{row.indicators_name}</span>
              </div>
              <div className="mb-3">
                <label htmlFor="indicator_id">ประเภทตัวชี้วัด: </label>
                <select
                  className="form-control form-select-lg"
                  name="indicator_id"
                  id="indicator_id"
                  value={form.indicator_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">ประเภทตัวชี้วัด</option>
                  {indicatorTypes.map((rowType) => (
                    <option key={rowType.indicator_id} value={rowType.indicator_id}>{rowType.indicator_name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="indicator_group">กลุ่มตัวชี้วัดการเรียนรู้ : </label>
                <input
                  type="number"
                  className="form-control"
                  id="indicator_group"
                  name="indicator_group"
                  placeholder="กลุ่มตัวชี้วัดการเรียนรู้"
                  step="1"
                  value={form.indicator_group}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="indicators_details">คำอธิบายตัวชี้วัดการเรียนรู้: <span className="text-danger">ไม่ต้องกดปุ่ม Enter เพื่อขึ้นบรรทัดใหม่</span></label>
                <textarea
                  name="indicators_details"
                  id="indicators_details"
                  cols="30"
                  rows="10"
                  className="form-control"
                  value={form.indicators_details}
                  onChange={handleChange}
                ></textarea>
              </div>
              <div className="mb-3">
                <button type="submit" className="btn btn-primary mt-3" disabled={saving}>บันทึก</button>
                <button
                  type="button"
                  className="btn btn-danger mt-3 ml-2"
                  onClick={() => navigate(`/indicators?teach_subject_id=${row.teach_subject_id}&grade_level_id=${row.grade_level_id}`)}
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndicatorsEdit;
