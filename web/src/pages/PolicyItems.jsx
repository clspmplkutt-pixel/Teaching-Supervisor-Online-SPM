import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';

const PolicyItems = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const academicId = searchParams.get('academic_id') || '';
  const policySide = searchParams.get('policy_side') || '';
  const policyId = searchParams.get('policy_id') || '';

  const [loading, setLoading] = useState(true);
  const [academicList, setAcademicList] = useState([]);
  const [sideList, setSideList] = useState([]);
  const [policyNumbers, setPolicyNumbers] = useState([]);
  const [items, setItems] = useState([]);

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [activeItem, setActiveItem] = useState(null);
  const [modalForm, setModalForm] = useState({
    no_order: '',
    text: '',
  });
  const [modalSaving, setModalSaving] = useState(false);

  const updateParams = (next) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value === '' || value === null || typeof value === 'undefined') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const query = params.toString();
    navigate(query ? `/policy_items?${query}` : '/policy_items');
  };

  const loadLookups = async () => {
    const [academicRes, sideRes] = await Promise.all([
      supabase
        .from('tbl_system_Academic_Standing')
        .select('*')
        .or('academic_id.eq.99,and(academic_id.gte.15,academic_id.lte.18)')
        .order('academic_id', { ascending: true }),
      supabase
        .from('tbl_policy_side')
        .select('*')
        .order('no_id', { ascending: true }),
    ]);
    if (academicRes.error) throw academicRes.error;
    if (sideRes.error) throw sideRes.error;
    setAcademicList(academicRes.data || []);
    setSideList(sideRes.data || []);
  };

  const loadPolicyNumbers = async () => {
    let query = supabase.from('tbl_policy_number').select('*').order('no_order', { ascending: true });
    if (academicId) query = query.eq('academic', academicId);
    if (policySide) query = query.eq('side', policySide);
    const { data, error } = await query;
    if (error) throw error;
    setPolicyNumbers(data || []);
  };

  const loadItems = async () => {
    if (!policyId) {
      setItems([]);
      return;
    }
    const { data, error } = await supabase
      .from('tbl_policy_items')
      .select('*')
      .eq('policy_id', policyId)
      .order('no_order', { ascending: true });
    if (error) throw error;
    setItems(data || []);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await loadLookups();
      await loadPolicyNumbers();
      await loadItems();
    } catch (err) {
      console.error('PolicyItems error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicId, policySide, policyId]);

  const selectedPolicyNumber = useMemo(() => {
    return policyNumbers.find(p => String(p.auto_id) === String(policyId));
  }, [policyNumbers, policyId]);

  const openAddModal = () => {
    if (!policyId) {
      Swal.fire('แจ้งเตือน', 'กรุณาเลือกตัวชี้วัดหลักก่อนเพิ่มรายการเกณฑ์ประเมิน', 'warning');
      return;
    }
    setModalMode('add');
    setActiveItem(null);
    setModalForm({
      no_order: String(items.length + 1),
      text: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setModalMode('edit');
    setActiveItem(item);
    setModalForm({
      no_order: String(item.no_order || ''),
      text: item.text || '',
    });
    setModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalForm.text.trim()) {
      Swal.fire('แจ้งเตือน', 'กรุณากรอกรายละเอียดเกณฑ์การประเมิน', 'warning');
      return;
    }

    setModalSaving(true);
    try {
      if (modalMode === 'add') {
        const { error } = await supabase
          .from('tbl_policy_items')
          .insert([{
            policy_id: policyId,
            no_order: Number(modalForm.no_order) || items.length + 1,
            text: modalForm.text.trim(),
          }]);
        if (error) throw error;
        Swal.fire('สำเร็จ', 'เพิ่มรายการเกณฑ์ประเมินเรียบร้อยแล้ว', 'success');
      } else {
        const { error } = await supabase
          .from('tbl_policy_items')
          .update({
            no_order: Number(modalForm.no_order) || activeItem.no_order,
            text: modalForm.text.trim(),
          })
          .eq('id', activeItem.id);
        if (error) throw error;
        Swal.fire('สำเร็จ', 'แก้ไขรายการเกณฑ์ประเมินเรียบร้อยแล้ว', 'success');
      }
      setModalOpen(false);
      loadItems();
    } catch (err) {
      console.error('Save policy item error:', err);
      Swal.fire('Error', 'ไม่สามารถบันทึกข้อมูลได้: ' + err.message, 'error');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeleteItem = async (item) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบเกณฑ์ประเมิน?',
      html: `คุณต้องการลบข้อที่ ${item.no_order}: <b>${item.text}</b> ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบรายการ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('tbl_policy_items')
          .delete()
          .eq('id', item.id);
        if (error) throw error;
        Swal.fire('สำเร็จ', 'ลบเกณฑ์ประเมินเรียบร้อยแล้ว', 'success');
        setItems(prev => prev.filter(i => i.id !== item.id));
      } catch (err) {
        console.error('Delete policy item error:', err);
        Swal.fire('Error', 'ไม่สามารถลบข้อมูลได้: ' + err.message, 'error');
      }
    }
  };

  if (loading) {
    return <LoadingSpinner title="รายการตัวชี้วัดย่อยและเกณฑ์การให้คะแนน" message="กำลังโหลดข้อมูล..." />;
  }

  return (
    <div className="container-fluid py-3">
      {/* ── PA Rubric Navigation Tabs ── */}
      <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: '12px' }}>
        <div className="card-body p-2">
          <ul className="nav nav-pills nav-fill">
            <li className="nav-item">
              <Link to="/policy_side" className="nav-link text-muted font-weight-bold">
                <i className="fa-solid fa-shapes mr-1"></i> 1. ด้านของการประเมิน (Sides)
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/policy_number" className="nav-link text-muted font-weight-bold">
                <i className="fa-solid fa-list-ol mr-1"></i> 2. องค์ประกอบตัวชี้วัด (Components)
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/policy_items" className="nav-link active font-weight-bold shadow-sm">
                <i className="fa-solid fa-list-check mr-1"></i> 3. รายการเกณฑ์ประเมิน (Rubric Items)
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h5 className="font-weight-bold mb-0 text-dark">
              <i className="fa-solid fa-list-check text-primary mr-2"></i> รายการเกณฑ์การประเมิน ว.PA (Rubric Items)
            </h5>
            <p className="text-muted small mb-0 mt-1">
              กำหนดเกณฑ์ย่อยในแต่ละตัวชี้วัดสำหรับการให้คะแนนของคณะกรรมการ
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-primary font-weight-bold btn-sm px-3"
              style={{ borderRadius: '20px' }}
              onClick={openAddModal}
              disabled={!policyId}
            >
              <i className="fa-solid fa-plus mr-1"></i> เพิ่มรายการเกณฑ์
            </button>
          </div>
        </div>

        <div className="card-body p-4">
          {/* Cascading Filter Controls */}
          <div className="row mb-4">
            <div className="col-md-4 mb-2">
              <label className="font-weight-bold small text-muted">1. วิทยฐานะ:</label>
              <select
                className="form-control form-control-sm"
                value={academicId}
                onChange={(e) => updateParams({ academic_id: e.target.value || '', policy_side: policySide, policy_id: '' })}
              >
                <option value="">-- เลือกวิทยฐานะ --</option>
                {academicList.map((row) => (
                  <option key={row.academic_id} value={row.academic_id}>{row.academic_standing}</option>
                ))}
              </select>
            </div>

            <div className="col-md-4 mb-2">
              <label className="font-weight-bold small text-muted">2. ด้านการประเมิน:</label>
              <select
                className="form-control form-control-sm"
                value={policySide}
                onChange={(e) => updateParams({ academic_id: academicId, policy_side: e.target.value || '', policy_id: '' })}
              >
                <option value="">-- เลือกด้านการประเมิน --</option>
                {sideList.map((row) => (
                  <option key={row.id} value={row.id}>ด้านที่ {row.no_id} {row.text}</option>
                ))}
              </select>
            </div>

            <div className="col-md-4 mb-2">
              <label className="font-weight-bold small text-muted">3. ตัวชี้วัด/องค์ประกอบ:</label>
              <select
                className="form-control form-control-sm"
                value={policyId}
                onChange={(e) => updateParams({ academic_id: academicId, policy_side: policySide, policy_id: e.target.value || '' })}
                disabled={policyNumbers.length === 0}
              >
                <option value="">-- เลือกตัวชี้วัด --</option>
                {policyNumbers.map((row) => (
                  <option key={row.auto_id} value={row.auto_id}>ข้อ {row.no_order}: {row.text}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedPolicyNumber && (
            <div className="alert alert-info py-2 px-3 mb-3 d-flex align-items-center justify-content-between" style={{ borderRadius: '10px' }}>
              <div>
                <strong>ตัวชี้วัดที่เลือก:</strong> ข้อ {selectedPolicyNumber.no_order}: {selectedPolicyNumber.text}
              </div>
              <span className="badge badge-primary">{items.length} เกณฑ์ย่อย</span>
            </div>
          )}

          {/* Items Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="bg-light">
                <tr>
                  <th style={{ width: '60px' }} className="text-center">ลำดับ</th>
                  <th style={{ width: '90px' }} className="text-center">ข้อที่</th>
                  <th>รายละเอียดเกณฑ์การให้คะแนน</th>
                  <th style={{ width: '130px' }} className="text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-muted">
                      {policyId ? 'ยังไม่มีรายการเกณฑ์ย่อยในตัวชี้วัดนี้ คลิก "เพิ่มรายการเกณฑ์"' : 'กรุณาเลือกวิทยฐานะ ด้าน และตัวชี้วัดเพื่อดูรายการเกณฑ์'}
                    </td>
                  </tr>
                ) : (
                  items.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="text-center text-muted font-mono">{idx + 1}</td>
                      <td className="text-center font-weight-bold text-primary">{row.no_order}</td>
                      <td className="font-weight-bold text-dark" style={{ lineHeight: '1.6' }}>{row.text}</td>
                      <td className="text-center">
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-warning"
                            onClick={() => openEditModal(row)}
                            title="แก้ไข"
                          >
                            <i className="fa-regular fa-pen-to-square"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => handleDeleteItem(row)}
                            title="ลบ"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Add / Edit Inline Modal ── */}
      {modalOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
              <div className="modal-header py-3 px-4 border-bottom">
                <h5 className="modal-title font-weight-bold text-dark">
                  {modalMode === 'add' ? (
                    <><i className="fa-solid fa-plus text-primary mr-2"></i> เพิ่มเกณฑ์การประเมินย่อย</>
                  ) : (
                    <><i className="fa-solid fa-pen-to-square text-warning mr-2"></i> แก้ไขเกณฑ์การประเมินย่อย</>
                  )}
                </h5>
                <button type="button" className="close" onClick={() => setModalOpen(false)}>
                  <span>&times;</span>
                </button>
              </div>

              <form onSubmit={handleModalSubmit}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="font-weight-bold small text-muted">ลำดับข้อที่ (no_order):</label>
                    <input
                      type="number"
                      className="form-control"
                      value={modalForm.no_order}
                      onChange={(e) => setModalForm(prev => ({ ...prev, no_order: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="font-weight-bold small text-muted">รายละเอียดเกณฑ์การให้คะแนน:</label>
                    <textarea
                      rows={4}
                      className="form-control"
                      placeholder="ระบุข้อความเกณฑ์การพิจารณา..."
                      value={modalForm.text}
                      onChange={(e) => setModalForm(prev => ({ ...prev, text: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer py-2 px-4 border-top">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModalOpen(false)}>
                    ยกเลิก
                  </button>
                  <button type="submit" className="btn btn-primary font-weight-bold btn-sm px-3" disabled={modalSaving}>
                    {modalSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
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

export default PolicyItems;
