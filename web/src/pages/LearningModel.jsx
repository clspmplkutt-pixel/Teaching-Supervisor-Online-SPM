import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { showToast } from '../utils/toast';

const EMPTY_FORM = {
  id: '',
  model_id: '',
  model_name: '',
  model_status: '1',
};

const LearningModel = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | '1' | '0'
  const [modal, setModal] = useState({ open: false, mode: 'add', form: EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tbl_learningModel')
        .select('*')
        .order('model_status', { ascending: false })
        .order('model_id', { ascending: true })
        .order('id', { ascending: true });
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error('LearningModel load error:', err);
      Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถโหลดรูปแบบการจัดการเรียนรู้ได้', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeCount = useMemo(
    () => rows.filter((r) => String(r.model_status) === '1').length,
    [rows]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'ALL' && String(r.model_status) !== statusFilter) return false;
      if (!q) return true;
      return (
        String(r.model_id ?? '').toLowerCase().includes(q) ||
        String(r.model_name ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const toggleStatus = async (row) => {
    const current = String(row.model_status) === '1';
    const nextStatus = current ? '0' : '1';

    setRows((prev) =>
      prev.map((item) => (item.id === row.id ? { ...item, model_status: nextStatus } : item))
    );

    try {
      const { error } = await supabase
        .from('tbl_learningModel')
        .update({ model_status: nextStatus })
        .eq('id', row.id);
      if (error) throw error;
      showToast(nextStatus === '1' ? 'เปิดใช้งานรูปแบบการสอนแล้ว' : 'ปิดใช้งานรูปแบบการสอนแล้ว');
    } catch (err) {
      console.error(err);
      setRows((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, model_status: current ? '1' : '0' } : item))
      );
      Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถเปลี่ยนสถานะการใช้งานได้', 'error');
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
        model_id: String(row.model_id ?? ''),
        model_name: row.model_name || '',
        model_status: String(row.model_status ?? '1'),
      },
    });
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (saving) return;

    const modelIdClean = String(modal.form.model_id || '').trim();
    const modelNameClean = String(modal.form.model_name || '').trim();

    if (!modelIdClean || !modelNameClean) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาระบุรหัสรูปแบบและชื่อรูปแบบการจัดการเรียนรู้', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (modal.mode === 'add') {
        const { data: exists } = await supabase
          .from('tbl_learningModel')
          .select('model_id')
          .eq('model_id', modelIdClean)
          .maybeSingle();

        if (exists) {
          Swal.fire(
            'รหัสรูปแบบซ้ำ',
            `รหัสรูปแบบการจัดการเรียนรู้ "${modelIdClean}" มีอยู่ในระบบแล้ว กรุณาระบุรหัสอื่น`,
            'warning'
          );
          setSaving(false);
          return;
        }

        const payload = {
          model_id: modelIdClean,
          model_name: modelNameClean,
          model_status: modal.form.model_status || '1',
        };
        let { error } = await supabase.from('tbl_learningModel').insert([payload]);
        if (error && error.code === '23502') {
          const nextId = rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;
          const retry = await supabase.from('tbl_learningModel').insert([{ id: nextId, ...payload }]);
          error = retry.error;
        }
        if (error) throw error;
        showToast('เพิ่มรูปแบบการจัดการเรียนรู้สำเร็จ');
      } else {
        const { error } = await supabase
          .from('tbl_learningModel')
          .update({
            model_id: modelIdClean,
            model_name: modelNameClean,
            model_status: modal.form.model_status || '1',
          })
          .eq('id', modal.form.id);
        if (error) throw error;
        showToast('บันทึกการแก้ไขรูปแบบการจัดการเรียนรู้สำเร็จ');
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
    return <LoadingSpinner message="กำลังโหลดรูปแบบการจัดการเรียนรู้..." />;
  }

  return (
    <div className="card shadow-sm border-0">
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <span
            className="rounded d-inline-flex align-items-center justify-content-center bg-warning-subtle text-warning-emphasis"
            style={{ width: '36px', height: '36px' }}
          >
            <i className="fa-solid fa-lightbulb"></i>
          </span>
          <div>
            <h3 className="card-title m-0 font-weight-bold text-dark">จัดการรูปแบบการจัดการเรียนรู้</h3>
            <small className="text-muted">
              ทั้งหมด {rows.length} รูปแบบ • เปิดใช้งาน {activeCount} รูปแบบ
            </small>
          </div>
        </div>

        <div className="d-flex align-items-center flex-wrap gap-2">
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setStatusFilter('ALL')}
            >
              ทั้งหมด ({rows.length})
            </button>
            <button
              type="button"
              className={`btn ${statusFilter === '1' ? 'btn-success' : 'btn-outline-secondary'}`}
              onClick={() => setStatusFilter('1')}
            >
              เปิดใช้ ({activeCount})
            </button>
            <button
              type="button"
              className={`btn ${statusFilter === '0' ? 'btn-secondary' : 'btn-outline-secondary'}`}
              onClick={() => setStatusFilter('0')}
            >
              ปิดใช้ ({rows.length - activeCount})
            </button>
          </div>

          <div className="input-group input-group-sm" style={{ width: '230px' }}>
            <div className="input-group-prepend">
              <span className="input-group-text bg-light border-right-0">
                <i className="fa-solid fa-magnifying-glass text-muted"></i>
              </span>
            </div>
            <input
              type="text"
              className="form-control border-left-0"
              placeholder="ค้นหารหัส / ชื่อรูปแบบการสอน..."
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
            <i className="fa-solid fa-plus mr-1"></i> เพิ่มรูปแบบการสอน
          </button>
        </div>
      </div>

      <div className="card-body p-0">
        {filteredRows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon="fa-lightbulb"
              message={search || statusFilter !== 'ALL' ? 'ไม่พบรูปแบบการจัดการเรียนรู้ที่ค้นหา' : 'ยังไม่มีรูปแบบการจัดการเรียนรู้'}
              actionLabel={search || statusFilter !== 'ALL' ? 'ล้างตัวกรอง' : '+ เพิ่มรูปแบบการสอน'}
              onAction={
                search || statusFilter !== 'ALL'
                  ? () => {
                      setSearch('');
                      setStatusFilter('ALL');
                    }
                  : openAddModal
              }
            />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th className="text-center" style={{ width: '90px' }}>ลำดับ</th>
                  <th className="text-center" style={{ width: '140px' }}>รหัสรูปแบบ</th>
                  <th>รูปแบบการจัดการเรียนรู้ (Active Learning / Model)</th>
                  <th className="text-center" style={{ width: '140px' }}>สถานะใช้งาน</th>
                  <th className="text-center" style={{ width: '110px' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const active = String(row.model_status) === '1';
                  return (
                    <tr key={row.id ?? row.model_id}>
                      <td className="text-center text-muted">{row.id}</td>
                      <td className="text-center font-weight-bold">
                        <code>{row.model_id}</code>
                      </td>
                      <td className="font-weight-semibold">{row.model_name}</td>
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => toggleStatus(row)}
                          className={`btn btn-xs px-2 py-1 font-weight-bold ${
                            active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-muted'
                          }`}
                          style={{ borderRadius: '999px', border: 'none', minWidth: '88px' }}
                          title="คลิกเพื่อสลับสถานะเปิด/ปิดใช้งาน"
                        >
                          <i className={`fa-solid ${active ? 'fa-toggle-on' : 'fa-toggle-off'} mr-1`}></i>
                          {active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </button>
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          className="btn btn-sm btn-outline-primary py-1 px-2"
                          title="แก้ไขรูปแบบการสอน"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
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

      {/* Inline Add / Edit Modal */}
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
                    {modal.mode === 'add' ? 'เพิ่มรูปแบบการจัดการเรียนรู้' : 'แก้ไขรูปแบบการจัดการเรียนรู้'}
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
                  <div className="form-group mb-3">
                    <label className="form-label">
                      รหัสรูปแบบการจัดการเรียนรู้ <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="เช่น 101"
                      value={modal.form.model_id}
                      onChange={(e) =>
                        setModal((prev) => ({
                          ...prev,
                          form: { ...prev.form, model_id: e.target.value },
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="form-group mb-3">
                    <label className="form-label">
                      ชื่อรูปแบบการจัดการเรียนรู้ <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="เช่น Problem-Based Learning (PBL), GPAS 5 Steps"
                      value={modal.form.model_name}
                      onChange={(e) =>
                        setModal((prev) => ({
                          ...prev,
                          form: { ...prev.form, model_name: e.target.value },
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label">สถานะการใช้งาน</label>
                    <select
                      className="custom-select"
                      value={modal.form.model_status}
                      onChange={(e) =>
                        setModal((prev) => ({
                          ...prev,
                          form: { ...prev.form, model_status: e.target.value },
                        }))
                      }
                    >
                      <option value="1">เปิดใช้งาน</option>
                      <option value="0">ปิดใช้งาน</option>
                    </select>
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

export default LearningModel;
