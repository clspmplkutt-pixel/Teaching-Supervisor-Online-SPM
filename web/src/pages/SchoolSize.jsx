import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { showToast } from '../utils/toast';

const EMPTY_FORM = {
  schoolsize_id: '',
  schoolsize_name: '',
  schoolsize_details: '',
  schoolsize_min: '',
  schoolsize_max: '',
};

const SchoolSize = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [schoolCounts, setSchoolCounts] = useState({});
  const [editModal, setEditModal] = useState({ open: false, form: EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const numberFormatter = useMemo(() => new Intl.NumberFormat('th-TH'), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sizeRes, schoolRes] = await Promise.all([
        supabase.from('tbl_schoolsize').select('*').order('schoolsize_id', { ascending: true }),
        supabase.from('tbl_school').select('school_id, school_size, school_flag'),
      ]);
      if (sizeRes.error) throw sizeRes.error;
      if (schoolRes.error) throw schoolRes.error;

      const counts = {};
      (schoolRes.data || []).forEach((s) => {
        if (!s.school_size || String(s.school_flag) !== '1') return;
        counts[s.school_size] = (counts[s.school_size] || 0) + 1;
      });

      setRows(sizeRes.data || []);
      setSchoolCounts(counts);
    } catch (err) {
      console.error('SchoolSize load error:', err);
      Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถโหลดเกณฑ์ขนาดโรงเรียนได้', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openEditModal = (row) => {
    setEditModal({
      open: true,
      form: {
        schoolsize_id: row.schoolsize_id ?? '',
        schoolsize_name: row.schoolsize_name ?? '',
        schoolsize_details: row.schoolsize_details ?? '',
        schoolsize_min: row.schoolsize_min ?? '',
        schoolsize_max: row.schoolsize_max ?? '',
      },
    });
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (saving) return;

    const min = Number(editModal.form.schoolsize_min);
    const max = Number(editModal.form.schoolsize_max);
    if (!Number.isNaN(min) && !Number.isNaN(max) && max !== 0 && min > max) {
      Swal.fire(
        'ข้อมูลไม่ถูกต้อง',
        'จำนวนนักเรียนน้อยสุด ต้องไม่มากกว่าจำนวนนักเรียนมากสุด (ยกเว้นใส่ 0 สำหรับขนาดใหญ่พิเศษ)',
        'warning'
      );
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tbl_schoolsize')
        .update({
          schoolsize_details: editModal.form.schoolsize_details,
          schoolsize_min: editModal.form.schoolsize_min,
          schoolsize_max: editModal.form.schoolsize_max,
        })
        .eq('schoolsize_id', editModal.form.schoolsize_id);

      if (error) throw error;
      showToast(`บันทึกเกณฑ์ ${editModal.form.schoolsize_name} สำเร็จ`);
      setEditModal({ open: false, form: EMPTY_FORM });
      loadData();
    } catch (err) {
      console.error(err);
      Swal.fire('ไม่สามารถบันทึกได้', err.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="กำลังโหลดเกณฑ์ขนาดโรงเรียน..." />;
  }

  return (
    <div>
      {/* Size Tier Cards */}
      {rows.length > 0 && (
        <div className="row mb-3">
          {rows.map((row) => {
            const count = schoolCounts[row.schoolsize_id] || 0;
            return (
              <div className="col-sm-6 col-lg-3 mb-2 mb-lg-0" key={row.schoolsize_id}>
                <div className="card border-0 shadow-sm h-100 mb-0">
                  <div className="card-body py-3 d-flex justify-content-between align-items-center">
                    <div>
                      <div className="text-muted small font-weight-bold">{row.schoolsize_name}</div>
                      <div className="h4 font-weight-bold text-primary mb-0 mt-1">{count} แห่ง</div>
                      <small className="text-muted">{row.schoolsize_details || '-'}</small>
                    </div>
                    <span
                      className="rounded-circle d-inline-flex align-items-center justify-content-center bg-info-subtle text-info"
                      style={{ width: '42px', height: '42px' }}
                    >
                      <i className="fa-solid fa-chart-simple"></i>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <span
              className="rounded d-inline-flex align-items-center justify-content-center bg-info-subtle text-info"
              style={{ width: '36px', height: '36px' }}
            >
              <i className="fa-solid fa-chart-simple"></i>
            </span>
            <div>
              <h3 className="card-title m-0 font-weight-bold text-dark">เกณฑ์ขนาดโรงเรียน</h3>
              <small className="text-muted">กำหนดช่วงจำนวนนักเรียนสำหรับจำแนกขนาดสถานศึกษาในสังกัด</small>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {rows.length === 0 ? (
            <div className="p-4">
              <EmptyState icon="fa-chart-simple" message="ยังไม่มีข้อมูลเกณฑ์ขนาดโรงเรียน" />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th className="text-center" style={{ width: '80px' }}>รหัส</th>
                    <th>ชื่อขนาดโรงเรียน</th>
                    <th>คำอธิบายเกณฑ์</th>
                    <th className="text-right">นักเรียนน้อยสุด</th>
                    <th className="text-right">นักเรียนมากสุด</th>
                    <th className="text-center" style={{ width: '160px' }}>จำนวนโรงเรียน</th>
                    <th className="text-center" style={{ width: '130px' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const count = schoolCounts[row.schoolsize_id] || 0;
                    const maxDisplay =
                      Number(row.schoolsize_max) === 0
                        ? 'ไม่จำกัด (ขึ้นไป)'
                        : numberFormatter.format(Number(row.schoolsize_max) || 0);
                    return (
                      <tr key={row.schoolsize_id}>
                        <td className="text-center font-weight-bold">{row.schoolsize_id}</td>
                        <td className="font-weight-semibold">{row.schoolsize_name}</td>
                        <td>{row.schoolsize_details}</td>
                        <td className="text-right">
                          {numberFormatter.format(Number(row.schoolsize_min) || 0)} คน
                        </td>
                        <td className="text-right">
                          {maxDisplay} {Number(row.schoolsize_max) !== 0 && 'คน'}
                        </td>
                        <td className="text-center">
                          <Link
                            to={`/school?school_size=${encodeURIComponent(row.schoolsize_id)}`}
                            className="badge bg-primary-subtle text-primary px-3 py-1 text-decoration-none"
                            style={{ borderRadius: '999px', fontSize: '0.84rem' }}
                          >
                            <i className="fa-solid fa-school mr-1"></i> {count} แห่ง
                          </Link>
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            onClick={() => openEditModal(row)}
                            className="btn btn-sm btn-outline-primary py-1 px-2"
                          >
                            <i className="fa-solid fa-pen-to-square mr-1"></i> แก้ไขเกณฑ์
                          </button>
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

      {/* Inline Edit Modal */}
      {editModal.open && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1060 }}
          onClick={(e) => e.target === e.currentTarget && setEditModal({ open: false, form: EMPTY_FORM })}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px' }}>
              <form onSubmit={handleSaveModal}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title font-weight-bold">
                    <i className="fa-solid fa-pen-to-square text-info mr-2"></i>
                    แก้ไขเกณฑ์ขนาดโรงเรียน ({editModal.form.schoolsize_name})
                  </h5>
                  <button
                    type="button"
                    className="close"
                    onClick={() => setEditModal({ open: false, form: EMPTY_FORM })}
                  >
                    <span>&times;</span>
                  </button>
                </div>

                <div className="modal-body">
                  <div className="row">
                    <div className="col-4 form-group mb-3">
                      <label className="form-label">รหัสขนาด</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={editModal.form.schoolsize_id}
                        readOnly
                      />
                    </div>
                    <div className="col-8 form-group mb-3">
                      <label className="form-label">ชื่อขนาดโรงเรียน</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={editModal.form.schoolsize_name}
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="form-group mb-3">
                    <label className="form-label">คำอธิบายเกณฑ์</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editModal.form.schoolsize_details}
                      onChange={(e) =>
                        setEditModal((prev) => ({
                          ...prev,
                          form: { ...prev.form, schoolsize_details: e.target.value },
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6 form-group mb-3">
                      <label className="form-label">จำนวนนักเรียนน้อยสุด (คน)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={editModal.form.schoolsize_min}
                        onChange={(e) =>
                          setEditModal((prev) => ({
                            ...prev,
                            form: { ...prev.form, schoolsize_min: e.target.value },
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="col-md-6 form-group mb-0">
                      <label className="form-label">จำนวนนักเรียนมากสุด (คน)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={editModal.form.schoolsize_max}
                        onChange={(e) =>
                          setEditModal((prev) => ({
                            ...prev,
                            form: { ...prev.form, schoolsize_max: e.target.value },
                          }))
                        }
                        required
                      />
                    </div>
                  </div>
                  <small className="text-muted d-block mt-1">
                    หมายเหตุ: ระบุ <code>0</code> ในช่องมากสุด หากหมายถึง &ldquo;ตั้งแต่จำนวนน้อยสุดขึ้นไป&rdquo; (ขนาดใหญ่พิเศษ)
                  </small>
                </div>

                <div className="modal-footer bg-light border-top-0">
                  <button
                    type="button"
                    className="btn btn-light border"
                    onClick={() => setEditModal({ open: false, form: EMPTY_FORM })}
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" className="btn btn-primary font-weight-bold px-4" disabled={saving}>
                    {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
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

export default SchoolSize;
