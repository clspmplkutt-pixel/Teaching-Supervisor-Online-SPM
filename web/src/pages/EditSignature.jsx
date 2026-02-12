import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { uploadToDrive } from '../utils/driveUpload';
import { useUserProfile } from '../hooks/useUserProfile';

const EditSignature = () => {
  const { profile, loading: profileLoading } = useUserProfile();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.signature) {
      if (String(profile.signature).startsWith('http')) {
        setPreviewUrl(profile.signature);
      } else {
        setPreviewUrl(`/fileupload/signature/${profile.signature}`);
      }
    }
  }, [profile]);

  const validateImage = async (selectedFile) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(selectedFile.type)) {
      throw new Error('รองรับเฉพาะไฟล์ JPG, JPEG, PNG');
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(selectedFile);
    });

    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 300) {
          reject(new Error('ขนาดไฟล์ ความกว้าง ไม่ควรน้อยกว่า 300 pixel'));
          return;
        }
        if (img.width / img.height <= 1) {
          reject(new Error('กรุณาอัปโหลดภาพแนวนอน'));
          return;
        }
        resolve();
      };
      img.onerror = () => reject(new Error('ไฟล์ไม่ถูกต้อง'));
      img.src = dataUrl;
    });

    return dataUrl;
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      const dataUrl = await validateImage(selectedFile);
      setFile(selectedFile);
      setPreviewUrl(String(dataUrl));
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
      setFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      Swal.fire('Warning', 'โปรดเลือกไฟล์', 'info');
      return;
    }
    if (!profile?.people_id) {
      Swal.fire('Error', 'ไม่พบข้อมูลผู้ใช้งาน', 'error');
      return;
    }

    setSaving(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const signatureName = `${profile.people_id}_sign.${ext}`;
      const fileUrl = await uploadToDrive(file, { filename: signatureName });
      const { error } = await supabase
        .from('tbl_Users')
        .update({ signature: fileUrl })
        .eq('people_id', profile.people_id);

      if (error) throw error;

      Swal.fire('สำเร็จ', 'แก้ไขข้อมูลเรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.message || 'ไม่สามารถอัปโหลดได้', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }
  if (!profile) {
    return <div className="alert alert-warning">ไม่พบข้อมูลผู้ใช้งาน</div>;
  }

  return (
    <div className="row">
      <div className="col-lg-6">
        <form onSubmit={handleSubmit} className="form-horizontal">
          <div className="card card-default">
            <div className="card-header bg-info">
              <h3 className="card-title"><i className="fa-solid fa-book"></i> จัดการลายเซ็นต์</h3>
            </div>
            <div className="card-body">
              <div className="col-lg-12 col-sm-12">
                <div className="form-group text-center">
                  <label className="form-label text-center" htmlFor="profileSign">
                    <i className="fa-solid fa-book"></i> ไฟล์ภาพลายเซ็นต์
                  </label>
                  <div className="custom-file">
                    <input className="form-control" name="profileSign" id="profileSign" type="file" accept=".JPG,.PNG,.JPEG" onChange={handleFileChange} />
                    <div className="invalid-feedback">โปรดเลือกไฟล์</div>
                  </div>
                </div>
                <h2 className="text-danger">ขนาดของไฟล์ ความกว้าง ไม่ควรน้อยกว่า 300 pixel (เป็น jpg หรือ PNG รูปภาพลายเซ็นต์)</h2>
              </div>
            </div>
            <div className="card-footer text-center">
              <button type="submit" className="btn btn-warning btn-pill btn-lg mr-2 mb-4 col-sm-12 ms-sm-auto d-grid" disabled={saving}>
                <i className="fa-solid fa-save"></i> แก้ไขข้อมูล
              </button>
            </div>
          </div>
        </form>
      </div>
      <div className="col-lg-6">
        <div className="card card-default">
          <div className="card-header bg-info">
            <h3 className="card-title"><i className="fa-solid fa-book"></i> ภาพลายเซ็นต์</h3>
          </div>
          <div className="card-body">
            <div className="col-lg-12 col-sm-12">
              <div className="form-group text-center">
                {previewUrl ? (
                  <img src={previewUrl} alt="Signature" style={{ maxWidth: '100%' }} />
                ) : (
                  <h1 className="text-danger">กรุณาเพิ่มภาพลายเซ็นต์</h1>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditSignature;
