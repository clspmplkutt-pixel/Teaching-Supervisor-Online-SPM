import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useUserLookups from '../hooks/useUserLookups';
import useAppConfig from '../hooks/useAppConfig';
import UserDirectoryTable from '../components/UserDirectoryTable';
import SearchableSelect from '../components/SearchableSelect';
import { showToast } from '../utils/toast';

const UserSchoolAdmin = () => {
  const { lookups, lists } = useUserLookups();
  const { config } = useAppConfig();
  const areaCode = config.AREA_CODE10 || '1000650001';

  const [refreshKey, setRefreshKey] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalSchoolId, setModalSchoolId] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!showModal || !modalSchoolId) {
      setTeachers([]);
      setSelectedTeacherId('');
      return;
    }
    let mounted = true;
    const loadTeachers = async () => {
      setLoadingTeachers(true);
      try {
        const { data, error } = await supabase
          .from('tbl_Users')
          .select('id, people_id, prefix, name, lastname, position_id, teach_subject, level')
          .eq('school', modalSchoolId)
          .eq('level', 'teacher')
          .order('name', { ascending: true });
        if (error) throw error;
        if (mounted) {
          setTeachers(data || []);
          setSelectedTeacherId('');
        }
      } catch (err) {
        console.error('Load school teachers error:', err);
      } finally {
        if (mounted) setLoadingTeachers(false);
      }
    };
    loadTeachers();
    return () => {
      mounted = false;
    };
  }, [showModal, modalSchoolId]);

  const applyBaseFilter = useCallback((query, { areaCode: ac }) => {
    return query.eq('level', 'admin_school').neq('school', ac);
  }, []);

  const handleRevoke = async (row, reload) => {
    const fullName = `${lookups.prefix[row.prefix] || ''}${row.name || ''} ${row.lastname || ''}`.trim();
    const schoolName = lookups.school[row.school] || row.school || '-';

    const confirm = await Swal.fire({
      title: 'ยกเลิกสิทธิ์ School Admin?',
      html: `ต้องการปรับสิทธิ์ของ <strong>${fullName}</strong> (${schoolName}) กลับเป็น <strong>ครูผู้สอน (teacher)</strong> ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      confirmButtonText: 'ยืนยันยกเลิกสิทธิ์',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirm.isConfirmed) return;

    try {
      const { error } = await supabase
        .from('tbl_Users')
        .update({ level: 'teacher' })
        .eq('id', row.id);
      if (error) throw error;
      showToast(`ปรับสิทธิ์ของ ${fullName} กลับเป็นครูผู้สอนแล้ว`, 'success');
      setRefreshKey((k) => k + 1);
      reload?.();
    } catch (err) {
      console.error(err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถยกเลิกสิทธิ์ได้', 'error');
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tbl_Users')
        .update({
          level: 'admin_school',
          register_isConfirm: '1',
          status: '1',
        })
        .eq('id', Number(selectedTeacherId));
      if (error) throw error;

      const chosen = teachers.find((t) => String(t.id) === String(selectedTeacherId));
      const fullName = chosen
        ? `${lookups.prefix[chosen.prefix] || ''}${chosen.name} ${chosen.lastname}`.trim()
        : 'บุคลากรที่เลือก';
      showToast(`แต่งตั้ง ${fullName} เป็น School Admin เรียบร้อยแล้ว`, 'success');
      setShowModal(false);
      setModalSchoolId('');
      setSelectedTeacherId('');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถแต่งตั้ง School Admin ได้', 'error');
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

  const teacherOptions = useMemo(
    () =>
      teachers.map((t) => ({
        value: String(t.id),
        label: `${lookups.prefix[t.prefix] || ''}${t.name} ${t.lastname}`,
        subLabel: [
          lookups.position[t.position_id] || 'ครู',
          lookups.teachSubject[t.teach_subject] ? `กลุ่มสาระ: ${lookups.teachSubject[t.teach_subject]}` : '',
        ]
          .filter(Boolean)
          .join(' • '),
      })),
    [teachers, lookups]
  );

  return (
    <>
      <UserDirectoryTable
        title="ผู้ดูแลระบบระดับสถานศึกษา (School Admin)"
        subtitle="แต่งตั้งหรือถอดถอนครู/บุคลากรเพื่อช่วยดูแลอนุมัติสมาชิกและรีเซ็ตรหัสผ่านเฉพาะภายในโรงเรียนของตนเอง"
        icon="fa-user-gear"
        accentColor="warning"
        applyBaseFilter={applyBaseFilter}
        editVariant="teacher"
        showSchoolFilter={true}
        showSubjectFilter={true}
        showAcademicFilter={false}
        refreshKey={refreshKey}
        allowDelete={false}
        columns={{
          thaiId: true,
          school: true,
          subject: true,
          position: true,
          academic: false,
          status: true,
        }}
        infoBanner={
          <div className="p-2 px-3 rounded bg-warning-subtle text-warning-emphasis small d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <i className="fa-solid fa-shield-halved mr-2"></i>
              <strong>ขอบเขตสิทธิ์ School Admin:</strong> อนุมัติผู้สมัครใหม่ จัดการข้อมูลครู แต่งตั้งหัวหน้ากลุ่มสาระฯ และรีเซ็ตรหัสผ่านได้เฉพาะบุคลากรในโรงเรียนตนเองเท่านั้น
            </div>
          </div>
        }
        headerActions={
          <button
            type="button"
            className="btn btn-primary btn-sm px-3"
            onClick={() => setShowModal(true)}
          >
            <i className="fa-solid fa-user-plus mr-1"></i>
            แต่งตั้ง School Admin เพิ่ม
          </button>
        }
        renderCustomActions={(row, { reload }) => (
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => handleRevoke(row, reload)}
            title="ยกเลิกสิทธิ์ School Admin (ปรับกลับเป็นครูผู้สอน)"
          >
            <i className="fa-solid fa-user-xmark"></i>
          </button>
        )}
        emptyTitle="ยังไม่มีผู้ดูแลระบบระดับสถานศึกษา"
        emptyMessage="กดปุ่ม แต่งตั้ง School Admin เพิ่ม เพื่อมอบหมายครูทำหน้าที่ดูแลข้อมูลระดับสถานศึกษา"
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
              <div className="modal-header bg-primary text-white py-3" style={{ borderTopLeftRadius: '14px', borderTopRightRadius: '14px' }}>
                <h5 className="modal-title font-weight-bold m-0">
                  <i className="fa-solid fa-user-gear mr-2"></i>
                  แต่งตั้งผู้ดูแลระบบระดับสถานศึกษา (School Admin)
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
                    <label className="form-label">1. เลือกสถานศึกษา <span className="text-danger">*</span></label>
                    <SearchableSelect
                      options={schoolOptions}
                      value={modalSchoolId}
                      onChange={(val) => setModalSchoolId(val)}
                      placeholder="-- ค้นหาและเลือกสถานศึกษา --"
                      searchPlaceholder="พิมพ์ชื่อโรงเรียน..."
                      required
                    />
                  </div>

                  <div className="form-group mb-2">
                    <label className="form-label">2. เลือกครูผู้สอนที่จะแต่งตั้งเป็น School Admin <span className="text-danger">*</span></label>
                    {loadingTeachers ? (
                      <div className="form-control bg-light text-muted small">
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i>กำลังโหลดรายชื่อครู...
                      </div>
                    ) : (
                      <SearchableSelect
                        options={teacherOptions}
                        value={selectedTeacherId}
                        onChange={(val) => setSelectedTeacherId(val)}
                        placeholder={
                          modalSchoolId
                            ? `-- เลือกครูผู้สอน (${teacherOptions.length} คน) --`
                            : '-- กรุณาเลือกสถานศึกษาก่อน --'
                        }
                        searchPlaceholder="พิมพ์ชื่อครู..."
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
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary px-4"
                    disabled={saving || !selectedTeacherId}
                  >
                    <i className="fa-solid fa-user-check mr-1"></i>
                    {saving ? 'กำลังบันทึก...' : 'ยืนยันแต่งตั้ง School Admin'}
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

export default UserSchoolAdmin;
