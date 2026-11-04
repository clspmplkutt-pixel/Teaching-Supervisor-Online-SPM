import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { showToast } from '../utils/toast';

const LearningModelEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modelId = (searchParams.get('model_id') || '').trim();

  const [loading, setLoading] = useState(Boolean(modelId));
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    model_id: '',
    model_name: '',
    model_status: '1',
  });

  useEffect(() => {
    if (!modelId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const { data, error } = await supabase
          .from('tbl_learningModel')
          .select('*')
          .eq('model_id', modelId)
          .maybeSingle();
        if (error) throw error;
        if (!mounted) return;

        if (!data) {
          setNotFound(true);
          return;
        }
        setForm({
          model_id: data.model_id ?? '',
          model_name: data.model_name ?? '',
          model_status: String(data.model_status ?? '1'),
        });
      } catch (err) {
        console.error(err);
        if (mounted) {
          Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถโหลดข้อมูลรูปแบบการจัดการเรียนรู้ได้', 'error');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [modelId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const modelIdClean = String(form.model_id || '').trim();
    const modelNameClean = String(form.model_name || '').trim();
    if (!modelIdClean || !modelNameClean) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาระบุรหัสรูปแบบและชื่อรูปแบบการจัดการเรียนรู้', 'warning');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tbl_learningModel')
        .update({
          model_id: modelIdClean,
          model_name: modelNameClean,
          model_status: form.model_status || '1',
        })
        .eq('model_id', modelId);
      if (error) throw error;

      showToast('บันทึกการแก้ไขรูปแบบการจัดการเรียนรู้สำเร็จ');
      navigate('/learningModel');
    } catch (err) {
      console.error(err);
      Swal.fire('ไม่สามารถบันทึกได้', err.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!modelId || notFound) {
    return (
      <EmptyState
        type="warning"
        icon="fa-lightbulb"
        title={!modelId ? 'ไม่ได้ระบุรหัสรูปแบบการจัดการเรียนรู้' : 'ไม่พบรูปแบบการจัดการเรียนรู้'}
        message={
          !modelId
            ? 'กรุณาเลือกรายการที่ต้องการแก้ไขจากหน้ารูปแบบการจัดการเรียนรู้'
            : `ไม่พบรูปแบบการจัดการเรียนรู้รหัส "${modelId}"`
        }
        actionLabel="กลับหน้ารูปแบบการจัดการเรียนรู้"
        onAction={() => navigate('/learningModel')}
      />
    );
  }

  if (loading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลรูปแบบการจัดการเรียนรู้..." />;
  }

  return (
    <div className="row justify-content-center">
      <div className="col-sm-12 col-md-10 col-lg-8">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h3 className="card-title m-0 font-weight-bold text-dark">
              <i className="fa-solid fa-pen-to-square text-info mr-2"></i>
              แก้ไขรูปแบบการจัดการเรียนรู้
            </h3>
            <Link to="/learningModel" className="btn btn-sm btn-outline-secondary">
              <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับ
            </Link>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="model_id" className="form-label">
                  รหัสรูปแบบการจัดการเรียนรู้ <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  className="form-control"
                  id="model_id"
                  name="model_id"
                  placeholder="รหัสรูปแบบ"
                  value={form.model_id}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="model_name" className="form-label">
                  ชื่อรูปแบบการจัดการเรียนรู้ <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="model_name"
                  name="model_name"
                  placeholder="รูปแบบการจัดการเรียนรู้"
                  value={form.model_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="model_status" className="form-label">สถานะการใช้งาน</label>
                <select
                  id="model_status"
                  name="model_status"
                  className="custom-select"
                  value={form.model_status}
                  onChange={handleChange}
                >
                  <option value="1">เปิดใช้งาน</option>
                  <option value="0">ปิดใช้งาน</option>
                </select>
              </div>

              <div className="d-flex flex-wrap gap-2 pt-2 border-top">
                <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={saving}>
                  <i className="fa-solid fa-floppy-disk mr-1"></i>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
                <Link to="/learningModel" className="btn btn-light border px-4">
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

export default LearningModelEdit;
