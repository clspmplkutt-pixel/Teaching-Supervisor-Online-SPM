import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { thaiDateFull } from '../utils/thaiDate';
import { showToast } from '../utils/toast';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const EMPTY_FORM = {
  id: '',
  year: '',
  section: '1',
  date_start: '',
  date_end: '',
};

const EducationYear = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ open: false, mode: 'add', form: EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tbl_education_year')
        .select('*')
        .order('year', { ascending: false })
        .order('section', { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error('EducationYear load error:', err);
      Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถโหลดข้อมูลปีการศึกษาได้', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentActive = useMemo(
    () => rows.find((r) => String(r.active) === '1') || null,
    [rows]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        String(r.year || '').toLowerCase().includes(q) ||
        String(r.section || '').toLowerCase().includes(q) ||
        thaiDateFull(r.date_start, 2).toLowerCase().includes(q) ||
        thaiDateFull(r.date_end, 2).toLowerCase().includes(q)
    );
  }, [rows, search]);

  const handleSetCurrent = async (row) => {
    const result = await Swal.fire({
      title: 'ตั้งค่าปีการศึกษาปัจจุบัน?',
      text: `ตั้งค่าปีการศึกษา ${row.year} ภาคเรียนที่ ${row.section} เป็นภาคเรียนปัจจุบันของระบบหรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      confirmButtonText: 'ยืนยันตั้งเป็นปีปัจจุบัน',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const { error: err1 } = await supabase
        .from('tbl_education_year')
        .update({ active: '0' })
        .eq('active', '1');
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from('tbl_education_year')
        .update({ active: '1' })
        .eq('id', row.id);
      if (err2) throw err2;

      showToast(`ตั้งค่าปีการศึกษา ${row.year} ภาคเรียนที่ ${row.section} เป็นปีปัจจุบันแล้ว`);
      loadData();
    } catch (err) {
      console.error('handleSetCurrent error:', err);
      Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถตั้งค่าปีการศึกษาปัจจุบันได้', 'error');
    }
  };

  const openAddModal = () => {
    setModal({ open: true, mode: 'add', form: { ...EMPTY_FORM } });
  };

  const openEditModal = (row) => {
    setModal({
      open: true,
      mode: 'edit',
      form: {
        id: row.id,
        year: String(row.year ?? ''),
        section: String(row.section ?? '1'),
        date_start: row.date_start || '',
        date_end: row.date_end || '',
      },
    });
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (saving) return;

    const yearClean = String(modal.form.year || '').trim();
    const sectionClean = String(modal.form.section || '1').trim();
    if (!/^\d{4}$/.test(yearClean)) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาระบุปีการศึกษา พ.ศ. 4 หลัก (เช่น 2568)', 'warning');
      return;
    }
    if (modal.form.date_start && modal.form.date_end && modal.form.date_start > modal.form.date_end) {
      Swal.fire('วันที่ไม่ถูกต้อง', 'วันเปิดภาคเรียนต้องไม่หลังวันปิดภาคเรียน', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (modal.mode === 'add') {
        const { data: dup } = await supabase
          .from('tbl_education_year')
          .select('id')
          .eq('year', yearClean)
          .eq('section', sectionClean)
          .maybeSingle();

        if (dup) {
          Swal.fire('ข้อมูลซ้ำ', `ปีการศึกษา ${yearClean} ภาคเรียนที่ ${sectionClean} มีอยู่ในระบบแล้ว`, 'warning');
          setSaving(false);
          return;
        }

        const basePayload = {
          year: yearClean,
          section: sectionClean,
          date_start: modal.form.date_start || null,
          date_end: modal.form.date_end || null,
          active: rows.length === 0 ? '1' : '0',
        };

        let { error } = await supabase.from('tbl_education_year').insert([basePayload]);
        if (error && error.code === '23502') {
          const nextId = rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
          const retry = await supabase.from('tbl_education_year').insert([{ id: nextId, ...basePayload }]);
          error = retry.error;
        }
        if (error) throw error;
        showToast(`เพิ่มปีการศึกษา ${yearClean}/${sectionClean} สำเร็จ`);
      } else {
        const { error } = await supabase
          .from('tbl_education_year')
          .update({
            year: yearClean,
            section: sectionClean,
            date_start: modal.form.date_start || null,
            date_end: modal.form.date_end || null,
          })
          .eq('id', modal.form.id);
        if (error) throw error;
        showToast(`แก้ไขปีการศึกษา ${yearClean}/${sectionClean} สำเร็จ`);
      }

      setModal({ open: false, mode: 'add', form: EMPTY_FORM });
      loadData();
    } catch (err) {
      console.error(err);
      Swal.fire('ไม่สามารถบันทึกได้', err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลปีการศึกษา..." />;
  }

  return (
    <div>
      {/* Summary Strip */}
      <div className="row mb-3">
        <div className="col-md-6 mb-2 mb-md-0">
          <div className="card border-0 shadow-sm h-100 mb-0">
            <div className="card-body py-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small font-weight-bold">ปีการศึกษาและภาคเรียนปัจจุบัน</div>
                <div className="h4 font-weight-bold text-primary mb-0 mt-1">
                  {currentActive
                    ? `ปีการศึกษา ${currentActive.year} • ภาคเรียนที่ ${currentActive.section}`
                    : 'ยังไม่ได้กำหนด'}
                </div>
                {currentActive && (
                  <small className="text-muted">
                    {thaiDateFull(currentActive.date_start, 2)} – {thaiDateFull(currentActive.date_end, 2)}
                  </small>
                )}
              </div>
              <span
                className="rounded-circle d-inline-flex align-items-center justify-content-center bg-primary-subtle text-primary"
                style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}
              >
                <i className="fa-solid fa-calendar-check"></i>
              </span>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100 mb-0">
            <div className="card-body py-3 d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small font-weight-bold">รายการปีการศึกษาและภาคเรียนทั้งหมด</div>
                <div className="h4 font-weight-bold text-dark mb-0 mt-1">{rows.length} ภาคเรียน</div>
                <small className="text-muted">ใช้เป็นเกณฑ์ดึงข้อมูลนักเรียน DMC และรอบการส่งแผนการสอน</small>
              </div>
              <span
                className="rounded-circle d-inline-flex align-items-center justify-content-center bg-info-subtle text-info"
                style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}
              >
                <i className="fa-solid fa-school-circle-check"></i>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <span
              className="rounded d-inline-flex align-items-center justify-content-center bg-info-subtle text-info"
              style={{ width: '36px', height: '36px' }}
            >
              <i className="fa-solid fa-calendar-check"></i>
            </span>
            <div>
              <h3 className="card-title m-0 font-weight-bold text-dark">จัดการข้อมูลปีการศึกษา</h3>
              <small className="text-muted">บริหารจัดการปีการศึกษา ภาคเรียน วันเปิด–ปิดภาคเรียน และตั้งค่าภาคเรียนปัจจุบัน</small>
            </div>
          </div>

          <div className="d-flex align-items-center flex-wrap gap-2">
            <div className="input-group input-group-sm" style={{ width: '220px' }}>
              <div className="input-group-prepend">
                <span className="input-group-text bg-light border-right-0">
                  <i className="fa-solid fa-magnifying-glass text-muted"></i>
                </span>
              </div>
              <input
                type="text"
                className="form-control border-left-0"
                placeholder="ค้นหาปีการศึกษา..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <div className="input-group-append">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setSearch('')}>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              )}
            </div>

            <button type="button" onClick={openAddModal} className="btn btn-primary btn-sm font-weight-bold px-3">
              <i className="fa-solid fa-plus mr-1"></i> เพิ่มปีการศึกษา
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          {filteredRows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon="fa-calendar-check"
                message={search ? 'ไม่พบปีการศึกษาที่ค้นหา' : 'ยังไม่มีข้อมูลปีการศึกษา'}
                actionLabel={search ? 'ล้างคำค้นหา' : '+ เพิ่มปีการศึกษา'}
                onAction={search ? () => setSearch('') : openAddModal}
              />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th className="text-center" style={{ width: '80px' }}>ลำดับ</th>
                    <th className="text-center" style={{ width: '130px' }}>ปีการศึกษา</th>
                    <th className="text-center" style={{ width: '120px' }}>ภาคเรียนที่</th>
                    <th className="text-center">วันเปิดภาคเรียน / เริ่มปีการศึกษา</th>
                    <th className="text-center">วันปิดภาคเรียน / สิ้นสุดปีการศึกษา</th>
                    <th className="text-center" style={{ width: '170px' }}>สถานะปีปัจจุบัน</th>
                    <th className="text-center" style={{ width: '220px' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const active = String(row.active) === '1';
                    return (
                      <tr key={row.id} className={active ? 'bg-success-subtle' : ''}>
                        <td className="text-center text-muted">{row.id}</td>
                        <td className="text-center font-weight-bold">{row.year}</td>
                        <td className="text-center">
                          <span className="badge badge-info px-2 py-1">ภาคเรียนที่ {row.section}</span>
                        </td>
                        <td className="text-center">{thaiDateFull(row.date_start, 2) || '-'}</td>
                        <td className="text-center">{thaiDateFull(row.date_end, 2) || '-'}</td>
                        <td className="text-center">
                          {active ? (
                            <span className="badge badge-success px-3 py-1" style={{ borderRadius: '999px', fontSize: '0.82rem' }}>
                              <i className="fa-solid fa-circle-check mr-1"></i> ปีการศึกษาปัจจุบัน
                            </span>
                          ) : (
                            <span className="badge badge-light border text-muted px-2 py-1" style={{ borderRadius: '999px' }}>
                              ไม่ใช่ปีปัจจุบัน
                            </span>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="d-inline-flex align-items-center flex-wrap gap-1 justify-content-center">
                            {!active && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success py-1 px-2"
                                onClick={() => handleSetCurrent(row)}
                                title="ตั้งเป็นปีการศึกษาปัจจุบัน"
                              >
                                <i className="fa-solid fa-check mr-1"></i> ตั้งเป็นปีปัจจุบัน
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary py-1 px-2"
                              onClick={() => openEditModal(row)}
                              title="แก้ไขข้อมูลปีการศึกษา"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modal.open && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1060 }}
          onClick={(e) => e.target === e.currentTarget && setModal({ open: false, mode: 'add', form: EMPTY_FORM })}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px' }}>
              <form onSubmit={handleSaveModal}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title font-weight-bold">
                    <i className={`fa-solid ${modal.mode === 'add' ? 'fa-plus-circle text-primary' : 'fa-pen-to-square text-info'} mr-2`}></i>
                    {modal.mode === 'add'
                      ? 'เพิ่มข้อมูลปีการศึกษาใหม่'
                      : `แก้ไขปีการศึกษา ${modal.form.year} / ${modal.form.section}`}
                  </h5>
                  <button
                    type="button"
                    className="close"
                    onClick={() => setModal({ open: false, mode: 'add', form: EMPTY_FORM })}
                  >
                    <span>&times;</span>
                  </button>
                </div>

                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-7 form-group mb-3">
                      <label className="form-label">
                        ปีการศึกษา (พ.ศ.) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength="4"
                        className="form-control"
                        placeholder="เช่น 2568"
                        value={modal.form.year}
                        required
                        onChange={(e) =>
                          setModal((prev) => ({
                            ...prev,
                            form: { ...prev.form, year: e.target.value.replace(/\D/g, '') },
                          }))
                        }
                      />
                    </div>
                    <div className="col-md-5 form-group mb-3">
                      <label className="form-label">
                        ภาคเรียนที่ <span className="text-danger">*</span>
                      </label>
                      <select
                        className="custom-select"
                        value={modal.form.section}
                        onChange={(e) =>
                          setModal((prev) => ({
                            ...prev,
                            form: { ...prev.form, section: e.target.value },
                          }))
                        }
                      >
                        <option value="1">ภาคเรียนที่ 1</option>
                        <option value="2">ภาคเรียนที่ 2</option>
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 form-group mb-3">
                      <label className="form-label">
                        วันเปิดภาคเรียน (ค.ศ.) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={modal.form.date_start}
                        required
                        onChange={(e) =>
                          setModal((prev) => ({
                            ...prev,
                            form: { ...prev.form, date_start: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="col-md-6 form-group mb-0">
                      <label className="form-label">
                        วันปิดภาคเรียน (ค.ศ.) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={modal.form.date_end}
                        required
                        onChange={(e) =>
                          setModal((prev) => ({
                            ...prev,
                            form: { ...prev.form, date_end: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light border-top-0">
                  <button
                    type="button"
                    className="btn btn-light border"
                    onClick={() => setModal({ open: false, mode: 'add', form: EMPTY_FORM })}
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" className="btn btn-primary font-weight-bold px-4" disabled={saving}>
                    {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducationYear;
