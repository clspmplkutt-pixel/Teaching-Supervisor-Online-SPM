import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';

const IndicatorsAdd = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teachSubjectId = searchParams.get('teach_subject_id') || '';
  const strandsId = searchParams.get('strands_id') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teachSubjects, setTeachSubjects] = useState([]);
  const [strands, setStrands] = useState([]);
  const [contentStandards, setContentStandards] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [indicatorTypes, setIndicatorTypes] = useState([]);

  const [form, setForm] = useState({
    teach_subject_id: teachSubjectId,
    strands_id: strandsId,
    content_s_name: '',
    grade_level_id: '',
    indicator_id: '',
    indicator_group: '',
    indicators_name: '',
    indicators_details: '',
  });

  const gradeShortMap = useMemo(() => {
    const map = {};
    gradeLevels.forEach((row) => { map[row.grade_level_id] = row.grade_level_shortname; });
    return map;
  }, [gradeLevels]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      teach_subject_id: teachSubjectId,
      strands_id: strandsId,
      content_s_name: '',
      grade_level_id: '',
      indicator_id: '',
      indicator_group: '',
      indicators_name: '',
      indicators_details: '',
    }));
  }, [teachSubjectId, strandsId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [teachRes, gradeRes, typeRes] = await Promise.all([
          supabase
            .from('tbl_system_Teach_Subject')
            .select('*')
            .eq('teach_subject_status', '1')
            .order('teach_subject_id', { ascending: true }),
          supabase
            .from('tbl_system_GradeLevel')
            .select('*')
            .eq('grade_level_status', '1')
            .order('grade_level_id', { ascending: true }),
          supabase
            .from('tbl_type_indicators')
            .select('*')
            .eq('indicator_status', '1')
            .order('indicator_id', { ascending: true }),
        ]);
        if (teachRes.error) throw teachRes.error;
        if (gradeRes.error) throw gradeRes.error;
        if (typeRes.error) throw typeRes.error;
        if (mounted) {
          setTeachSubjects(teachRes.data || []);
          setGradeLevels(gradeRes.data || []);
          setIndicatorTypes(typeRes.data || []);
        }
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
    let mounted = true;
    const loadStrands = async () => {
      if (!teachSubjectId) {
        setStrands([]);
        return;
      }
      const { data, error } = await supabase
        .from('tbl_strands')
        .select('*')
        .eq('teach_subject_id', teachSubjectId)
        .order('strands_id', { ascending: true });
      if (error) {
        console.error(error);
        return;
      }
      if (mounted) setStrands(data || []);
    };
    loadStrands();
    return () => { mounted = false; };
  }, [teachSubjectId]);

  useEffect(() => {
    let mounted = true;
    const loadStandards = async () => {
      if (!form.teach_subject_id || !form.strands_id) {
        setContentStandards([]);
        return;
      }
      const { data, error } = await supabase
        .from('tbl_content_standards')
        .select('*')
        .eq('teach_subject_id', form.teach_subject_id)
        .eq('strands_id', form.strands_id)
        .order('content_s_id', { ascending: true });
      if (error) {
        console.error(error);
        return;
      }
      if (mounted) setContentStandards(data || []);
    };
    loadStandards();
    return () => { mounted = false; };
  }, [form.teach_subject_id, form.strands_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTeachSubjectChange = (e) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set('teach_subject_id', val);
    } else {
      params.delete('teach_subject_id');
    }
    params.delete('strands_id');
    navigate(params.toString() ? `/indicators_add?${params.toString()}` : '/indicators_add');
  };

  const handleStrandsChange = (e) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set('strands_id', val);
    } else {
      params.delete('strands_id');
    }
    navigate(params.toString() ? `/indicators_add?${params.toString()}` : '/indicators_add');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        teach_subject_id: form.teach_subject_id,
        strands_id: form.strands_id,
        content_s_name: form.content_s_name,
        grade_level_id: form.grade_level_id,
        indicator_id: form.indicator_id,
        indicator_group: form.indicator_group,
        indicators_name: form.indicators_name,
        indicators_details: form.indicators_details,
      };
      const { error } = await supabase.from('tbl_indicators').insert([payload]);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'เพิ่มตัวชี้วัดเรียบร้อยแล้ว', 'success');
      navigate('/indicators');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner title="เพิ่มตัวชี้วัดรายวิชา" message="กำลังโหลดข้อมูล..." />;
  }

  return (
    <div className="container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-12 col-xl-8">
          <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="font-weight-bold mb-0 text-dark">
                <i className="fa-solid fa-plus-circle text-primary mr-2"></i> เพิ่มตัวชี้วัดรายวิชา
              </h5>
              <Link to="/indicators" className="btn btn-outline-secondary btn-sm" style={{ borderRadius: '20px' }}>
                <i className="fa-solid fa-arrow-left mr-1"></i> หน้ารายการตัวชี้วัด
              </Link>
            </div>

            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">1. กลุ่มสาระการเรียนรู้:</label>
                    <select
                      className="form-control"
                      value={form.teach_subject_id}
                      onChange={handleTeachSubjectChange}
                      required
                    >
                      <option value="">-- เลือกกลุ่มสาระการเรียนรู้ --</option>
                      {teachSubjects.map((row) => (
                        <option key={row.teach_subject_id} value={row.teach_subject_id}>{row.teach_subject}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">2. สาระการเรียนรู้ (Strand):</label>
                    <select
                      className="form-control"
                      value={form.strands_id}
                      onChange={handleStrandsChange}
                      required
                      disabled={!form.teach_subject_id}
                    >
                      <option value="">-- เลือกสาระการเรียนรู้ --</option>
                      {strands.map((row) => (
                        <option key={row.strands_id} value={row.strands_id}>สาระที่ {row.strands_id} {row.strands_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">3. มาตรฐานการเรียนรู้:</label>
                    <select
                      className="form-control"
                      name="content_s_name"
                      value={form.content_s_name}
                      onChange={handleChange}
                      required
                      disabled={!form.strands_id}
                    >
                      <option value="">-- เลือกมาตรฐานการเรียนรู้ --</option>
                      {contentStandards.map((row) => (
                        <option key={row.content_s_name} value={row.content_s_name}>{row.content_s_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">4. ระดับชั้น:</label>
                    <select
                      className="form-control"
                      name="grade_level_id"
                      value={form.grade_level_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- เลือกระดับชั้น --</option>
                      {gradeLevels.map((row) => (
                        <option key={row.grade_level_id} value={row.grade_level_id}>{row.grade_level_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">5. ประเภทตัวชี้วัด:</label>
                    <select
                      className="form-control"
                      name="indicator_id"
                      value={form.indicator_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- เลือกประเภทตัวชี้วัด --</option>
                      {indicatorTypes.map((row) => (
                        <option key={row.indicator_id} value={row.indicator_id}>{row.indicator_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">6. กลุ่มตัวชี้วัด (indicator_group):</label>
                    <input
                      type="number"
                      className="form-control"
                      name="indicator_group"
                      placeholder="เช่น 1, 2"
                      value={form.indicator_group}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-12 mb-3">
                    <label className="font-weight-bold small text-muted">7. ชื่อตัวชี้วัด (เช่น ท 1.1 ม.1/1):</label>
                    <input
                      type="text"
                      className="form-control"
                      name="indicators_name"
                      placeholder="ระบุรหัสและชื่อตัวชี้วัด"
                      value={form.indicators_name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-12 mb-3">
                    <label className="font-weight-bold small text-muted">8. รายละเอียดคำอธิบายตัวชี้วัด:</label>
                    <textarea
                      rows={5}
                      className="form-control"
                      name="indicators_details"
                      placeholder="ระบุคำอธิบายตัวชี้วัดการเรียนรู้..."
                      value={form.indicators_details}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <Link to="/indicators" className="btn btn-secondary px-3">
                    ยกเลิก
                  </Link>
                  <button type="submit" className="btn btn-primary font-weight-bold px-4" disabled={saving}>
                    {saving ? 'กำลังบันทึก...' : 'บันทึกตัวชี้วัด'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndicatorsAdd;
