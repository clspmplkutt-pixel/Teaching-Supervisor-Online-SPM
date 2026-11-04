import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { showToast } from '../utils/toast';

const SchoolSizeEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idParam = (searchParams.get('schoolsize_id') || '').trim();

  const [loading, setLoading] = useState(Boolean(idParam));
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    schoolsize_id: '',
    schoolsize_name: '',
    schoolsize_details: '',
    schoolsize_min: '',
    schoolsize_max: '',
  });

  useEffect(() => {
    if (!idParam) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const { data, error } = await supabase
          .from('tbl_schoolsize')
          .select('*')
          .eq('schoolsize_id', idParam)
          .maybeSingle();
        if (error) throw error;
        if (!mounted) return;

        if (!data) {
          setNotFound(true);
          return;
        }
        setForm({
          schoolsize_id: data.schoolsize_id ?? '',
          schoolsize_name: data.schoolsize_name ?? '',
          schoolsize_details: data.schoolsize_details ?? '',
          schoolsize_min: data.schoolsize_min ?? '',
          schoolsize_max: data.schoolsize_max ?? '',
        });
      } catch (err) {
        console.error(err);
        if (mounted) {
          Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถโหลดเกณฑ์ขนาดโรงเรียนได้', 'error');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [idParam]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const min = Number(form.schoolsize_min);
    const max = Number(form.schoolsize_max);
    if (!Number.isNaN(min) && !Number.isNaN(max) && max !== 0 && min > max) {
      Swal.fire('ข้อมูลไม่ถูกต้อง', 'จำนวนนักเรียนที่น้อยที่สุด ต้องไม่มากกว่าจำนวนนักเรียนที่มากที่สุด', 'warning');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || !validate()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tbl_schoolsize')
        .update({
          schoolsize_details: form.schoolsize_details,
          schoolsize_min: form.schoolsize_min,
          schoolsize_max: form.schoolsize_max,
        })
        .eq('schoolsize_id', form.schoolsize_id);
      if (error) throw error;

      showToast('แก้ไขข้อมูลขนาดโรงเรียนสำเร็จ');
      navigate('/school_size');
    } catch (err) {
      console.error(err);
      Swal.fire('ไม่สามารถบันทึกได้', err.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!idParam || notFound) {
    return (
      <EmptyState
        type="warning"
        icon="fa-chart-simple"
        title={!idParam ? 'ไม่ได้ระบุรหัสขนาดโรงเรียน' : 'ไม่พบข้อมูลขนาดโรงเรียน'}
        message={
          !idParam
            ? 'กรุณาเลือกรายการขนาดโรงเรียนที่ต้องการแก้ไขจากหน้าเกณฑ์ขนาดโรงเรียน'
            : `ไม่พบเกณฑ์ขนาดโรงเรียนรหัส "${idParam}"`
        }
        actionLabel="กลับหน้าเกณฑ์ขนาดโรงเรียน"
        onAction={() => navigate('/school_size')}
      />
    );
  }

  if (loading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลขนาดโรงเรียน..." />;
  }

  return (
    <div className="row justify-content-center">
      <div className="col-sm-12 col-md-10 col-lg-8">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h3 className="card-title m-0 font-weight-bold text-dark">
              <i className="fa-solid fa-pen-to-square text-info mr-2"></i>
              แก้ไขเกณฑ์ขนาดโรงเรียน
            </h3>
            <Link to="/school_size" className="btn btn-sm btn-outline-secondary">
              <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับ
            </Link>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="mb-3 col-md-4">
                  <label htmlFor="schoolsize_id" className="form-label">รหัสขนาด</label>
                  <input
                    type="text"
                    className="form-control bg-light"
                    id="schoolsize_id"
                    name="schoolsize_id"
                    value={form.schoolsize_id}
                    readOnly
                  />
                </div>
                <div className="mb-3 col-md-8">
                  <label htmlFor="schoolsize_name" className="form-label">ชื่อขนาดโรงเรียน</label>
                  <input
                    type="text"
                    className="form-control bg-light"
                    id="schoolsize_name"
                    name="schoolsize_name"
                    value={form.schoolsize_name}
                    readOnly
                  />
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="schoolsize_details" className="form-label">คำอธิบายเกณฑ์</label>
                <input
                  type="text"
                  className="form-control"
                  id="schoolsize_details"
                  name="schoolsize_details"
                  value={form.schoolsize_details}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="row">
                <div className="mb-3 col-md-6">
                  <label htmlFor="schoolsize_min" className="form-label">จำนวนนักเรียนที่น้อยที่สุด (คน)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    id="schoolsize_min"
                    name="schoolsize_min"
                    value={form.schoolsize_min}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="mb-3 col-md-6">
                  <label htmlFor="schoolsize_max" className="form-label">จำนวนนักเรียนที่มากที่สุด (คน)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    id="schoolsize_max"
                    name="schoolsize_max"
                    value={form.schoolsize_max}
                    onChange={handleChange}
                    required
                  />
                  <small className="text-muted">
                    หากใส่ 0 หมายถึงตั้งแต่จำนวนน้อยที่สุดขึ้นไป (สำหรับโรงเรียนขนาดใหญ่พิเศษ)
                  </small>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 pt-2 border-top">
                <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={saving}>
                  <i className="fa-solid fa-floppy-disk mr-1"></i>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
                <Link to="/school_size" className="btn btn-light border px-4">
                  ยกเลิก
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolSizeEdit;
