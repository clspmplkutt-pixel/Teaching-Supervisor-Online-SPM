import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const StrandsEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState(null);
  const [teachSubjectName, setTeachSubjectName] = useState('');
  const [strandsName, setStrandsName] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tbl_strands')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return;

        const { data: subjectData, error: subjectError } = await supabase
          .from('tbl_system_Teach_Subject')
          .select('teach_subject')
          .eq('teach_subject_id', data.teach_subject_id)
          .maybeSingle();
        if (subjectError) throw subjectError;

        if (mounted) {
          setRow(data);
          setTeachSubjectName(subjectData?.teach_subject || '');
          setStrandsName(data.strands_name || '');
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
      const { error } = await supabase
        .from('tbl_strands')
        .update({ strands_name: strandsName })
        .eq('id', id);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'แก้ไขข้อมูลสำเร็จ', 'success');
      navigate('/strands');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด', 'error');
      navigate('/strands');
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
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> แก้ไขข้อมูลสาระการเรียนรู้รายวิชา</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label>กลุ่มสาระการเรียนรู้ : {teachSubjectName}</label>
              </div>
              <div className="mb-3">
                <label>ลำดับที่ : {row.strands_order}</label>
              </div>
              <div className="mb-3">
                <label>รหัสสาระการเรียนรู้ : {row.strands_id}</label>
              </div>
              <div className="mb-3">
                <label htmlFor="strands_name">สาระการเรียนรู้: </label>
                <input
                  type="text"
                  className="form-control"
                  id="strands_name"
                  name="strands_name"
                  placeholder="สาระการเรียนรู้"
                  value={strandsName}
                  onChange={(e) => setStrandsName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <button type="submit" className="btn btn-primary mt-3" disabled={saving}>บันทึก</button>
                <button type="button" className="btn btn-danger mt-3 ml-2" onClick={() => navigate('/strands')}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrandsEdit;
