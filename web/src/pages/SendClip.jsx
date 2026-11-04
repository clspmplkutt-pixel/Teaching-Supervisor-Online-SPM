import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { showLineShareDialog } from '../utils/lineNotifyHelper';
import { extractYouTubeId, getYouTubeWatchUrl, getYouTubeEmbedUrl } from '../utils/scoreCalculator';

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
  const planid = query.get('planid') || query.get('edit') || '';
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

  // Extract YouTube ID reliably from various formats via scoreCalculator
  const videoId = useMemo(() => {
    return extractYouTubeId(clipUrl);
  }, [clipUrl]);

  const embedUrl = useMemo(() => {
    return videoId ? getYouTubeEmbedUrl(videoId) : '';
  }, [videoId]);

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
            // Reconstruct full watch URL if it's an 11-char ID
            const fullUrl = getYouTubeWatchUrl(planData.plan_clip);
            setClipUrl(fullUrl || planData.plan_clip);
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

  // Ownership & locked evaluation check
  const isOwner = useMemo(() => {
    if (!plan || !profile) return true;
    const role = profile.level || profile.level_id || '';
    if (role === 'admin' || role === 'root') return true;
    return String(plan.people_id).trim() === String(profile.people_id).trim();
  }, [plan, profile]);

  const isScoredAndLocked = useMemo(() => {
    if (!plan) return false;
    return Number(plan.plan_status) >= 6;
  }, [plan]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!planid || !plan) {
      Swal.fire('ข้อผิดพลาด', 'ไม่พบข้อมูลแผนการสอน', 'error');
      return;
    }
    if (!isOwner) {
      Swal.fire('ไม่มีสิทธิ์เข้าถึง', 'ท่านไม่สามารถแก้ไขคลิปการสอนของครูท่านอื่นได้', 'error');
      return;
    }
    if (isScoredAndLocked) {
      Swal.fire('แผนถูกประเมินแล้ว', 'แผนการสอนนี้ได้รับการประเมินจากคณะกรรมการแล้ว ไม่สามารถแก้ไขคลิปได้', 'warning');
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
    return <LoadingSpinner message="กำลังโหลดข้อมูลแผนการสอน..." />;
  }

  if (!plan) {
    return (
      <EmptyState
        title="ส่งคลิปการสอน"
        message="ไม่พบข้อมูลแผนการสอน หรือรหัสแผนไม่ถูกต้อง"
        actionLabel="กลับหน้ารายการแผน"
        actionTo="/statusplan"
      />
    );
  }

  return (
    <div className="send-clip container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          <div className="card card-success card-outline shadow-sm" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h4 className="font-weight-bold m-0 text-success">
                <i className="fa-solid fa-video mr-2"></i> ส่งคลิปการสอนและบันทึกหลังสอน
              </h4>
              <span className="badge badge-light border text-muted">
                รหัสแผน #{plan.planid}
              </span>
            </div>

            <div className="card-body p-4">
              {isScoredAndLocked && (
                <div className="alert alert-warning mb-4">
                  <i className="fa-solid fa-lock mr-2"></i>
                  <strong>แผนนี้ได้รับการประเมินแล้ว:</strong> ข้อมูลคลิปการสอนถูกล็อกเพื่อรักษาความถูกต้องของผลการประเมิน
                </div>
              )}

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
                      เวลา: {plan?.teach_timestart || '-'} - {plan?.teach_timeend || '-'} ({plan?.teach_minute || 0} นาที)
                    </span>
                    {plan?.plan_file && (
                      <a
                        href={plan.plan_file}
                        target="_blank"
                        rel="noreferrer"
                        className="text-danger font-weight-bold"
                      >
                        <i className="fa-regular fa-file-pdf mr-1"></i> ดูเอกสารแผนการสอน (PDF)
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                {/* 1. YouTube Link */}
                <div className="form-group mb-4">
                  <label className="font-weight-bold text-dark">
                    <i className="fa-brands fa-youtube text-danger mr-1"></i> ลิงก์วิดีโอคลิปการสอนบน YouTube <span className="text-danger">*</span>
                  </label>
                  <p className="small text-muted mb-2">
                    รองรับ URL รูปแบบเต็ม (youtube.com/watch?v=...), รูปแบบย่อ (youtu.be/...), Shorts หรือรหัสวิดีโอ 11 หลัก
                  </p>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ตัวอย่าง: https://www.youtube.com/watch?v=dQw4w9WgXcQ หรือ https://youtu.be/..."
                    value={clipUrl}
                    onChange={(e) => setClipUrl(e.target.value)}
                    disabled={isScoredAndLocked}
                    required
                  />

                  {/* Live Video Preview */}
                  {videoId && embedUrl && (
                    <div className="mt-3 p-3 bg-light rounded border">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <small className="text-success font-weight-bold">
                          <i className="fa-solid fa-circle-check mr-1"></i> ตรวจพบรหัสวิดีโอ: {videoId}
                        </small>
                        <a
                          href={`https://www.youtube.com/watch?v=${videoId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-xs btn-outline-danger"
                        >
                          <i className="fa-brands fa-youtube mr-1"></i> เปิดใน YouTube
                        </a>
                      </div>
                      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px' }}>
                        <iframe
                          title="YouTube video player"
                          src={embedUrl}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Reflection Textarea */}
                <div className="form-group mb-4">
                  <div className="d-flex justify-content-between align-items-center flex-wrap mb-1">
                    <label className="font-weight-bold text-dark m-0">
                      <i className="fa-solid fa-pen-nib text-primary mr-1"></i> บันทึกหลังการจัดการเรียนรู้ (Reflection)
                    </label>
                    <small className="text-muted">ความยาว {afterTeaching.length} ตัวอักษร</small>
                  </div>
                  <p className="small text-muted mb-2">
                    ระบุผลการจัดกิจกรรมการเรียนรู้ ปัญหา/อุปสรรคที่พบ และแนวทางแก้ไขเพื่อการพัฒนา เพื่อเป็นข้อมูลประกอบการประเมิน ว.PA
                  </p>

                  {/* Preset Buttons */}
                  {!isScoredAndLocked && (
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      <span className="small text-muted mr-1 align-self-center">ข้อความแนะนำ:</span>
                      {REFLECTION_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="btn btn-xs btn-outline-secondary"
                          onClick={() => {
                            setAfterTeaching((prev) => (prev ? `${prev}\n${preset.text}` : preset.text));
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <textarea
                    rows={6}
                    className="form-control"
                    placeholder="บันทึกผลการสอน เช่น นักเรียนมีความสนใจและมีส่วนร่วมในกิจกรรมกลุ่ม ผลงานนักเรียนบรรลุตามตัวชี้วัด..."
                    value={afterTeaching}
                    onChange={(e) => setAfterTeaching(e.target.value)}
                    disabled={isScoredAndLocked}
                  />
                </div>

                {/* Submit Buttons */}
                <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                  <Link to="/statusplan" className="btn btn-light border px-3">
                    <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับ
                  </Link>

                  {!isScoredAndLocked && (
                    <button
                      type="submit"
                      className="btn btn-success font-weight-bold px-4 shadow-sm"
                      disabled={submitting || !videoId}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true" />
                          กำลังบันทึก...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-paper-plane mr-1"></i> บันทึกและส่งคลิปการสอน
                        </>
                      )}
                    </button>
                  )}
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