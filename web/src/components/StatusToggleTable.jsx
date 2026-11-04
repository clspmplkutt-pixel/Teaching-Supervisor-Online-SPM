import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';

/**
 * StatusToggleTable v3.0 - Interactive Master Data Manager
 * Automatically upgrades all Master Lookup pages (Prefix, Gender, AcademicStanding, PersonType,
 * PersonPositionType, EducationLevel, TeachSubject, SubjectType, GradeLevel, BudgetYear, EducationYear, etc.)
 * with:
 * - Instant client-side search filter
 * - Active / Inactive summary pills
 * - Optimistic toggle switches
 * - Optional Inline Add & Edit Modal (auto-enabled or customizable via props!)
 */
const StatusToggleTable = ({
  title,
  table,
  columns = [],
  statusField,
  idField = 'id',
  order = [],
  icon = 'fa-sliders',
  allowCreate = true,
  allowEdit = true,
  formFields = null, // optional custom [{ key, label, type, required, readOnlyOnEdit }]
}) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | '1' | '0'
  const [modalState, setModalState] = useState({ open: false, mode: 'add', record: {} });
  const [saving, setSaving] = useState(false);

  // Auto-derive editable fields from columns if not explicitly provided
  const resolvedFields = useMemo(() => {
    if (Array.isArray(formFields) && formFields.length > 0) return formFields;
    return columns
      .filter((c) => c.key && !c.render)
      .map((c) => ({
        key: c.key,
        label: c.label,
        required: true,
        readOnlyOnEdit: c.key === idField,
      }));
  }, [columns, formFields, idField]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from(table).select('*');
      order.forEach((o) => {
        query = query.order(o.field, { ascending: o.ascending });
      });
      const { data, error } = await query;
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error('StatusToggleTable load error:', err);
    } finally {
      setLoading(false);
    }
  }, [table, order]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleStatus = async (row) => {
    if (!statusField) return;
    const current = String(row[statusField]) === '1';
    const nextValue = current ? '0' : '1';

    // Optimistic UI update
    setRows((prev) =>
      prev.map((r) => (r[idField] === row[idField] ? { ...r, [statusField]: nextValue } : r))
    );

    try {
      const { error } = await supabase
        .from(table)
        .update({ [statusField]: nextValue })
        .eq(idField, row[idField]);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      // Rollback on failure
      setRows((prev) =>
        prev.map((r) => (r[idField] === row[idField] ? { ...r, [statusField]: current ? '1' : '0' } : r))
      );
      Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถเปลี่ยนสถานะได้', 'error');
    }
  };

  const openAddModal = () => {
    const empty = {};
    resolvedFields.forEach((f) => {
      empty[f.key] = f.defaultValue ?? '';
    });
    if (statusField) empty[statusField] = '1';
    setModalState({ open: true, mode: 'add', record: empty });
  };

  const openEditModal = (row) => {
    const copy = {};
    resolvedFields.forEach((f) => {
      copy[f.key] = row[f.key] ?? '';
    });
    copy[idField] = row[idField];
    if (statusField) copy[statusField] = String(row[statusField] ?? '1');
    setModalState({ open: true, mode: 'edit', record: copy });
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {};
      resolvedFields.forEach((f) => {
        if (modalState.mode === 'add' && f.key === 'id' && !modalState.record[f.key]) {
          return; // allow DB serial auto-increment if left blank
        }
        payload[f.key] = String(modalState.record[f.key] ?? '').trim();
      });
      if (statusField && modalState.record[statusField] !== undefined) {
        payload[statusField] = String(modalState.record[statusField]);
      }

      if (modalState.mode === 'add') {
        const { error } = await supabase.from(table).insert([payload]);
        if (error) throw error;
        Swal.fire({ icon: 'success', title: 'เพิ่มรายการสำเร็จ', timer: 1400, showConfirmButton: false });
      } else {
        const updatePayload = { ...payload };
        delete updatePayload[idField];
        const { error } = await supabase
          .from(table)
          .update(updatePayload)
          .eq(idField, modalState.record[idField]);
        if (error) throw error;
        Swal.fire({ icon: 'success', title: 'บันทึกการแก้ไขสำเร็จ', timer: 1400, showConfirmButton: false });
      }

      setModalState({ open: false, mode: 'add', record: {} });
      loadData();
    } catch (err) {
      console.error(err);
      Swal.fire('ไม่สามารถบันทึกได้', err.message || 'กรุณาตรวจสอบรหัสซ้ำหรือสิทธิ์การแก้ไขข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusField && statusFilter !== 'ALL') {
        if (String(row[statusField]) !== statusFilter) return false;
      }
      if (!q) return true;
      return columns.some((col) =>
        String(row[col.key] ?? '')
          .toLowerCase()
          .includes(q)
      );
    });
  }, [columns, rows, search, statusField, statusFilter]);

  const activeCount = useMemo(
    () => (statusField ? rows.filter((r) => String(r[statusField]) === '1').length : rows.length),
    [rows, statusField]
  );

  if (loading) {
    return <LoadingSpinner message={`กำลังโหลดข้อมูล${title || ''}...`} />;
  }

  return (
    <div className="card shadow-sm border-0">
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <span
            className="rounded d-inline-flex align-items-center justify-content-center bg-primary-subtle text-primary"
            style={{ width: '36px', height: '36px' }}
          >
            <i className={`fa-solid ${icon}`}></i>
          </span>
          <div>
            <h3 className="card-title m-0 font-weight-bold text-dark">{title}</h3>
            <small className="text-muted">
              ทั้งหมด {rows.length} รายการ
              {statusField && ` • เปิดใช้งาน ${activeCount} รายการ`}
            </small>
          </div>
        </div>

        <div className="d-flex align-items-center flex-wrap gap-2">
          {statusField && (
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
          )}

          <div className="input-group input-group-sm" style={{ width: '220px' }}>
            <div className="input-group-prepend">
              <span className="input-group-text bg-light border-right-0">
                <i className="fa-solid fa-magnifying-glass text-muted"></i>
              </span>
            </div>
            <input
              type="text"
              className="form-control border-left-0"
              placeholder="ค้นหารายการ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <div className="input-group-append">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setSearch('')}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            )}
          </div>

          {allowCreate && resolvedFields.length > 0 && (
            <button
              type="button"
              onClick={openAddModal}
              className="btn btn-primary btn-sm font-weight-bold px-3"
            >
              <i className="fa-solid fa-plus mr-1"></i> เพิ่มรายการ
            </button>
          )}
        </div>
      </div>

      <div className="card-body p-0">
        {filteredRows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              message={search ? 'ไม่พบรายการที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลในหมวดหมู่นี้'}
              actionLabel={search ? 'ล้างตัวกรอง' : allowCreate ? '+ เพิ่มรายการแรก' : ''}
              onAction={search ? () => setSearch('') : allowCreate ? openAddModal : null}
            />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className={col.align ? `text-${col.align}` : undefined}>
                      {col.label}
                    </th>
                  ))}
                  {statusField && <th className="text-center" style={{ width: '130px' }}>สถานะใช้งาน</th>}
                  {allowEdit && resolvedFields.length > 0 && (
                    <th className="text-center" style={{ width: '100px' }}>จัดการ</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => {
                  const active = statusField ? String(row[statusField]) === '1' : true;
                  return (
                    <tr key={row[idField] ?? idx}>
                      {columns.map((col) => (
                        <td key={col.key} className={col.align ? `text-${col.align}` : undefined}>
                          {col.render ? col.render(row) : row[col.key]}
                        </td>
                      ))}
                      {statusField && (
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
                      )}
                      {allowEdit && resolvedFields.length > 0 && (
                        <td className="text-center">
                          <button
                            type="button"
                            onClick={() => openEditModal(row)}
                            className="btn btn-sm btn-outline-primary py-1 px-2"
                            title="แก้ไขข้อมูล"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inline Add / Edit Modal */}
      {modalState.open && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1060 }}
          onClick={(e) => e.target === e.currentTarget && setModalState({ open: false, mode: 'add', record: {} })}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px' }}>
              <form onSubmit={handleSaveModal}>
                <div className="modal-header border-bottom">
                  <h5 className="modal-title font-weight-bold">
                    <i className={`fa-solid ${modalState.mode === 'add' ? 'fa-plus-circle text-primary' : 'fa-pen-to-square text-info'} mr-2`}></i>
                    {modalState.mode === 'add' ? `เพิ่มรายการใหม่ (${title})` : `แก้ไขข้อมูล (${title})`}
                  </h5>
                  <button
                    type="button"
                    className="close"
                    onClick={() => setModalState({ open: false, mode: 'add', record: {} })}
                  >
                    <span>&times;</span>
                  </button>
                </div>

                <div className="modal-body">
                  {resolvedFields.map((field) => {
                    const isReadOnly = modalState.mode === 'edit' && field.readOnlyOnEdit;
                    return (
                      <div className="form-group mb-3" key={field.key}>
                        <label className="form-label">
                          {field.label} {field.required && !isReadOnly && <span className="text-danger">*</span>}
                        </label>
                        <input
                          type={field.type || 'text'}
                          className="form-control"
                          value={modalState.record[field.key] ?? ''}
                          readOnly={isReadOnly}
                          required={field.required && !(modalState.mode === 'add' && field.key === 'id')}
                          placeholder={
                            modalState.mode === 'add' && field.key === 'id'
                              ? 'เว้นว่างเพื่อสร้างรหัสอัตโนมัติ (ถ้ามี)'
                              : `ระบุ${field.label}`
                          }
                          onChange={(e) =>
                            setModalState((prev) => ({
                              ...prev,
                              record: { ...prev.record, [field.key]: e.target.value },
                            }))
                          }
                        />
                      </div>
                    );
                  })}

                  {statusField && (
                    <div className="form-group mb-0">
                      <label className="form-label">สถานะการใช้งาน</label>
                      <select
                        className="custom-select"
                        value={String(modalState.record[statusField] ?? '1')}
                        onChange={(e) =>
                          setModalState((prev) => ({
                            ...prev,
                            record: { ...prev.record, [statusField]: e.target.value },
                          }))
                        }
                      >
                        <option value="1">เปิดใช้งาน</option>
                        <option value="0">ปิดใช้งาน</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="modal-footer bg-light border-top-0">
                  <button
                    type="button"
                    className="btn btn-light border"
                    onClick={() => setModalState({ open: false, mode: 'add', record: {} })}
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

export default StatusToggleTable;
