import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useUserLookups from '../hooks/useUserLookups';
import UserDirectoryTable from '../components/UserDirectoryTable';
import SearchableSelect from '../components/SearchableSelect';
import { showToast } from '../utils/toast';

const CHAIRMAN_ORDER = [
  { field: 'school', ascending: true },
  { field: 'position_id', ascending: false },
  { field: 'academic_id', ascending: true },
];

const UserChairman = () => {
  const { lookups } = useUserLookups();
  const [refreshKey, setRefreshKey] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [directors, setDirectors] = useState([]);
  const [loadingDirectors, setLoadingDirectors] = useState(false);
  const [selectedDirectorId, setSelectedDirectorId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!showModal) return;
    let mounted = true;
    const fetchDirectors = async () => {
      setLoadingDirectors(true);
      try {
        const { data, error } = await supabase
          .from('tbl_Users')
          .select('id, people_id, prefix, name, lastname, school, position_id, academic_id, chairman')
          .eq('level', 'directorschool')
          .order('school', { ascending: true });
        if (error) throw error;
        if (mounted) {
          setDirectors(data || []);
          setSelectedDirectorId('');
        }
      } catch (err) {
        console.error('Load directors error:', err);
      } finally {
        if (mounted) setLoadingDirectors(false);
      }
    };
    fetchDirectors();
    return () => {
      mounted = false;
    };
  }, [showModal]);

  const applyBaseFilter = useCallback((query) => {
    return query.eq('chairman', '1');
  }, []);

  const handleRevoke = async (row, reload) => {
    const fullName = `${lookups.prefix[row.prefix] || ''}${row.name || ''} ${row.lastname || ''}`.trim();
    const khetName = lookups.khet[lookups.schoolKhet[row.school] || row.khet_code] || '-';

    const confirm = await Swal.fire({
      title: 'ถอดถอนตำแหน่งประธานสหวิทยาเขต?',
      html: `ต้องการยกเลิกสถานะประธานสหวิทยาเขต (${khetName}) ของ <strong>${fullName}</strong> ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      confirmButtonText: 'ยืนยันถอดถอน',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirm.isConfirmed) return;

    try {
      const { error } = await supabase
        .from('tbl_Users')
        .update({ chairman: '0' })
        .eq('id', row.id);
      if (error) throw error;
      showToast(`ถอดถอนสถานะประธานสหวิทยาเขตของ ${fullName} เรียบร้อยแล้ว`, 'success');
      setRefreshKey((k) => k + 1);
      reload?.();
    } catch (err) {
      console.error(err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถถอดถอนสิทธิ์ได้', 'error');
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDirectorId || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tbl_Users')
        .update({ chairman: '1' })
        .eq('id', Number(selectedDirectorId));
      if (error) throw error;

      const chosen = directors.find((d) => String(d.id) === String(selectedDirectorId));
      const fullName = chosen
        ? `${lookups.prefix[chosen.prefix] || ''}${chosen.name} ${chosen.lastname}`.trim()
        : 'ผู้บริหารที่เลือก';
      showToast(`แต่งตั้ง ${fullName} เป็นประธานสหวิทยาเขตเรียบร้อยแล้ว`, 'success');
      setShowModal(false);
      setSelectedDirectorId('');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถแต่งตั้งประธานสหวิทยาเขตได้', 'error');
    } finally {
      setSaving(false);
    }
  };

  const directorOptions = useMemo(
    () =>
      directors
        .filter((d) => String(d.chairman) !== '1')
        .map((d) => {
          const schoolName = lookups.school[d.school] || d.school || '-';
          const khetCode = lookups.schoolKhet[d.school];
          const khetName = khetCode ? lookups.khet[khetCode] : '';
          return {
            value: String(d.id),
            label: `${lookups.prefix[d.prefix] || ''}${d.name} ${d.lastname}`,
            subLabel: `${schoolName}${khetName ? ` • สหวิทยาเขต: ${khetName}` : ''}`,
          };
        }),
    [directors, lookups]
  );

  return (
    <>
      <UserDirectoryTable
        title="ทำเนียบประธานสหวิทยาเขต"
        subtitle="ผู้บริหารสถานศึกษาที่ทำหน้าที่ประธานสหวิทยาเขตในการกำกับติดตามการนิเทศ"
        icon="fa-user-shield"
        accentColor="warning"
        applyBaseFilter={applyBaseFilter}
        editVariant="directorschool"
        showSchoolFilter={true}
        showAcademicFilter={true}
        orderBy={CHAIRMAN_ORDER}
        refreshKey={refreshKey}
        allowDelete={false}
        columns={{
          thaiId: true,
          school: true,
          position: true,
          academic: true,
          schoolKhet: true,
          status: false,
        }}
        headerActions={
          <button
            type="button"
            className="btn btn-primary btn-sm px-3"
            onClick={() => setShowModal(true)}
          >
            <i className="fa-solid fa-user-plus mr-1"></i>
            แต่งตั้งประธานสหวิทยาเขต
          </button>
        }
        renderCustomActions={(row, { reload }) => (
          <button
            type="button"
            className="btn btn-sm btn-outline-warning"
            onClick={() => handleRevoke(row, reload)}
            title="ถอดถอนตำแหน่งประธานสหวิทยาเขต"
          >
            <i className="fa-solid fa-user-xmark"></i>
          </button>
        )}
        emptyTitle="ยังไม่มีรายชื่อประธานสหวิทยาเขต"
        emptyMessage="สามารถกดปุ่ม แต่งตั้งประธานสหวิทยาเขต เพื่อกำหนดผู้บริหารสถานศึกษาประจำสหวิทยาเขตได้ทันที"
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
              <div className="modal-header bg-warning text-dark py-3" style={{ borderTopLeftRadius: '14px', borderTopRightRadius: '14px' }}>
                <h5 className="modal-title font-weight-bold m-0">
                  <i className="fa-solid fa-user-shield mr-2"></i>
                  แต่งตั้งประธานสหวิทยาเขต
                </h5>
                <button
                  type="button"
                  className="close"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  <span>&times;</span>
                </button>
              </div>

              <form onSubmit={handleAssignSubmit}>
                <div className="modal-body p-4">
                  <div className="alert bg-warning-subtle text-warning-emphasis border-0 small mb-3">
                    เลือกผู้อำนวยการสถานศึกษาเพื่อทำหน้าที่ประธานสหวิทยาเขต (ค้นหาได้จากชื่อผู้บริหาร โรงเรียน หรือชื่อสหวิทยาเขต)
                  </div>

                  <div className="form-group mb-2">
                    <label className="form-label">เลือกผู้บริหารสถานศึกษา <span className="text-danger">*</span></label>
                    {loadingDirectors ? (
                      <div className="form-control bg-light text-muted small">
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i>กำลังโหลดรายชื่อผู้บริหาร...
                      </div>
                    ) : (
                      <SearchableSelect
                        options={directorOptions}
                        value={selectedDirectorId}
                        onChange={(val) => setSelectedDirectorId(val)}
                        placeholder={`-- เลือกผู้อำนวยการสถานศึกษา (${directorOptions.length} ท่าน) --`}
                        searchPlaceholder="พิมพ์ชื่อผู้บริหาร โรงเรียน หรือสหวิทยาเขต..."
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
                    disabled={saving || !selectedDirectorId}
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

export default UserChairman;
