import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const SendClip = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const planid = query.get('planid') || '';
  const { loading: profileLoading } = useUserProfile();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [lookups, setLookups] = useState({
    teachSubject: {},
    gradeLevel: {},
  });
  const [clipUrl, setClipUrl] = useState('');
  const [afterTeaching, setAfterTeaching] = useState('');

  const videoId = useMemo(() => {
    if (!clipUrl) return '';
    const match = clipUrl.match(/(?:v=|be\/|embed\/)([A-Za-z0-9_-]{6,})/);
    return match ? match[1] : '';
  }, [clipUrl]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!planid) return;
      setLoading(true);
      try {
        const [subjectRes, gradeRes, planRes] = await Promise.all([
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name'),
          supabase.from('tbl_sendplan').select('*').eq('planid', planid).maybeSingle(),
        ]);

        const teachSubjectMap = {};
        subjectRes.data?.forEach((s) => { teachSubjectMap[s.teach_subject_id] = s.teach_subject; });
        const gradeMap = {};
        gradeRes.data?.forEach((g) => { gradeMap[g.grade_level_id] = g.grade_level_name; });

        if (mounted) {
          setLookups({ teachSubject: teachSubjectMap, gradeLevel: gradeMap });
          setPlan(planRes.data || null);
        }
      } catch (err) {
        console.error('SendClip load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!profileLoading) loadData();

    return () => { mounted = false; };
  }, [planid, profileLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!planid) {
      Swal.fire('Error', 'ไม่พบแผนการสอน', 'error');
      return;
    }
    if (!clipUrl) {
      Swal.fire('Error', 'กรุณากรอกลิงก์ YouTube', 'error');
      return;
    }

    const clipId = videoId || clipUrl;

    try {
      const { error } = await supabase
        .from('tbl_sendplan')
        .update({
          plan_clip: clipId,
          plan_after_teaching: afterTeaching,
          plan_status: '5',
        })
        .eq('planid', planid);

      if (error) throw error;

      Swal.fire('สำเร็จ', 'ส่งคลิปการสอนเรียบร้อย', 'success');
      navigate('/statusplan');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถบันทึกได้', 'error');
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="send-clip">
      <div className="row">
        <div className="col-12">
          <div className="card card-success">
            <div className="card-header">
              <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> ส่งคลิปการสอน</h3>
            </div>
            <div className="card-body">
              <div className="card card-teal">
                <div className="card-header">
                  <h4 className="card-title">ข้อมูลแผนการสอน</h4>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-lg-6">
                      กลุ่มสาระ : <span className="text-success">{lookups.teachSubject[plan?.teach_subject_id] || '-'}</span>
                    </div>
                    <div className="col-lg-6">
                      ระดับชั้นที่ทำการสอน : <span className="text-success">{lookups.gradeLevel[plan?.grade_level_id] || '-'}</span>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-6">
                      รหัสวิชา : <span className="text-success">{plan?.subject_code || '-'}</span>
                    </div>
                    <div className="col-lg-6">
                      ชื่อวิชา : <span className="text-success">{plan?.subject_name || '-'}</span>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-6">
                      หน่วยการเรียนรู้ : <span className="text-success">{plan?.subject_content || '-'}</span>
                    </div>
                    <div className="col-lg-6">
                      ชื่อแผนการสอน : <span className="text-success">{plan?.subject_name_plan || '-'}</span>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-3">
                      วันที่สอน : <span className="text-success">{plan?.teach_date || '-'}</span>
                    </div>
                    <div className="col-lg-3">
                      เริ่มเวลา : <span className="text-success">{plan?.teach_timestart || '-'}</span>
                    </div>
                    <div className="col-lg-3">
                      เสร็จเวลา : <span className="text-success">{plan?.teach_timeend || '-'}</span>
                    </div>
                    <div className="col-lg-3">
                      จำนวนนาที : <span className="text-success">{plan?.teach_minute || '-'} นาที</span>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-sm-6">
                    <div className="mb-3">
                      <label htmlFor="plan_after_teaching">บันทึกหลังสอน :</label>
                      <textarea
                        name="plan_after_teaching"
                        id="plan_after_teaching"
                        className="form-control"
                        rows="6"
                        value={afterTeaching}
                        onChange={(e) => setAfterTeaching(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="mb-3">
                      <label htmlFor="plan_clip">คลิปการสอน : นำมาจาก URL ของ Youtube</label>
                      <input
                        type="text"
                        className="form-control"
                        id="plan_clip"
                        placeholder="คลิปการสอน"
                        value={clipUrl}
                        onChange={(e) => setClipUrl(e.target.value)}
                      />
                    </div>

                    <div id="clip_div" className="mx-auto">
                      <iframe
                        id="iframe_clip"
                        width="560"
                        height="315"
                        src={videoId ? `https://www.youtube.com/embed/${videoId}` : ''}
                        title="YouTube video preview"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      ></iframe>
                    </div>
                  </div>
                  <div className="col-sm-12">
                    <div className="mb-3">
                      <button type="submit" className="btn btn-primary mt-3">บันทึก</button>
                      <Link to="/" className="btn btn-danger mt-3 ml-2">ยกเลิก</Link>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendClip;
