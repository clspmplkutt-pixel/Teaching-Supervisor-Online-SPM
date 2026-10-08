import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { showLineShareDialog } from '../utils/lineNotifyHelper';

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const REFLECTION_PRESETS = [
  {
    label: '🌟 บรรลุวัตถุประสงค์ (K/P/A)',
    text: 'การจัดกิจกรรมการเรียนรู้บรรลุตามวัตถุประสงค์ที่กำหนด ผู้เรียนมีความรู้ความเข้าใจ (K) มีทักษะกระบวนการ (P) และแสดงคุณลักษณะอันพึงประสงค์ (A) ได้ตามเกณฑ์ที่กำหนด',
  },
  {
    label: '💡 ผู้เรียนมีส่วนร่วม Active Learning',
    text: 'ผู้เรียนให้ความสนใจและมีส่วนร่วมในกิจกรรมการเรียนรู้เป็นอย่างดี สามารถลงมือปฏิบัติ ทำงานร่วมกันเป็นกลุ่ม และนำเสนอผลงานได้อย่างมั่นใจ',
  },
  {
    label: '⚠️ ปัญหาที่พบและแนวทางแก้ไข',
    text: 'ปัญหาที่พบ: ผู้เรียนบางส่วนต้องใช้เวลาเพิ่มเติมในการทำความเข้าใจใบงานและฝึกทักษะปฏิบัติ\nแนวทางแก้ไข: ได้จัดกระบวนการเพื่อนช่วยเพื่อน (Peer Coaching) และให้คำแนะนำเพิ่มเติมรายบุคคล',
  },
  {
    label: '🚀 ผลงานและชิ้นงานคุณภาพดี',
    text: 'ผลงานและชิ้นงานของผู้เรียนมีความคิดสร้างสรรค์ สะท้อนถึงการประยุกต์ใช้องค์ความรู้ และบรรลุสมรรถนะสำคัญของผู้เรียนในศตวรรษที่ 21',
  },
];

const SendClip = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const planid = query.get('planid') || '';
  const { profile, loading: profileLoading } = useUserProfile();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [plan, setPlan] = useState(null);
  const [lookups, setLookups] = useState({
    teachSubject: {},
    gradeLevel: {},
    prefix: {},
    school: {},
  });
  const [clipUrl, setClipUrl] = useState('');
  const [afterTeaching, setAfterTeaching] = useState('');

  // Extract YouTube ID reliably from various formats
  const videoId = useMemo(() => {
    if (!clipUrl) return '';
    const trimmed = clipUrl.trim();
    // Direct 11-char ID
    if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    // URLs
    const match = trimmed.match(/(?:v=|\/be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
    return match ? match[1] : '';
  }, [clipUrl]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!planid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [subjectRes, gradeRes, prefixRes, schoolRes, planRes] = await Promise.all([
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name'),
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
          supabase.from('tbl_school').select('school_id, school_name'),
          supabase.from('tbl_sendplan').select('*').eq('planid', planid).maybeSingle(),
        ]);

        const teachSubjectMap = {};
        subjectRes.data?.forEach((s) => { teachSubjectMap[s.teach_subject_id] = s.teach_subject; });

        const gradeMap = {};
        gradeRes.data?.forEach((g) => { gradeMap[g.grade_level_id] = g.grade_level_name; });

        const prefixMap = {};
        prefixRes.data?.forEach((p) => { prefixMap[p.prefix_id] = p.prefix; });

        const schoolMap = {};
        schoolRes.data?.forEach((s) => { schoolMap[s.school_id] = s.school_name; });

        if (mounted) {
          setLookups({
            teachSubject: teachSubjectMap,
            gradeLevel: gradeMap,
            prefix: prefixMap,
            school: schoolMap,
          });
          const planData = planRes.data || null;
          setPlan(planData);
          if (planData?.plan_clip) {
            setClipUrl(planData.plan_clip);
          }
          if (planData?.plan_after_teaching) {
            setAfterTeaching(planData.plan_after_teaching);
          }
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
    if (!planid || !plan) {
      Swal.fire('ข้อผิดพลาด', 'ไม่พบข้อมูลแผนการสอน', 'error');
      return;
    }
    if (!clipUrl.trim()) {
      Swal.fire('กรุณาระบุคลิปการสอน', 'กรุณากรอกลิงก์วิดีโอ YouTube ของการจัดการเรียนรู้', 'warning');
      return;
    }
    if (!videoId) {
      Swal.fire('รูปแบบลิงก์ไม่ถูกต้อง', 'กรุณาระบุ URL วิดีโอ YouTube ที่ถูกต้อง เช่น https://youtu.be/... หรือ https://www.youtube.com/watch?v=...', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const clipId = videoId;

      const { error } = await supabase
        .from('tbl_sendplan')
        .update({
          plan_clip: clipId,
          plan_after_teaching: afterTeaching,
          plan_status: '5', // 5 = ส่งคลิปแล้ว • รอประเมิน
        })
        .eq('planid', planid);

      if (error) throw error;

      // Prepare LINE share message
      const teacherName = `${lookups.prefix[profile?.prefix] || ''}${profile?.name || ''} ${profile?.lastname || ''}`.trim();
      const schoolName = lookups.school[profile?.school] || '';

      const lineMsg =
        `🎬 [ส่งคลิปการสอนและบันทึกหลังสอนแล้ว]\n` +
        `ระบบนิเทศการศึกษาออนไลน์ สพม.พิษณุโลก อุตรดิตถ์\n\n` +
        `👤 ครูผู้สอน: ${teacherName || 'ครูผู้สอน'}\n` +
        (schoolName ? `🏫 สถานศึกษา: โรงเรียน${schoolName}\n` : '') +
        `📖 วิชา: ${plan.subject_name} (${plan.subject_code})\n` +
        `📝 แผนการสอน: ${plan.subject_name_plan}\n` +
        `🔢 รหัสแผน: #${plan.planid}\n` +
        `\nครูได้อัปโหลดคลิปวิดีโอการสอนและบันทึกหลังสอนเรียบร้อยแล้ว ขอเรียนเชิญคณะกรรมการนิเทศเข้าประเมินการจัดการเรียนรู้ได้ที่:\n` +
        `🔗 ${window.location.origin}/Plan_Check`;

      showLineShareDialog({
        title: 'ส่งคลิปการสอนสำเร็จ!',
        subtitle: 'บันทึกข้อมูลเรียบร้อยแล้ว ท่านสามารถแชร์แจ้งเตือนให้คณะกรรมการนิเทศเริ่มประเมินได้ทันที',
        messageText: lineMsg,
        onClose: () => {
          navigate('/statusplan');
        },
      });
    } catch (err) {
      console.error('SendClip submit error:', err);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || profileLoading) {
    return <LoadingSpinner text="กำลังโหลดข้อมูลแผนการสอน..." />;
  }

  if (!plan) {
    return (
      <EmptyState
        title="ส่งคลิปการสอน"
        message="ไม่พบข้อมูลแผนการสอน หรือรหัสแผนไม่ถูกต้อง"
        type="warning"
      />
    );
  }

  return (
    <div className="send-clip container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          <div className="card card-success card-outline shadow-sm" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap">
              <h4 className="font-weight-bold m-0 text-success">
                <i className="fa-solid fa-video mr-2"></i> ส่งคลิปการสอนและบันทึกหลังสอน
              </h4>
              <span className="badge badge-light border text-muted">
                รหัสแผน #{plan.planid}
              </span>
            </div>

            <div className="card-body p-4">
              {/* Plan Info Card */}
              <div className="card border-0 mb-4" style={{ background: '#f8fafc', borderRadius: '10px' }}>
                <div className="card-body p-3">
                  <div className="d-flex align-items-center mb-2">
                    <span className="badge badge-primary px-2 py-1 mr-2">
                      {lookups.teachSubject[plan?.teach_subject_id] || '-'}
                    </span>
                    <span className="badge badge-secondary px-2 py-1">
                      ชั้น {lookups.gradeLevel[plan?.grade_level_id] || '-'}
                    </span>
                  </div>
                  <h5 className="font-weight-bold text-dark mb-1">
                    {plan?.subject_name} ({plan?.subject_code})
                  </h5>
                  <p className="text-primary font-weight-bold mb-2">
                    แผนการสอน: {plan?.subject_name_plan}
                  </p>
                  {plan?.subject_content && (
                    <p className="small text-muted mb-2">
                      <strong>หน่วยการเรียนรู้:</strong> {plan?.subject_content}
                    </p>
                  )}
                  <div className="d-flex flex-wrap text-muted small" style={{ gap: '15px' }}>
                    <span>
                      <i className="fa-regular fa-calendar mr-1"></i>
                      สอนวันที่: {plan?.teach_date || '-'}
                    </span>
                    <span>
                      <i className="fa-regular fa-clock mr-1"></i>
                      เวลา: {plan?.teach_timestart} - {plan?.teach_timeend} ({plan?.teach_minute} นาที)
                    </span>
                    {plan?.plan_file && (
                      <a
                        href={plan.plan_file}
                        target="_blank"
                        rel="noreferrer"
                        className="text-danger font-weight-bold"
                      >
                        <i className="fa-regular fa-file-pdf mr-1"></i> ดูไฟล์แผน (PDF)
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Left Column: Post-teaching reflection */}
                  <div className="col-12 col-lg-6 mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label htmlFor="plan_after_teaching" className="font-weight-bold mb-0">
                        <i className="fa-solid fa-pen-to-square text-primary mr-1"></i> บันทึกหลังการจัดกิจกรรมการเรียนรู้ :
                      </label>
                      <span className="badge badge-light border text-muted" style={{ fontSize: '11px' }}>
                        <i className="fa-solid fa-wand-magic-sparkles text-primary mr-1"></i> คลิกเลือกข้อความสำเร็จรูป
                      </span>
                    </div>

                    {/* Quick Reflection Presets */}
                    <div className="d-flex flex-wrap mb-2">
                      {REFLECTION_PRESETS.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          className="btn btn-outline-info btn-xs mr-1 mb-1 shadow-sm"
                          style={{ borderRadius: '15px', fontSize: '12px', padding: '3px 10px' }}
                          onClick={() => {
                            setAfterTeaching((prev) => {
                              const cur = (prev || '').trim();
                              if (!cur) return preset.text;
                              if (cur.includes(preset.text)) return prev;
                              return `${cur}\n\n${preset.text}`;
                            });
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                      {afterTeaching && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-xs mb-1"
                          style={{ borderRadius: '15px', fontSize: '11px', padding: '3px 8px' }}
                          onClick={() => setAfterTeaching('')}
                          title="ล้างข้อความ"
                        >
                          <i className="fa-solid fa-eraser mr-1"></i> ล้าง
                        </button>
                      )}
                    </div>

                    <textarea
                      name="plan_after_teaching"
                      id="plan_after_teaching"
                      className="form-control"
                      rows="8"
                      placeholder="ระบุผลการจัดการเรียนรู้ ปัญหาหรืออุปสรรคที่พบ และแนวทางแก้ไขปรับปรุง หรือคลิกข้อความสำเร็จรูปด้านบน..."
                      value={afterTeaching}
                      onChange={(e) => setAfterTeaching(e.target.value)}
                    ></textarea>
                    <small className="text-muted d-block mt-1">
                      ข้อมูลนี้จะแสดงให้คณะกรรมการนิเทศพิจารณาประกอบการให้คะแนน
                    </small>
                  </div>

                  {/* Right Column: YouTube Clip URL & Preview */}
                  <div className="col-12 col-lg-6 mb-4">
                    <label htmlFor="plan_clip" className="font-weight-bold mb-1">
                      <i className="fa-brands fa-youtube text-danger mr-1"></i> ลิงก์คลิปวิดีโอการสอน (YouTube URL) :
                    </label>
                    <div className="input-group mb-2">
                      <div className="input-group-prepend">
                        <span className="input-group-text bg-white">
                          <i className="fa-brands fa-youtube text-danger"></i>
                        </span>
                      </div>
                      <input
                        type="text"
                        className="form-control"
                        id="plan_clip"
                        placeholder="วางลิงก์ YouTube เช่น https://youtu.be/..."
                        value={clipUrl}
                        onChange={(e) => setClipUrl(e.target.value)}
                        required
                      />
                    </div>
                    <small className="text-muted d-block mb-3">
                      รองรับทั้งลิงก์แบบปกติ, youtu.be, shorts หรือใส่เฉพาะ Video ID
                    </small>

                    {/* Responsive Video Preview Container */}
                    <div
                      className="rounded border d-flex align-items-center justify-content-center"
                      style={{
                        background: '#0f172a',
                        aspectRatio: '16/9',
                        width: '100%',
                        overflow: 'hidden',
                        position: 'relative',
                        borderRadius: '10px',
                      }}
                    >
                      {videoId ? (
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                          title="YouTube video preview"
                          style={{ width: '100%', height: '100%', border: 'none' }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      ) : (
                        <div className="text-center p-3 text-light" style={{ opacity: 0.6 }}>
                          <i className="fa-brands fa-youtube fa-3x mb-2 text-danger"></i>
                          <p className="mb-0 small">ตัวอย่างวิดีโอจะแสดงที่นี่ เมื่อท่านวางลิงก์ YouTube</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="col-12 pt-3 border-top d-flex gap-2 justify-content-end flex-wrap">
                    <Link
                      to="/statusplan"
                      className="btn btn-light border px-4 font-weight-bold"
                      style={{ borderRadius: '10px' }}
                    >
                      <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับ
                    </Link>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-success px-4 font-weight-bold shadow-sm"
                      style={{ borderRadius: '10px' }}
                    >
                      {submitting ? (
                        <span><span className="spinner-border spinner-border-sm mr-1"></span> กำลังบันทึก...</span>
                      ) : (
                        <span><i className="fa-solid fa-paper-plane mr-1"></i> บันทึกและส่งคลิปการสอน</span>
                      )}
                    </button>
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
