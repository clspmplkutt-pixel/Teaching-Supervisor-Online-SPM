import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';

const IndicatorsEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState(null);
  const [indicatorTypes, setIndicatorTypes] = useState([]);
  const [teachSubjectName, setTeachSubjectName] = useState('');
  const [gradeLevelName, setGradeLevelName] = useState('');

  const [form, setForm] = useState({
    indicator_id: '',
    indicator_group: '',
    indicators_name: '',
    indicators_details: '',
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [{ data: rowData, error: rowError }, typeRes] = await Promise.all([
          supabase.from('tbl_indicators').select('*').eq('id', id).maybeSingle(),
          supabase.from('tbl_type_indicators').select('*').eq('indicator_status', '1').order('indicator_id', { ascending: true }),
        ]);
        if (rowError) throw rowError;
        if (typeRes.error) throw typeRes.error;
        if (!rowData) {
          if (mounted) setLoading(false);
          return;
        }

        const [teachRes, gradeRes] = await Promise.all([
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
        ]);

        if (mounted) {
          setRow(rowData);
          setIndicatorTypes(typeRes.data || []);
          setTeachSubjectName(teachRes.data?.teach_subject || rowData.teach_subject_id);
          setGradeLevelName(gradeRes.data?.grade_level_name || rowData.grade_level_id);
          setForm({
            indicator_id: rowData.indicator_id || '',
            indicator_group: rowData.indicator_group || '',
            indicators_name: rowData.indicators_name || '',
            indicators_details: rowData.indicators_details || '',
          });
        }
      } catch (err) {
        console.error('IndicatorsEdit error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tbl_indicators')
        .update({
          indicator_id: form.indicator_id,
          indicator_group: form.indicator_group,
          indicators_name: form.indicators_name,
          indicators_details: form.indicators_details,
        })
        .eq('id', id);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'แก้ไขข้อมูลตัวชี้วัดเรียบร้อยแล้ว', 'success');
      navigate('/indicators');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถแก้ไขข้อมูลได้: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner title="แก้ไขตัวชี้วัดรายวิชา" message="กำลังโหลดข้อมูล..." />;
  }

  if (!id || !row) {
    return (
      <div className="container py-4 text-center">
        <p className="text-danger">ไม่พบข้อมูลตัวชี้วัดที่ต้องการแก้ไข</p>
        <Link to="/indicators" className="btn btn-secondary btn-sm">กลับหน้ารายการตัวชี้วัด</Link>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="font-weight-bold mb-0 text-dark">
                <i className="fa-solid fa-pen-to-square text-warning mr-2"></i> แก้ไขตัวชี้วัดรายวิชา #{id}
              </h5>
            </div>

            <div className="card-body p-4">
              <div className="row mb-4 p-3 bg-light rounded">
                <div className="col-md-4">
                  <div className="text-muted small">กลุ่มสาระการเรียนรู้</div>
                  <div className="font-weight-bold">{teachSubjectName}</div>
                </div>
                <div className="col-md-4">
                  <div className="text-muted small">ระดับชั้น</div>
                  <div className="font-weight-bold">{gradeLevelName}</div>
                </div>
                <div className="col-md-4">
                  <div className="text-muted small">มาตรฐานการเรียนรู้</div>
                  <div className="font-weight-bold text-primary">{row.content_s_name}</div>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">ประเภทตัวชี้วัด:</label>
                    <select
                      name="indicator_id"
                      className="form-control"
                      value={form.indicator_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- เลือกประเภทตัวชี้วัด --</option>
                      {indicatorTypes.map((t) => (
                        <option key={t.indicator_id} value={t.indicator_id}>
                          {t.indicator_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">กลุ่มที่ (indicator_group):</label>
                    <input
                      type="text"
                      className="form-control"
                      name="indicator_group"
                      value={form.indicator_group}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-12 mb-3">
                    <label className="font-weight-bold small text-muted">ชื่อตัวชี้วัด (เช่น ท 1.1 ม.1/1):</label>
                    <input
                      type="text"
                      className="form-control"
                      name="indicators_name"
                      value={form.indicators_name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-12 mb-3">
                    <label className="font-weight-bold small text-muted">รายละเอียดคำอธิบายตัวชี้วัด:</label>
                    <textarea
                      rows={4}
                      className="form-control"
                      name="indicators_details"
                      value={form.indicators_details}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <Link to="/indicators" className="btn btn-secondary px-3">
                    ยกเลิก
                  </Link>
                  <button type="submit" className="btn btn-warning font-weight-bold text-dark px-4" disabled={saving}>
                    {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
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

export default IndicatorsEdit;
