import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const ContentStandardsEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState(null);
  const [teachSubjectName, setTeachSubjectName] = useState('');
  const [strandsName, setStrandsName] = useState('');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tbl_content_standards')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return;

        const teachSubjectId = String(data.strands_id || '').slice(0, 4);
        const [subjectRes, strandsRes] = await Promise.all([
          supabase
            .from('tbl_system_Teach_Subject')
            .select('teach_subject')
            .eq('teach_subject_id', teachSubjectId)
            .maybeSingle(),
          supabase
            .from('tbl_strands')
            .select('strands_name')
            .eq('strands_id', data.strands_id)
            .maybeSingle(),
        ]);
        if (subjectRes.error) throw subjectRes.error;
        if (strandsRes.error) throw strandsRes.error;

        if (mounted) {
          setRow(data);
          setTeachSubjectName(subjectRes.data?.teach_subject || '');
          setStrandsName(strandsRes.data?.strands_name || '');
          setDetail(data.content_s_detail || '');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cleaned = (detail || '').replace(/[\r\n]/g, '');
      const { error } = await supabase
        .from('tbl_content_standards')
        .update({ content_s_detail: cleaned })
        .eq('id', id);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'แก้ไขข้อมูลสำเร็จ', 'success');
      navigate('/content_standards');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด', 'error');
      navigate('/content_standards');
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
      <div className="col-sm-12 col-md-12 col-lg-8 col-xl-8">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> แก้ไขข้อมูลมาตรฐานการเรียนรู้รายวิชา</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3 mt-3">
                <label>กลุ่มสาระการเรียนรู้: {teachSubjectName}</label>
              </div>
              <div className="mb-3">
                <label>สาระการเรียนรู้: {strandsName}</label>
              </div>
              <div className="mb-3">
                <label>ชื่อสาระการเรียนรู้: {row.content_s_name}</label>
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
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
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

export default ContentStandardsEdit;
