import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

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
    const loadContentStandards = async () => {
      if (!strandsId) {
        setContentStandards([]);
        return;
      }
      const { data, error } = await supabase
        .from('tbl_content_standards')
        .select('*')
        .eq('strands_id', strandsId)
        .order('content_s_name', { ascending: true });
      if (error) {
        console.error(error);
        return;
      }
      if (mounted) setContentStandards(data || []);
    };
    loadContentStandards();
    return () => { mounted = false; };
  }, [strandsId]);

  const updateParams = (next) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const query = params.toString();
    navigate(query ? `/indicators_add?${query}` : '/indicators_add');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'teach_subject_id') {
      updateParams({ teach_subject_id: value, strands_id: '' });
      return;
    }
    if (name === 'strands_id') {
      updateParams({ teach_subject_id: teachSubjectId, strands_id: value });
      return;
    }
    if (name === 'content_s_name') {
      setForm((prev) => ({ ...prev, content_s_name: value }));
      return;
    }
    if (name === 'grade_level_id') {
      const short = gradeShortMap[value] || '';
      setForm((prev) => ({
        ...prev,
        grade_level_id: value,
        indicators_name: `${prev.content_s_name} ${short}/`,
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const indicatorsName = (form.indicators_name || '').trim();
      const { data: exists, error: existsError } = await supabase
        .from('tbl_indicators')
        .select('id')
        .eq('indicators_name', indicatorsName)
        .maybeSingle();
      if (existsError) throw existsError;
      if (exists) {
        Swal.fire('Error', `ชื่อตัวชี้วัดการเรียนรู้ ${indicatorsName} มีอยู่แล้วครับ`, 'error');
        navigate(`/indicators?teach_subject_id=${form.teach_subject_id}&grade_level_id=${form.grade_level_id}`);
        return;
      }

      const detail = (form.indicators_details || '').replace(/[\r\n]/g, '').trim();
      const { error } = await supabase.from('tbl_indicators').insert([{
        teach_subject_id: form.teach_subject_id,
        grade_level_id: form.grade_level_id,
        content_s_name: form.content_s_name,
        indicators_name: indicatorsName,
        indicator_group: form.indicator_group,
        indicator_id: form.indicator_id,
        indicators_details: detail,
      }]);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'เพิ่มข้อมูลสำเร็จ', 'success');
      navigate(`/indicators?teach_subject_id=${form.teach_subject_id}&grade_level_id=${form.grade_level_id}`);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด', 'error');
      navigate('/indicators');
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

  const strandsEnabled = Boolean(teachSubjectId);
  const contentEnabled = Boolean(strandsId);
  const gradeEnabled = Boolean(form.content_s_name);

  return (
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> เพิ่มตัวชี้วัดรายวิชา</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3 mt-3">
                <label htmlFor="teach_subject_id">กลุ่มสาระการเรียนรู้:</label>
                <select
                  className="form-control form-select-lg"
                  name="teach_subject_id"
                  id="teach_subject_id"
                  value={teachSubjectId}
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
                <label htmlFor="strands_id">สาระการเรียนรู้:</label>
                <select
                  className="form-control form-select-lg"
                  name="strands_id"
                  id="strands_id"
                  value={strandsId}
                  onChange={handleChange}
                  required
                  disabled={!strandsEnabled}
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
                <label htmlFor="content_s_name">มาตรฐานการเรียนรู้:</label>
                <select
                  className="form-control form-select-lg"
                  name="content_s_name"
                  id="content_s_name"
                  value={form.content_s_name}
                  onChange={handleChange}
                  required
                  disabled={!contentEnabled}
                >
                  <option value="">สาระการเรียนรู้</option>
                  {contentStandards.map((row) => (
                    <option key={row.id} value={row.content_s_name}>{row.content_s_name} {row.content_s_detail}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3 mt-3">
                <label htmlFor="grade_level_id">ระดับชั้น:</label>
                <select
                  className="form-control form-select-lg"
                  name="grade_level_id"
                  id="grade_level_id"
                  value={form.grade_level_id}
                  onChange={handleChange}
                  required
                  disabled={!gradeEnabled}
                >
                  <option value="">เลือกระดับชั้น</option>
                  {gradeLevels.map((row) => (
                    <option key={row.grade_level_id} value={row.grade_level_id}>{row.grade_level_name}</option>
                  ))}
                </select>
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
                  {indicatorTypes.map((row) => (
                    <option key={row.indicator_id} value={row.indicator_id}>{row.indicator_name}</option>
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
                <label htmlFor="indicators_name">ชื่อตัวชี้วัดการเรียนรู้ : </label>
                <input
                  type="text"
                  className="form-control"
                  id="indicators_name"
                  name="indicators_name"
                  placeholder="ชื่อตัวชี้วัดการเรียนรู้"
                  value={form.indicators_name}
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
                <button type="button" className="btn btn-danger mt-3 ml-2" onClick={() => navigate('/indicators')}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndicatorsAdd;
