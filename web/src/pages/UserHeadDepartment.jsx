import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import useUserLookups from '../hooks/useUserLookups';
import useAppConfig from '../hooks/useAppConfig';
import UserDirectoryTable from '../components/UserDirectoryTable';
import SearchableSelect from '../components/SearchableSelect';
import { showToast } from '../utils/toast';

const UserHeadDepartment = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { lookups, lists } = useUserLookups();
  const { config } = useAppConfig();
  const areaCode = config.AREA_CODE10 || '1000650001';

  const activeRole =
    profile?.level || user?.level_id || user?.user_metadata?.role || user?.role || '';
  const isSchoolScoped = activeRole === 'admin_school' || activeRole === 'directorschool';
  const scopedSchoolId = isSchoolScoped
    ? profile?.school || user?.user_metadata?.school || user?.school || ''
    : '';

  const [refreshKey, setRefreshKey] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalSchoolId, setModalSchoolId] = useState('');
  const [modalSubjectId, setModalSubjectId] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [saving, setSaving] = useState(false);

  const effectiveModalSchool = isSchoolScoped ? scopedSchoolId : modalSchoolId;

  useEffect(() => {
    if (!showModal || !effectiveModalSchool) {
      setTeachers([]);
      setSelectedTeacherId('');
      return;
    }
    let mounted = true;
    const loadSchoolTeachers = async () => {
      setTeachersLoading(true);
      try {
        let q = supabase
          .from('tbl_Users')
          .select('id, people_id, prefix, name, lastname, teach_subject, academic_id, position_id, headDepartment')
          .eq('school', effectiveModalSchool)
          .in('level', ['teacher', 'admin_school'])
          .order('name', { ascending: true });

        if (modalSubjectId) {
          q = q.eq('teach_subject', modalSubjectId);
        }

        const { data, error } = await q;
        if (error) throw error;
        if (mounted) {
          setTeachers(data || []);
          setSelectedTeacherId('');
        }
      } catch (err) {
        console.error('Load school teachers error:', err);
      } finally {
        if (mounted) setTeachersLoading(false);
      }
    };
    loadSchoolTeachers();
    return () => {
      mounted = false;
    };
  }, [showModal, effectiveModalSchool, modalSubjectId]);

  const applyBaseFilter = useCallback((query) => {
    return query.eq('headDepartment', '1').in('level', ['teacher', 'admin_school']);
  }, []);

  const handleRevoke = async (row, reload) => {
    const fullName = `${lookups.prefix[row.prefix] || ''}${row.name || ''} ${row.lastname || ''}`.trim();
    const subjName = lookups.teachSubject[row.teach_subject] || '-';

    const confirm = await Swal.fire({
      title: 'ถอดถอนตำแหน่งหัวหน้ากลุ่มสาระฯ?',
      html: `ต้องการยกเลิกสถานะหัวหน้ากลุ่มสาระการเรียนรู้ (${subjName}) ของ <strong>${fullName}</strong> ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      confirmButtonText: 'ยืนยันถอดถอน',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirm.isConfirmed) return;

    try {
      let q = supabase.from('tbl_Users').update({ headDepartment: '0' }).eq('id', row.id);
      if (isSchoolScoped && scopedSchoolId) q = q.eq('school', scopedSchoolId);
      const { error } = await q;
      if (error) throw error;
      showToast(`ยกเลิกตำแหน่งหัวหน้ากลุ่มสาระฯ ของ ${fullName} แล้ว`, 'success');
      setRefreshKey((k) => k + 1);
      reload?.();
    } catch (err) {
      console.error(err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถอัปเดตสถานะได้', 'error');
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId || saving) return;
    setSaving(true);
    try {
      let q = supabase
        .from('tbl_Users')
        .update({ headDepartment: '1' })
        .eq('id', Number(selectedTeacherId));
      if (isSchoolScoped && scopedSchoolId) q = q.eq('school', scopedSchoolId);
      const { error } = await q;
      if (error) throw error;

      const chosen = teachers.find((t) => String(t.id) === String(selectedTeacherId));
      const fullName = chosen
        ? `${lookups.prefix[chosen.prefix] || ''}${chosen.name} ${chosen.lastname}`.trim()
        : 'ครูที่เลือก';
      showToast(`แต่งตั้ง ${fullName} เป็นหัวหน้ากลุ่มสาระฯ เรียบร้อยแล้ว`, 'success');
      setShowModal(false);
      setSelectedTeacherId('');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถแต่งตั้งหัวหน้ากลุ่มสาระฯ ได้', 'error');
    } finally {
      setSaving(false);
    }
  };

  const schoolOptions = useMemo(
    () =>
      lists.school
        .filter((s) => String(s.school_id) !== String(areaCode))
        .map((s) => ({
          value: String(s.school_id),
          label: s.school_name,
        })),
    [lists.school, areaCode]
  );

  const subjectOptions = useMemo(
    () => [
      { value: '', label: '-- ทุกกลุ่มสาระการเรียนรู้ --' },
      ...lists.teachSubject.map((s) => ({
        value: String(s.teach_subject_id),
        label: s.teach_subject,
      })),
    ],
    [lists.teachSubject]
  );

  const teacherOptions = useMemo(
    () =>
      teachers
        .filter((t) => String(t.headDepartment) !== '1')
        .map((t) => ({
          value: String(t.id),
          label: `${lookups.prefix[t.prefix] || ''}${t.name} ${t.lastname}`,
          subLabel: [
            lookups.teachSubject[t.teach_subject] ? `กลุ่มสาระ: ${lookups.teachSubject[t.teach_subject]}` : 'ไม่ระบุกลุ่มสาระฯ',
            lookups.academic[t.academic_id] || '',
          ]
            .filter(Boolean)
            .join(' • '),
        })),
    [teachers, lookups]
  );

  return (
    <>
      <UserDirectoryTable
        title="ทำเนียบหัวหน้ากลุ่มสาระการเรียนรู้"
        subtitle="แต่งตั้งและจัดการสิทธิ์หัวหน้ากลุ่มสาระการเรียนรู้ประจำสถานศึกษา"
        icon="fa-people-group"
        accentColor="info"
        applyBaseFilter={applyBaseFilter}
        editVariant="teacher"
        showSchoolFilter={true}
        showSubjectFilter={true}
        showAcademicFilter={true}
        refreshKey={refreshKey}
        allowDelete={false}
        columns={{
          thaiId: true,
          school: true,
          subject: true,
          position: true,
          academic: true,
          personType: true,
          status: false,
        }}
        headerActions={
          <button
            type="button"
            className="btn btn-primary btn-sm px-3"
            onClick={() => setShowModal(true)}
          >
            <i className="fa-solid fa-user-plus mr-1"></i>
            แต่งตั้งหัวหน้ากลุ่มสาระฯ
          </button>
        }
        renderCustomActions={(row, { reload }) => (
          <button
            type="button"
            className="btn btn-sm btn-outline-warning"
            onClick={() => handleRevoke(row, reload)}
            title="ถอดถอนตำแหน่งหัวหน้ากลุ่มสาระฯ"
          >
            <i className="fa-solid fa-user-xmark"></i>
          </button>
        )}
        emptyTitle="ยังไม่มีรายชื่อหัวหน้ากลุ่มสาระการเรียนรู้"
        emptyMessage="กดปุ่ม แต่งตั้งหัวหน้ากลุ่มสาระฯ ด้านบนเพื่อกำหนดครูทำหน้าที่หัวหน้ากลุ่มสาระฯ"
      />

      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1070 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setShowModal(false);
          }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px' }}>
              <div className="modal-header bg-info text-white py-3" style={{ borderTopLeftRadius: '14px', borderTopRightRadius: '14px' }}>
                <h5 className="modal-title font-weight-bold m-0">
                  <i className="fa-solid fa-people-group mr-2"></i>
                  แต่งตั้งหัวหน้ากลุ่มสาระการเรียนรู้
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  <span>&times;</span>
                </button>
              </div>

              <form onSubmit={handleAssignSubmit}>
                <div className="modal-body p-4">
                  <div className="form-group mb-3">
                    <label className="form-label">สถานศึกษา <span className="text-danger">*</span></label>
                    {isSchoolScoped ? (
                      <div className="form-control bg-light font-weight-semibold">
                        <i className="fa-solid fa-lock text-muted mr-2"></i>
                        {lookups.school[scopedSchoolId] || scopedSchoolId}
                      </div>
                    ) : (
                      <SearchableSelect
                        options={schoolOptions}
                        value={modalSchoolId}
                        onChange={(val) => setModalSchoolId(val)}
                        placeholder="-- เลือกโรงเรียน --"
                        searchPlaceholder="พิมพ์ชื่อโรงเรียน..."
                        required
                      />
                    )}
                  </div>

                  <div className="form-group mb-3">
                    <label className="form-label">กรองตามกลุ่มสาระการเรียนรู้ (ไม่บังคับ)</label>
                    <SearchableSelect
                      options={subjectOptions}
                      value={modalSubjectId}
                      onChange={(val) => setModalSubjectId(val)}
                      placeholder="-- ทุกกลุ่มสาระการเรียนรู้ --"
                      searchPlaceholder="ค้นหากลุ่มสาระฯ..."
                    />
                  </div>

                  <div className="form-group mb-2">
                    <label className="form-label">เลือกครูผู้สอนที่จะแต่งตั้ง <span className="text-danger">*</span></label>
                    {teachersLoading ? (
                      <div className="form-control bg-light text-muted small">
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i>กำลังโหลดรายชื่อครู...
                      </div>
                    ) : (
                      <SearchableSelect
                        options={teacherOptions}
                        value={selectedTeacherId}
                        onChange={(val) => setSelectedTeacherId(val)}
                        placeholder={
                          effectiveModalSchool
                            ? `-- เลือกครูผู้สอน (${teacherOptions.length} คน) --`
                            : '-- กรุณาเลือกโรงเรียนก่อน --'
                        }
                        searchPlaceholder="ค้นหาชื่อครู..."
                        disabled={!effectiveModalSchool}
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="modal-footer bg-light py-2">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="btn btn-info text-white px-4"
                    disabled={saving || !selectedTeacherId}
                  >
                    <i className="fa-solid fa-check mr-1"></i>
                    {saving ? 'กำลังบันทึก...' : 'ยืนยันการแต่งตั้ง'}
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

export default UserHeadDepartment;
