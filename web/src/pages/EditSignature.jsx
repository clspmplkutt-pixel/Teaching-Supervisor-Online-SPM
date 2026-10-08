import React, { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { uploadToDrive } from '../utils/driveUpload';
import { useUserProfile } from '../hooks/useUserProfile';
import LoadingSpinner from '../components/LoadingSpinner';

const EditSignature = () => {
  const { profile, loading: profileLoading } = useUserProfile();
  const [activeTab, setActiveTab] = useState('draw'); // 'draw' | 'upload'
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#1e3a8a'); // น้ำเงินเข้มทางการ
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Canvas Refs
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (profile?.signature) {
      if (String(profile.signature).startsWith('http')) {
        setPreviewUrl(profile.signature);
      } else {
        setPreviewUrl(`/fileupload/signature/${profile.signature}`);
      }
    }
  }, [profile]);

  // Initialize Canvas
  useEffect(() => {
    if (activeTab !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    // Set display size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
  }, [activeTab]);

  // Update stroke styling when changed
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
  }, [strokeColor, strokeWidth]);

  // Get coordinates relative to canvas
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Drawing Handlers
  const startDrawing = (e) => {
    if (e.type === 'touchstart') {
      e.preventDefault();
    }
    const pos = getCoordinates(e);
    lastPosRef.current = pos;
    isDrawingRef.current = true;
    setHasDrawn(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    if (e.type === 'touchmove') {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getCoordinates(e);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // File Upload Validation
  const validateImage = async (selectedFile) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(selectedFile.type)) {
      throw new Error('รองรับเฉพาะไฟล์รูปภาพ JPG, JPEG, PNG');
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
        if (img.width < 200) {
          reject(new Error('ขนาดความกว้างของภาพไม่ควรน้อยกว่า 200 pixel เพื่อความคมชัด'));
          return;
        }
        resolve();
      };
      img.onerror = () => reject(new Error('ไฟล์รูปภาพไม่ถูกต้อง'));
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
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
      setFile(null);
    }
  };

  // Submit Handler
  const handleSaveSignature = async (e) => {
    e.preventDefault();
    if (!profile?.people_id) {
      Swal.fire('ข้อผิดพลาด', 'ไม่พบข้อมูลผู้ใช้งาน', 'error');
      return;
    }

    let targetFile = null;

    if (activeTab === 'draw') {
      if (!hasDrawn) {
        Swal.fire('ยังไม่ได้เซ็นชื่อ', 'กรุณาเซ็นชื่อบนพื้นที่วาดลายเซ็นก่อนบันทึก', 'warning');
        return;
      }
      const canvas = canvasRef.current;
      targetFile = await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          const f = new File([blob], `${profile.people_id}_sign.png`, { type: 'image/png' });
          resolve(f);
        }, 'image/png');
      });
    } else {
      if (!file) {
        Swal.fire('โปรดเลือกไฟล์', 'กรุณาเลือกไฟล์ภาพลายเซ็นก่อนบันทึก', 'warning');
        return;
      }
      targetFile = file;
    }

    setSaving(true);
    try {
      const ext = targetFile.name.split('.').pop() || 'png';
      const signatureName = `${profile.people_id}_sign.${ext}`;
      const fileUrl = await uploadToDrive(targetFile, { filename: signatureName });

      const { error } = await supabase
        .from('tbl_Users')
        .update({ signature: fileUrl })
        .eq('people_id', profile.people_id);

      if (error) throw error;

      setPreviewUrl(fileUrl);
      Swal.fire({
        icon: 'success',
        title: 'บันทึกลายเซ็นสำเร็จ!',
        text: 'ลายเซ็นดิจิทัลของท่านได้รับการอัปเดตและพร้อมใช้ในรายงานการนิเทศแล้ว',
        confirmButtonColor: '#059669',
      });
    } catch (err) {
      console.error('Signature save error:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถอัปโหลดลายเซ็นได้', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading) {
    return <LoadingSpinner text="กำลังโหลดข้อมูลลายเซ็น..." />;
  }

  if (!profile) {
    return <div className="alert alert-warning m-4">ไม่พบข้อมูลผู้ใช้งานในระบบ</div>;
  }

  const fullName = `${profile?.name || ''} ${profile?.lastname || ''}`.trim();

  return (
    <div className="edit-signature container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          <div className="card card-outline card-primary shadow-sm" style={{ borderRadius: '14px' }}>
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap">
              <div>
                <h4 className="font-weight-bold m-0 text-dark">
                  <i className="fa-solid fa-signature text-primary mr-2"></i> จัดการลายเซ็นดิจิทัล (Digital Signature)
                </h4>
                <small className="text-muted">ลายเซ็นนี้จะปรากฏบนใบรับรอง ว.PA รายงานการนิเทศ และแบบประเมินทางการ</small>
              </div>
              <span className="badge badge-light border text-muted">
                {fullName}
              </span>
            </div>

            <div className="card-body p-4">
              <div className="row">
                {/* Left Column: Signature Input (Draw or Upload) */}
                <div className="col-12 col-lg-7 mb-4 mb-lg-0">
                  {/* Mode Tabs */}
                  <div className="nav nav-pills mb-3 p-1 bg-light rounded" style={{ gap: '6px' }}>
                    <button
                      type="button"
                      className={`nav-link font-weight-bold flex-fill border-0 ${activeTab === 'draw' ? 'active bg-primary' : 'text-muted'}`}
                      style={{ borderRadius: '8px', fontSize: '13px' }}
                      onClick={() => setActiveTab('draw')}
                    >
                      <i className="fa-solid fa-pen-nib mr-1"></i> เซ็นชื่อบนหน้าจอ (ปากกา/นิ้วมือ)
                    </button>
                    <button
                      type="button"
                      className={`nav-link font-weight-bold flex-fill border-0 ${activeTab === 'upload' ? 'active bg-primary' : 'text-muted'}`}
                      style={{ borderRadius: '8px', fontSize: '13px' }}
                      onClick={() => setActiveTab('upload')}
                    >
                      <i className="fa-solid fa-file-arrow-up mr-1"></i> อัปโหลดไฟล์รูปภาพ
                    </button>
                  </div>

                  {activeTab === 'draw' ? (
                    <div>
                      {/* Drawing Controls */}
                      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                          <span className="small text-muted font-weight-bold">สีหมึก:</span>
                          <button
                            type="button"
                            className="btn btn-xs rounded-circle p-0"
                            style={{
                              width: '24px',
                              height: '24px',
                              backgroundColor: '#1e3a8a',
                              border: strokeColor === '#1e3a8a' ? '3px solid #38bdf8' : '1px solid #cbd5e1',
                            }}
                            onClick={() => setStrokeColor('#1e3a8a')}
                            title="น้ำเงินเข้มทางการ"
                          />
                          <button
                            type="button"
                            className="btn btn-xs rounded-circle p-0"
                            style={{
                              width: '24px',
                              height: '24px',
                              backgroundColor: '#0f172a',
                              border: strokeColor === '#0f172a' ? '3px solid #38bdf8' : '1px solid #cbd5e1',
                            }}
                            onClick={() => setStrokeColor('#0f172a')}
                            title="ดำสนิท"
                          />
                        </div>

                        <div className="d-flex align-items-center gap-2">
                          <span className="small text-muted font-weight-bold">ขนาดเส้น:</span>
                          <button
                            type="button"
                            className={`btn btn-xs ${strokeWidth === 2 ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => setStrokeWidth(2)}
                          >
                            บาง
                          </button>
                          <button
                            type="button"
                            className={`btn btn-xs ${strokeWidth === 3 ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => setStrokeWidth(3)}
                          >
                            ปกติ
                          </button>
                          <button
                            type="button"
                            className={`btn btn-xs ${strokeWidth === 5 ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => setStrokeWidth(5)}
                          >
                            หนา
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-outline-danger ml-2"
                            onClick={clearCanvas}
                            title="ล้างเพื่อเซ็นใหม่"
                          >
                            <i className="fa-solid fa-rotate-left mr-1"></i> ล้าง
                          </button>
                        </div>
                      </div>

                      {/* Interactive Canvas Pad */}
                      <div
                        className="signature-pad-container border rounded shadow-inner"
                        style={{
                          backgroundColor: '#fafbfc',
                          position: 'relative',
                          touchAction: 'none',
                          cursor: 'crosshair',
                        }}
                      >
                        <canvas
                          ref={canvasRef}
                          style={{
                            width: '100%',
                            height: '220px',
                            display: 'block',
                          }}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                        />
                        {!hasDrawn && (
                          <div
                            className="position-absolute d-flex flex-column align-items-center justify-content-center w-100 h-100 text-muted"
                            style={{ top: 0, left: 0, pointerEvents: 'none', opacity: 0.5 }}
                          >
                            <i className="fa-solid fa-signature fa-2x mb-1"></i>
                            <span className="small">แตะหรือลากเพื่อเซ็นชื่อในกรอบนี้</span>
                          </div>
                        )}
                        <div
                          className="position-absolute text-muted"
                          style={{ bottom: '8px', left: '16px', fontSize: '11px', pointerEvents: 'none' }}
                        >
                          ✕ เส้นกึ่งกลางลายเซ็น
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Upload Box */}
                      <div className="form-group mb-3">
                        <label className="font-weight-bold mb-1" htmlFor="profileSign">
                          <i className="fa-solid fa-file-image text-primary mr-1"></i> เลือกไฟล์ภาพลายเซ็น :
                        </label>
                        <input
                          type="file"
                          id="profileSign"
                          className="form-control"
                          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                          onChange={handleFileChange}
                        />
                        <small className="text-muted d-block mt-2">
                          <i className="fa-solid fa-circle-info text-info mr-1"></i>
                          แนะนำให้ใช้ภาพลายเซ็นแนวนอน ขนาดความกว้างไม่น้อยกว่า 200 พิกเซล (พื้นหลังสีขาวหรือโปร่งใส)
                        </small>
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="mt-4 pt-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSaveSignature}
                      className="btn btn-success btn-lg btn-block font-weight-bold shadow-sm"
                      style={{ borderRadius: '10px' }}
                    >
                      {saving ? (
                        <span><span className="spinner-border spinner-border-sm mr-2"></span> กำลังบันทึกลายเซ็น...</span>
                      ) : (
                        <span><i className="fa-solid fa-floppy-disk mr-2"></i> บันทึกลายเซ็นดิจิทัล</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right Column: Preview on Document Simulation */}
                <div className="col-12 col-lg-5">
                  <div className="card border bg-light h-100" style={{ borderRadius: '12px' }}>
                    <div className="card-header bg-white py-2 px-3 border-bottom">
                      <strong className="text-dark small">
                        <i className="fa-solid fa-file-lines text-primary mr-1"></i> การจำลองลายเซ็นบนเอกสารราชการ
                      </strong>
                    </div>
                    <div className="card-body p-4 d-flex flex-column justify-content-center align-items-center text-center">
                      <div
                        className="bg-white p-4 border rounded shadow-sm w-100"
                        style={{
                          maxWidth: '320px',
                          borderStyle: 'dashed',
                        }}
                      >
                        <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt="Signature Preview"
                              style={{ maxHeight: '75px', maxWidth: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <span className="text-muted small">ยังไม่มีลายเซ็นในระบบ</span>
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-top text-dark" style={{ fontSize: '13px' }}>
                          <strong>({fullName || 'ชื่อ-นามสกุล'})</strong>
                        </div>
                        <div className="text-muted" style={{ fontSize: '12px' }}>
                          {profile?.position_id ? 'ตำแหน่งตามทะเบียน' : 'ผู้รับรอง/ผู้ประเมิน'}
                        </div>
                      </div>

                      <div className="mt-3 text-muted small">
                        <i className="fa-solid fa-shield-halved text-success mr-1"></i> ลายเซ็นจะถูกจัดเก็บปลอดภัยและเชื่อมโยงกับบัญชีของท่านโดยอัตโนมัติ
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditSignature;
