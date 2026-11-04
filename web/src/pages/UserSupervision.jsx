import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import useUserLookups from '../hooks/useUserLookups';
import useAppConfig from '../hooks/useAppConfig';
import UserDirectoryTable from '../components/UserDirectoryTable';
import SearchableSelect from '../components/SearchableSelect';
import { showToast } from '../utils/toast';

const SUPERVISION_ORDER = [
  { field: 'position_id', ascending: false },
  { field: 'academic_id', ascending: true },
  { field: 'id', ascending: true },
];

const UserSupervision = () => {
  const { user } = useAuth();
  const { lookups, lists } = useUserLookups();
  const { config } = useAppConfig();
  const areaCode = config.AREA_CODE10 || '1000650001';

  const [approvedNomineeIds, setApprovedNomineeIds] = useState([]);
  const [nominationsReady, setNominationsReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Appoint Teacher-Evaluator Modal State
  const [showAppointModal, setShowAppointModal] = useState(false);
  const [modalSchoolId, setModalSchoolId] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [appointing, setAppointing] = useState(false);

  const loadApprovedNominations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tbl_EvaluatorNominations')
        .select('nominee_people_id')
        .eq('status', 'approved');
      if (!error && data) {
        const ids = Array.from(
          new Set(
            data
              .map((n) => String(n.nominee_people_id || '').trim())
              .filter((id) => /^\d{10,13}$/.test(id))
          )
        );
        setApprovedNomineeIds(ids);
      } else {
        setApprovedNomineeIds([]);
      }
    } catch (err) {
      console.warn('loadApprovedNominations warning:', err);
      setApprovedNomineeIds([]);
    } finally {
      setNominationsReady(true);
    }
  }, []);

  useEffect(() => {
    loadApprovedNominations();
  }, [loadApprovedNominations]);

  // Load candidate teachers when school changes inside the modal
  useEffect(() => {
    if (!showAppointModal || !modalSchoolId) {
      setCandidates([]);
      setSelectedCandidateId('');
      return;
    }
    let mounted = true;
    const fetchCandidates = async () => {
      setCandidatesLoading(true);
      try {
        const { data, error } = await supabase
          .from('tbl_Users')
          .select('id, people_id, prefix, name, lastname, position_id, academic_id, teach_subject, school, level')
          .eq('school', modalSchoolId)
          .eq('register_isConfirm', '1')
          .order('name', { ascending: true });
        if (error) throw error;
        if (mounted) {
          setCandidates(data || []);
          setSelectedCandidateId('');
        }
      } catch (err) {
        console.error('Load evaluator candidates error:', err);
      } finally {
        if (mounted) setCandidatesLoading(false);
      }
    };
    fetchCandidates();
    return () => {
      mounted = false;
    };
  }, [showAppointModal, modalSchoolId]);

  const approvedSet = useMemo(() => new Set(approvedNomineeIds), [approvedNomineeIds]);

  const applyBaseFilter = useCallback(
    (query) => {
      if (!nominationsReady) return null;
      if (approvedNomineeIds.length > 0) {
        return query.or(
          `level.in.(supervision,supervisor,districdirector),people_id.in.(${approvedNomineeIds.join(',')})`
        );
      }
      return query.in('level', ['supervision', 'supervisor', 'districdirector']);
    },
    [nominationsReady, approvedNomineeIds]
  );

  const resolveEditRoute = useCallback((row) => {
    let base = 'teacher_edit';
    if (row.level === 'districdirector') base = 'dd_edit';
    else if (row.level === 'supervisor') base = 'supervisor_edit';
    else if (row.level === 'directorschool') base = 'directorschool_edit';
    const params = new URLSearchParams();
    if (row.people_id) params.set('people_id', row.people_id);
    if (row.id) params.set('id', String(row.id));
    return `/${base}?${params.toString()}`;
  }, []);

  /**
   * CRITICAL BUG FIX:
   * Revoking an appointed teacher-evaluator ONLY updates tbl_EvaluatorNominations (and is_evaluator / supervision role if present)
   * WITHOUT EVER touching or wiping `school` on `tbl_Users`!
   */
  const handleRevokeEvaluator = async (row, reload) => {
    const fullName = `${lookups.prefix[row.prefix] || ''}${row.name || ''} ${row.lastname || ''}`.trim();
    const schoolName = lookups.school[row.school] || row.school || '-';

    if (row.level === 'supervisor' || row.level === 'districdirector') {
      Swal.fire({
        title: 'ผู้ประเมินโดยตำแหน่ง',
        html: `<strong>${fullName}</strong> เป็นกรรมการนิเทศโดยตำแหน่ง (${
          row.level === 'supervisor' ? 'ศึกษานิเทศก์' : 'ผู้บริหารเขตพื้นที่ฯ'
        })<br/><small class="text-muted">หากต้องการปรับเปลี่ยนตำแหน่ง กรุณาใช้เมนู "ปรับเปลี่ยนตำแหน่ง/สิทธิ์"</small>`,
        icon: 'info',
        confirmButtonText: 'รับทราบ',
      });
      return;
    }

    const confirm = await Swal.fire({
      title: 'ถอดถอนรายชื่อผู้ทรงคุณวุฒินิเทศ?',
      html: `
        <div class="text-left small">
          <p class="mb-2">ต้องการยกเลิกการแต่งตั้ง <strong>${fullName}</strong> (${schoolName}) จากทำเนียบผู้ประเมินใช่หรือไม่?</p>
          <div class="p-2 rounded bg-info-subtle text-info-emphasis border">
            <i class="fa-solid fa-shield-check mr-1"></i>
            <strong>ปลอดภัย 100%:</strong> ข้อมูลสังกัดโรงเรียน (<strong>${schoolName}</strong>) และแผนการสอนของครูจะยังคงอยู่ครบถ้วน ไม่ถูกลบหรือล้างสังกัด
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'ยืนยันถอดถอนสิทธิ์ผู้ประเมิน',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirm.isConfirmed) return;

    try {
      // 1. Update nomination status in tbl_EvaluatorNominations
      if (row.people_id) {
        const { error: nomErr } = await supabase
          .from('tbl_EvaluatorNominations')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('nominee_people_id', row.people_id)
          .eq('status', 'approved');
        if (nomErr && nomErr.code !== '42P01') throw nomErr;
      }

      // 2. Safely update tbl_Users ONLY for evaluator flag/level — NEVER touch `school`!
      const userPatch = {};
      if (Object.prototype.hasOwnProperty.call(row, 'is_evaluator')) {
        userPatch.is_evaluator = false;
      }
      if (row.level === 'supervision') {
        userPatch.level = ['10006', '10007'].includes(String(row.position_id))
          ? 'directorschool'
          : 'teacher';
      }

      if (Object.keys(userPatch).length > 0) {
        const { error: userErr } = await supabase
          .from('tbl_Users')
          .update(userPatch)
          .eq('id', row.id);
        if (userErr) throw userErr;
      }

      showToast(`ถอดถอนสิทธิ์ผู้ประเมินของ ${fullName} เรียบร้อยแล้ว`, 'success');
      await loadApprovedNominations();
      setRefreshKey((k) => k + 1);
      reload?.();
    } catch (err) {
      console.error('Revoke evaluator error:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถถอดถอนสิทธิ์ผู้ประเมินได้', 'error');
    }
  };

  const handleAppointSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCandidateId || appointing) return;

    const candidate = candidates.find((c) => String(c.id) === String(selectedCandidateId));
    if (!candidate || !candidate.people_id) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'บุคลากรที่เลือกไม่มีเลขประจำตัวประชาชน 13 หลักในระบบ', 'warning');
      return;
    }

    setAppointing(true);
    try {
      const actorId =
        user?.user_metadata?.people_id || user?.email || user?.user || 'admin';

      // Check existing nomination record
      const { data: existingRows, error: checkErr } = await supabase
        .from('tbl_EvaluatorNominations')
        .select('id, status')
        .eq('nominee_people_id', candidate.people_id)
        .limit(1);

      if (checkErr && checkErr.code !== '42P01') throw checkErr;

      if (existingRows && existingRows.length > 0) {
        const { error: updErr } = await supabase
          .from('tbl_EvaluatorNominations')
          .update({ status: 'approved', updated_at: new Date().toISOString() })
          .eq('id', existingRows[0].id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from('tbl_EvaluatorNominations')
          .insert([
            {
              nominee_people_id: candidate.people_id,
              nominated_by: String(actorId).slice(0, 13),
              status: 'approved',
            },
          ]);
        if (insErr) throw insErr;
      }

      // Sync is_evaluator on tbl_Users only if that column exists — NEVER touch `school`!
      if (Object.prototype.hasOwnProperty.call(candidate, 'is_evaluator')) {
        await supabase
          .from('tbl_Users')
          .update({ is_evaluator: true })
          .eq('id', candidate.id);
      }

      const fullName = `${lookups.prefix[candidate.prefix] || ''}${candidate.name} ${candidate.lastname}`.trim();
      showToast(`แต่งตั้ง ${fullName} เป็นผู้ประเมินเรียบร้อยแล้ว`, 'success');
      setShowAppointModal(false);
      setModalSchoolId('');
      setSelectedCandidateId('');
      await loadApprovedNominations();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Appoint evaluator error:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถแต่งตั้งผู้ประเมินได้', 'error');
    } finally {
      setAppointing(false);
    }
  };

  const schoolOptions = useMemo(
    () =>
      lists.school
        .filter((s) => String(s.school_id) !== String(areaCode))
        .map((s) => ({
          value: String(s.school_id),
          label: s.school_name,
          subLabel: `รหัสโรงเรียน: ${s.school_id}`,
        })),
    [lists.school, areaCode]
  );

  const candidateOptions = useMemo(() => {
    return candidates.map((c) => {
      const alreadyEvaluator =
        approvedSet.has(c.people_id) ||
        ['supervision', 'supervisor', 'districdirector'].includes(c.level);
      const prefix = lookups.prefix[c.prefix] || '';
      const pos = lookups.position[c.position_id] || '';
      const acad = lookups.academic[c.academic_id] || '';
      const subj = lookups.teachSubject[c.teach_subject] || '';
      return {
        value: String(c.id),
        label: `${prefix}${c.name} ${c.lastname}${alreadyEvaluator ? ' (เป็นกรรมการนิเทศอยู่แล้ว)' : ''}`,
        subLabel: [pos, acad, subj ? `กลุ่มสาระ: ${subj}` : ''].filter(Boolean).join(' • '),
      };
    });
  }, [candidates, approvedSet, lookups]);

  const extraColumns = useMemo(
    () => [
      {
        key: 'evaluator_type',
        label: 'ประเภทกรรมการนิเทศ',
        render: (row) => {
          if (row.level === 'districdirector') {
            return (
              <span className="badge bg-primary-subtle text-primary px-2 py-1">
                <i className="fa-solid fa-user-tie mr-1"></i>ผู้บริหารเขตฯ (โดยตำแหน่ง)
              </span>
            );
          }
          if (row.level === 'supervisor') {
            return (
              <span className="badge bg-info-subtle text-info-emphasis px-2 py-1">
                <i className="fa-solid fa-user-graduate mr-1"></i>ศึกษานิเทศก์ (โดยตำแหน่ง)
              </span>
            );
          }
          return (
            <span className="badge bg-success-subtle text-success-emphasis px-2 py-1">
              <i className="fa-solid fa-award mr-1"></i>ครูผู้ทรงคุณวุฒิ (แต่งตั้ง)
            </span>
          );
        },
      },
    ],
    []
  );

  return (
    <>
      <UserDirectoryTable
        title="ทำเนียบกรรมการผู้นิเทศและครูผู้ทรงคุณวุฒิ"
        subtitle="รายชื่อผู้บริหารเขตฯ ศึกษานิเทศก์ และครูผู้ทรงคุณวุฒิที่ได้รับการแต่งตั้งเป็นคณะกรรมการประเมิน"
        icon="fa-user-check"
        accentColor="success"
        applyBaseFilter={applyBaseFilter}
        editVariant={resolveEditRoute}
        showSchoolFilter={true}
        excludeAreaFromSchools={false}
        showSubjectFilter={true}
        showAcademicFilter={true}
        orderBy={SUPERVISION_ORDER}
        refreshKey={refreshKey}
        allowDelete={false}
        columns={{
          thaiId: true,
          school: true,
          subject: true,
          position: true,
          academic: true,
          status: false,
          extra: extraColumns,
        }}
        headerActions={
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm px-3"
              onClick={() => setShowAppointModal(true)}
            >
              <i className="fa-solid fa-user-plus mr-1"></i>
              แต่งตั้งครูผู้ทรงคุณวุฒิเพิ่ม
            </button>
            <Link to="/approve_evaluator" className="btn btn-outline-warning btn-sm px-3">
              <i className="fa-solid fa-clipboard-check mr-1"></i>
              ตรวจคำขอเสนอชื่อ
            </Link>
          </div>
        }
        renderCustomActions={(row, { reload }) => {
          const isExOfficio = row.level === 'supervisor' || row.level === 'districdirector';
          if (isExOfficio) return null;
          return (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => handleRevokeEvaluator(row, reload)}
              title="ถอดถอนจากการเป็นครูผู้ทรงคุณวุฒินิเทศ (ไม่กระทบโรงเรียนสังกัด)"
            >
              <i className="fa-solid fa-user-minus"></i>
            </button>
          );
        }}
        emptyTitle="ยังไม่มีรายชื่อผู้ประเมิน"
        emptyMessage="สามารถกดปุ่ม แต่งตั้งครูผู้ทรงคุณวุฒิเพิ่ม เพื่อเพิ่มกรรมการนิเทศเข้าสู่ทำเนียบได้ทันที"
      />

      {/* Appoint Teacher-Evaluator Modal */}
      {showAppointModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1070 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !appointing) setShowAppointModal(false);
          }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px' }}>
              <div className="modal-header bg-primary text-white py-3" style={{ borderTopLeftRadius: '14px', borderTopRightRadius: '14px' }}>
                <h5 className="modal-title font-weight-bold m-0">
                  <i className="fa-solid fa-award mr-2"></i>
                  แต่งตั้งครูผู้ทรงคุณวุฒิเป็นกรรมการนิเทศ
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  onClick={() => setShowAppointModal(false)}
                  disabled={appointing}
                >
                  <span>&times;</span>
                </button>
              </div>

              <form onSubmit={handleAppointSubmit}>
                <div className="modal-body p-4">
                  <div className="alert bg-info-subtle text-info-emphasis border-0 small mb-3">
                    <i className="fa-solid fa-circle-info mr-1"></i>
                    ครูหรือผู้บริหารที่ได้รับการแต่งตั้งจะสามารถเข้าโหมด <strong>กรรมการนิเทศ</strong> เพื่อประเมินแผนและคลิปการสอนได้โดยยังคงสังกัดโรงเรียนเดิม
                  </div>

                  <div className="form-group mb-3">
                    <label className="form-label">1. เลือกสถานศึกษาต้นสังกัด <span className="text-danger">*</span></label>
                    <SearchableSelect
                      options={schoolOptions}
                      value={modalSchoolId}
                      onChange={(val) => setModalSchoolId(val)}
                      placeholder="-- ค้นหาและเลือกโรงเรียน --"
                      searchPlaceholder="พิมพ์ชื่อโรงเรียน..."
                      required
                    />
                  </div>

                  <div className="form-group mb-2">
                    <label className="form-label">
                      2. เลือกครู / บุคลากรผู้ทรงคุณวุฒิ <span className="text-danger">*</span>
                    </label>
                    {candidatesLoading ? (
                      <div className="form-control bg-light text-muted small">
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i>กำลังโหลดรายชื่อบุคลากรในโรงเรียน...
                      </div>
                    ) : (
                      <SearchableSelect
                        options={candidateOptions}
                        value={selectedCandidateId}
                        onChange={(val) => setSelectedCandidateId(val)}
                        placeholder={
                          modalSchoolId
                            ? `-- เลือกบุคลากร (${candidateOptions.length} คน) --`
                            : '-- กรุณาเลือกโรงเรียนก่อน --'
                        }
                        searchPlaceholder="ค้นหาชื่อ หรือกลุ่มสาระฯ..."
                        disabled={!modalSchoolId}
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="modal-footer bg-light py-2">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowAppointModal(false)}
                    disabled={appointing}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary px-4"
                    disabled={appointing || !selectedCandidateId}
                  >
                    <i className="fa-solid fa-user-check mr-1"></i>
                    {appointing ? 'กำลังแต่งตั้ง...' : 'ยืนยันแต่งตั้งผู้ประเมิน'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserSupervision;
