import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { showToast } from '../utils/toast';

const StrandsEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = (searchParams.get('id') || '').trim();

  const [loading, setLoading] = useState(Boolean(id));
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState(null);
  const [teachSubjectName, setTeachSubjectName] = useState('');
  const [strandsName, setStrandsName] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const { data, error } = await supabase
          .from('tbl_strands')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!mounted) return;

        if (!data) {
          setNotFound(true);
          return;
        }

        const { data: subjectData, error: subjectError } = await supabase
          .from('tbl_system_Teach_Subject')
          .select('teach_subject')
          .eq('teach_subject_id', data.teach_subject_id)
          .maybeSingle();
        if (subjectError) throw subjectError;

        if (mounted) {
          setRow(data);
          setTeachSubjectName(subjectData?.teach_subject || data.teach_subject_id || '');
          setStrandsName(data.strands_name || '');
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถโหลดข้อมูลสาระการเรียนรู้ได้', 'error');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !row) return;

    if (!strandsName.trim()) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาระบุชื่อสาระการเรียนรู้', 'warning');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tbl_strands')
        .update({ strands_name: strandsName.trim() })
        .eq('id', id);
      if (error) throw error;

      showToast('บันทึกการแก้ไขสาระการเรียนรู้สำเร็จ');
      navigate(`/strands?Teach_Subject=${encodeURIComponent(row.teach_subject_id || '')}`);
    } catch (err) {
      console.error(err);
      Swal.fire('ไม่สามารถบันทึกได้', err.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!id || notFound) {
    return (
      <EmptyState
        type="warning"
        icon="fa-sitemap"
        title={!id ? 'ไม่ได้ระบุรหัสสาระการเรียนรู้' : 'ไม่พบข้อมูลสาระการเรียนรู้'}
        message={
          !id
            ? 'กรุณาเลือกสาระการเรียนรู้ที่ต้องการแก้ไขจากหน้าจัดการสาระการเรียนรู้'
            : `ไม่พบสาระการเรียนรู้รหัส "${id}" ในระบบ`
        }
        actionLabel="กลับหน้าสาระการเรียนรู้"
        onAction={() => navigate('/strands')}
      />
    );
  }

  if (loading || !row) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลสาระการเรียนรู้..." />;
  }

  const backUrl = row.teach_subject_id
    ? `/strands?Teach_Subject=${encodeURIComponent(row.teach_subject_id)}`
    : '/strands';

  return (
    <div className="row justify-content-center">
      <div className="col-sm-12 col-md-10 col-lg-8">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h3 className="card-title m-0 font-weight-bold text-dark">
              <i className="fa-solid fa-pen-to-square text-info mr-2"></i>
              แก้ไขข้อมูลสาระการเรียนรู้รายวิชา
            </h3>
            <Link to={backUrl} className="btn btn-sm btn-outline-secondary">
              <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับ
            </Link>
          </div>
          <div className="card-body">
            <div className="p-3 rounded bg-light border mb-3">
              <div className="row">
                <div className="col-md-5 mb-2 mb-md-0">
                  <small className="text-muted d-block">กลุ่มสาระการเรียนรู้</small>
                  <strong className="text-dark">{teachSubjectName}</strong>
                </div>
                <div className="col-md-3 mb-2 mb-md-0">
                  <small className="text-muted d-block">สาระที่</small>
                  <strong className="text-dark">{row.strands_order}</strong>
                </div>
                <div className="col-md-4">
                  <small className="text-muted d-block">รหัสสาระการเรียนรู้</small>
                  <code>{row.strands_id}</code>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="strands_name" className="form-label">
                  ชื่อสาระการเรียนรู้ <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="strands_name"
                  name="strands_name"
                  placeholder="ระบุชื่อสาระการเรียนรู้"
                  value={strandsName}
                  onChange={(e) => setStrandsName(e.target.value)}
                  required
                />
              </div>

              <div className="d-flex flex-wrap gap-2 pt-2 border-top">
                <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={saving}>
                  <i className="fa-solid fa-floppy-disk mr-1"></i>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
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

export default StrandsEdit;
