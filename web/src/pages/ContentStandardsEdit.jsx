import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { showToast } from '../utils/toast';

const ContentStandardsEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = (searchParams.get('id') || '').trim();

  const [loading, setLoading] = useState(Boolean(id));
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState(null);
  const [teachSubjectName, setTeachSubjectName] = useState('');
  const [strandsName, setStrandsName] = useState('');
  const [detail, setDetail] = useState('');

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
          .from('tbl_content_standards')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!mounted) return;

        if (!data) {
          setNotFound(true);
          return;
        }

        const teachSubjectId = String(data.strands_id || '').slice(0, 4);
        const [subjectRes, strandsRes] = await Promise.all([
          supabase
            .from('tbl_system_Teach_Subject')
            .select('teach_subject')
            .eq('teach_subject_id', teachSubjectId)
            .maybeSingle(),
          supabase
            .from('tbl_strands')
            .select('strands_order, strands_name')
            .eq('strands_id', data.strands_id)
            .maybeSingle(),
        ]);
        if (subjectRes.error) throw subjectRes.error;
        if (strandsRes.error) throw strandsRes.error;

        if (mounted) {
          setRow(data);
          setTeachSubjectName(subjectRes.data?.teach_subject || teachSubjectId);
          setStrandsName(
            strandsRes.data
              ? `สาระที่ ${strandsRes.data.strands_order}: ${strandsRes.data.strands_name}`
              : data.strands_id
          );
          setDetail(data.content_s_detail || '');
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถโหลดข้อมูลมาตรฐานการเรียนรู้ได้', 'error');
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

    setSaving(true);
    try {
      const cleaned = (detail || '').replace(/[\r\n]+/g, ' ').trim();
      const { error } = await supabase
        .from('tbl_content_standards')
        .update({ content_s_detail: cleaned })
        .eq('id', id);
      if (error) throw error;

      showToast('บันทึกการแก้ไขมาตรฐานการเรียนรู้สำเร็จ');
      const teachSubjectId = String(row.strands_id || '').slice(0, 4);
      navigate(
        `/content_standards?Teach_Subject=${encodeURIComponent(teachSubjectId)}&strands_id=${encodeURIComponent(
          row.strands_id || ''
        )}`
      );
    } catch (err) {
      console.error(err);
      Swal.fire('ไม่สามารถบันทึกได้', err.message || 'เกิดข้อผิดพลาดในการแก้ไขมาตรฐานการเรียนรู้', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!id || notFound) {
    return (
      <EmptyState
        type="warning"
        icon="fa-book-bookmark"
        title={!id ? 'ไม่ได้ระบุรหัสมาตรฐานการเรียนรู้' : 'ไม่พบข้อมูลมาตรฐานการเรียนรู้'}
        message={
          !id
            ? 'กรุณาเลือกรายการมาตรฐานการเรียนรู้ที่ต้องการแก้ไขจากหน้ารวม'
            : `ไม่พบมาตรฐานการเรียนรู้รหัส "${id}" ในระบบ`
        }
        actionLabel="กลับหน้ามาตรฐานการเรียนรู้"
        onAction={() => navigate('/content_standards')}
      />
    );
  }

  if (loading || !row) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลมาตรฐานการเรียนรู้..." />;
  }

  const teachSubjectId = String(row.strands_id || '').slice(0, 4);
  const backUrl = `/content_standards?Teach_Subject=${encodeURIComponent(
    teachSubjectId
  )}&strands_id=${encodeURIComponent(row.strands_id || '')}`;

  return (
    <div className="row justify-content-center">
      <div className="col-sm-12 col-md-10 col-lg-8">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h3 className="card-title m-0 font-weight-bold text-dark">
              <i className="fa-solid fa-pen-to-square text-info mr-2"></i>
              แก้ไขข้อมูลมาตรฐานการเรียนรู้รายวิชา
            </h3>
            <Link to={backUrl} className="btn btn-sm btn-outline-secondary">
              <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับ
            </Link>
          </div>
          <div className="card-body">
            <div className="p-3 rounded bg-light border mb-3">
              <div className="row">
                <div className="col-md-4 mb-2 mb-md-0">
                  <small className="text-muted d-block">กลุ่มสาระการเรียนรู้</small>
                  <strong className="text-dark">{teachSubjectName}</strong>
                </div>
                <div className="col-md-5 mb-2 mb-md-0">
                  <small className="text-muted d-block">สาระการเรียนรู้</small>
                  <strong className="text-dark">{strandsName}</strong>
                </div>
                <div className="col-md-3">
                  <small className="text-muted d-block">รหัสมาตรฐานการเรียนรู้</small>
                  <span className="badge bg-success-subtle text-success font-weight-bold px-2 py-1">
                    {row.content_s_name}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="content_s_detail" className="form-label">
                  คำอธิบายมาตรฐานการเรียนรู้ <span className="text-danger">*</span>
                </label>
                <textarea
                  name="content_s_detail"
                  id="content_s_detail"
                  rows="6"
                  className="form-control"
                  placeholder="ระบุคำอธิบายมาตรฐานการเรียนรู้"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
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

export default ContentStandardsEdit;
