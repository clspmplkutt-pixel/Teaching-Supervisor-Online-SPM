import React, { useCallback, useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { uploadToDrive } from '../utils/driveUpload';
import { useUserProfile } from '../hooks/useUserProfile';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * Removes near-white paper background from a scanned/photographed signature image
 * with smooth alpha feathering so ink strokes remain crisp on official certificates.
 */
const removeWhiteBackgroundFromDataUrl = (dataUrl, fileNameBase = 'signature') =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          const a = d[i + 3];
          if (a === 0) continue;

          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const minCh = Math.min(r, g, b);

          if (minCh >= 235 || lum >= 242) {
            d[i + 3] = 0;
          } else if (lum > 205) {
            const ratio = Math.max(0, Math.min(1, (242 - lum) / 37));
            d[i + 3] = Math.round(a * ratio);
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const processedDataUrl = canvas.toDataURL('image/png');
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('ไม่สามารถประมวลผลพื้นหลังโปร่งใสได้'));
            return;
          }
          const processedFile = new File([blob], `${fileNameBase}_sign.png`, {
            type: 'image/png',
          });
          resolve({ processedFile, processedDataUrl });
        }, 'image/png');
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    img.src = dataUrl;
  });

const EditSignature = () => {
  const { profile, loading: profileLoading, reloadProfile } = useUserProfile();
  const [activeTab, setActiveTab] = useState('draw'); // 'draw' | 'upload'
  const [rawUploadFile, setRawUploadFile] = useState(null);
  const [rawUploadDataUrl, setRawUploadDataUrl] = useState('');
  const [processedUploadFile, setProcessedUploadFile] = useState(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState('');
  const [autoRemoveWhiteBg, setAutoRemoveWhiteBg] = useState(true);
  const [processingBg, setProcessingBg] = useState(false);

  const [savedSignatureUrl, setSavedSignatureUrl] = useState('');
  const [drawnPreviewUrl, setDrawnPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#1e3a8a'); // น้ำเงินเข้มทางการ
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Lookup labels for official certificate preview
  const [prefixLabel, setPrefixLabel] = useState('');
  const [positionLabel, setPositionLabel] = useState('');
  const [schoolLabel, setSchoolLabel] = useState('');

  // Canvas Refs
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (profile?.signature) {
      if (String(profile.signature).startsWith('http')) {
        setSavedSignatureUrl(profile.signature);
      } else {
        setSavedSignatureUrl(`/fileupload/signature/${profile.signature}`);
      }
    } else {
      setSavedSignatureUrl('');
    }
  }, [profile]);

  // Fetch Prefix, Position Name, and School Name from lookup tables
  useEffect(() => {
    if (!profile) return undefined;
    let mounted = true;

    const loadLookups = async () => {
      try {
        const promises = [
          profile.prefix
            ? supabase
                .from('tbl_system_prefix')
                .select('prefix')
                .eq('prefix_id', profile.prefix)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          profile.position_id
            ? supabase
                .from('tbl_system_PersonPositionType')
                .select('position_name')
                .eq('position_id', profile.position_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          profile.school
            ? supabase
                .from('tbl_school')
                .select('school_name')
                .eq('school_id', profile.school)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ];

        const [preRes, posRes, schRes] = await Promise.all(promises);
        if (!mounted) return;
        setPrefixLabel(preRes.data?.prefix || '');
        setPositionLabel(posRes.data?.position_name || '');
        setSchoolLabel(schRes.data?.school_name || '');
      } catch (err) {
        console.error('EditSignature lookup error:', err);
      }
    };

    loadLookups();
    return () => {
      mounted = false;
    };
  }, [profile]);

  // Initialize Canvas
  useEffect(() => {
    if (activeTab !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    setHasDrawn(false);
    setDrawnPreviewUrl('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Update stroke styling when changed
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
  }, [strokeColor, strokeWidth]);

  // Re-run white background removal whenever toggle or uploaded image changes
  const applyUploadProcessing = useCallback(
    async (sourceDataUrl, sourceFile, shouldRemoveBg) => {
      if (!sourceDataUrl || !sourceFile) return;
      if (!shouldRemoveBg) {
        setProcessedUploadFile(sourceFile);
        setUploadPreviewUrl(sourceDataUrl);
        return;
      }

      setProcessingBg(true);
      try {
        const base = profile?.people_id || 'user';
        const { processedFile, processedDataUrl } = await removeWhiteBackgroundFromDataUrl(
          sourceDataUrl,
          base
        );
        setProcessedUploadFile(processedFile);
        setUploadPreviewUrl(processedDataUrl);
      } catch (err) {
        console.error('Background removal fallback:', err);
        setProcessedUploadFile(sourceFile);
        setUploadPreviewUrl(sourceDataUrl);
      } finally {
        setProcessingBg(false);
      }
    },
    [profile?.people_id]
  );

  useEffect(() => {
    if (rawUploadDataUrl && rawUploadFile) {
      applyUploadProcessing(rawUploadDataUrl, rawUploadFile, autoRemoveWhiteBg);
    }
  }, [autoRemoveWhiteBg, rawUploadDataUrl, rawUploadFile, applyUploadProcessing]);

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

  const syncDrawnPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      setDrawnPreviewUrl(canvas.toDataURL('image/png'));
    } catch {
      // ignore
    }
  };

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
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      syncDrawnPreview();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setDrawnPreviewUrl('');
  };

  const validateImage = async (selectedFile) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(selectedFile.type)) {
      throw new Error('รองรับเฉพาะไฟล์รูปภาพ JPG, JPEG หรือ PNG เท่านั้น');
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(selectedFile);
    });

    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 200) {
          reject(new Error('ขนาดความกว้างของภาพไม่ควรน้อยกว่า 200 พิกเซล เพื่อความคมชัดบนเกียรติบัตร'));
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
      setRawUploadFile(selectedFile);
      setRawUploadDataUrl(dataUrl);
    } catch (err) {
      Swal.fire('ไฟล์ไม่ถูกต้อง', err.message, 'error');
      setRawUploadFile(null);
      setRawUploadDataUrl('');
      setProcessedUploadFile(null);
      setUploadPreviewUrl('');
    }
  };

  const handleSaveSignature = async (e) => {
    e.preventDefault();
    if (!profile?.people_id && profile?.id == null) {
      Swal.fire('ข้อผิดพลาด', 'ไม่พบข้อมูลผู้ใช้งาน', 'error');
      return;
    }

    let targetFile = null;

    if (activeTab === 'draw') {
      if (!hasDrawn) {
        Swal.fire('ยังไม่ได้เซ็นชื่อ', 'กรุณาเซ็นชื่อบนพื้นที่วาดลายเซ็นก่อนกดบันทึก', 'warning');
        return;
      }
      const canvas = canvasRef.current;
      targetFile = await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          const f = new File([blob], `${profile.people_id || profile.id}_sign.png`, {
            type: 'image/png',
          });
          resolve(f);
        }, 'image/png');
      });
    } else {
      const chosenFile = processedUploadFile || rawUploadFile;
      if (!chosenFile) {
        Swal.fire('โปรดเลือกไฟล์', 'กรุณาเลือกไฟล์ภาพลายเซ็นก่อนกดบันทึก', 'warning');
        return;
      }
      targetFile = chosenFile;
    }

    setSaving(true);
    try {
      const ext = targetFile.type === 'image/png' ? 'png' : targetFile.name.split('.').pop() || 'png';
      const signatureName = `${profile.people_id || profile.id}_sign.${ext}`;
      const fileUrl = await uploadToDrive(targetFile, { filename: signatureName });

      let query = supabase.from('tbl_Users').update({
        signature: fileUrl,
        lastupdate: new Date().toISOString(),
      });

      if (profile?.id != null) {
        query = query.eq('id', profile.id);
      } else {
        query = query.eq('people_id', profile.people_id);
      }

      const { error } = await query;
      if (error) throw error;

      setSavedSignatureUrl(fileUrl);
      await reloadProfile?.();

      Swal.fire({
        icon: 'success',
        title: 'บันทึกลายเซ็นดิจิทัลสำเร็จ!',
        text: 'ลายเซ็นของท่านพร้อมใช้งานบนเกียรติบัตรและแบบประเมินการนิเทศแล้ว',
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
    return <LoadingSpinner message="กำลังโหลดข้อมูลลายเซ็นดิจิทัล..." />;
  }

  if (!profile) {
    return <div className="alert alert-warning m-4">ไม่พบข้อมูลผู้ใช้งานในระบบ</div>;
  }

  const fullName = `${prefixLabel}${profile?.name || ''} ${profile?.lastname || ''}`.trim();
  const displayPosition = positionLabel || 'ผู้รับรอง / คณะกรรมการประเมิน';
  const activePreviewImage =
    activeTab === 'draw'
      ? drawnPreviewUrl || savedSignatureUrl
      : uploadPreviewUrl || savedSignatureUrl;
  const isShowingUnsavedPreview =
    (activeTab === 'draw' && Boolean(drawnPreviewUrl)) ||
    (activeTab === 'upload' && Boolean(uploadPreviewUrl));

  return (
    <div className="edit-signature container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          <div className="card border-0 shadow-sm" style={{ borderRadius: '14px' }}>
            <div
              className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center flex-wrap"
              style={{ gap: '8px', borderRadius: '14px 14px 0 0' }}
            >
              <div>
                <h5 className="font-weight-bold m-0 text-dark">
                  <i className="fa-solid fa-signature text-primary mr-2"></i>
                  จัดการลายเซ็นดิจิทัล (Digital Signature)
                </h5>
                <small className="text-muted">
                  ใช้แสดงผลบนเกียรติบัตรการนิเทศออนไลน์ ใบรับรอง ว.PA และแบบประเมินผลการนิเทศ
                </small>
              </div>
              <div className="text-right">
                <span className="badge badge-light border text-dark px-3 py-2">
                  <i className="fa-solid fa-user-check text-success mr-1"></i>
                  {fullName}
                  {positionLabel ? ` • ${positionLabel}` : ''}
                </span>
              </div>
            </div>

            <div className="card-body p-4">
              <div className="row">
                {/* Left Column: Signature Input (Draw or Upload) */}
                <div className="col-12 col-lg-7 mb-4 mb-lg-0">
                  {/* Mode Tabs */}
                  <div className="nav nav-pills mb-3 p-1 bg-light rounded d-flex" style={{ gap: '6px' }}>
                    <button
                      type="button"
                      className={`nav-link font-weight-bold flex-fill border-0 ${
                        activeTab === 'draw' ? 'active bg-primary text-white shadow-sm' : 'text-muted bg-transparent'
                      }`}
                      style={{ borderRadius: '8px', fontSize: '0.88rem' }}
                      onClick={() => setActiveTab('draw')}
                    >
                      <i className="fa-solid fa-pen-nib mr-1"></i> เซ็นชื่อบนหน้าจอ (ปากกา / นิ้วมือ)
                    </button>
                    <button
                      type="button"
                      className={`nav-link font-weight-bold flex-fill border-0 ${
                        activeTab === 'upload' ? 'active bg-primary text-white shadow-sm' : 'text-muted bg-transparent'
                      }`}
                      style={{ borderRadius: '8px', fontSize: '0.88rem' }}
                      onClick={() => setActiveTab('upload')}
                    >
                      <i className="fa-solid fa-file-arrow-up mr-1"></i> อัปโหลดไฟล์รูปภาพลายเซ็น
                    </button>
                  </div>

                  {activeTab === 'draw' ? (
                    <div>
                      {/* Drawing Controls */}
                      <div
                        className="d-flex justify-content-between align-items-center mb-2 flex-wrap"
                        style={{ gap: '8px' }}
                      >
                        <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                          <span className="small text-muted font-weight-bold">สีหมึก:</span>
                          <button
                            type="button"
                            className="btn btn-xs rounded-circle p-0"
                            style={{
                              width: '26px',
                              height: '26px',
                              backgroundColor: '#1e3a8a',
                              border: strokeColor === '#1e3a8a' ? '3px solid #38bdf8' : '1px solid #cbd5e1',
                            }}
                            onClick={() => setStrokeColor('#1e3a8a')}
                            title="น้ำเงินเข้มราชการ"
                          />
                          <button
                            type="button"
                            className="btn btn-xs rounded-circle p-0"
                            style={{
                              width: '26px',
                              height: '26px',
                              backgroundColor: '#0f172a',
                              border: strokeColor === '#0f172a' ? '3px solid #38bdf8' : '1px solid #cbd5e1',
                            }}
                            onClick={() => setStrokeColor('#0f172a')}
                            title="ดำสนิท"
                          />
                        </div>

                        <div className="d-flex align-items-center" style={{ gap: '6px' }}>
                          <span className="small text-muted font-weight-bold">ขนาดเส้น:</span>
                          {[
                            { w: 2, label: 'บาง' },
                            { w: 3, label: 'ปกติ' },
                            { w: 5, label: 'หนา' },
                          ].map((item) => (
                            <button
                              key={item.w}
                              type="button"
                              className={`btn btn-xs ${
                                strokeWidth === item.w ? 'btn-primary' : 'btn-outline-secondary'
                              }`}
                              onClick={() => setStrokeWidth(item.w)}
                            >
                              {item.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="btn btn-xs btn-outline-danger ml-2"
                            onClick={clearCanvas}
                            title="ล้างเพื่อเซ็นใหม่"
                          >
                            <i className="fa-solid fa-rotate-left mr-1"></i> ล้างกระดาน
                          </button>
                        </div>
                      </div>

                      {/* Interactive Canvas Pad */}
                      <div
                        className="signature-pad-container border rounded"
                        style={{
                          backgroundColor: '#f8fafc',
                          position: 'relative',
                          touchAction: 'none',
                          cursor: 'crosshair',
                          borderRadius: '12px',
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
                        {/* Subtle baseline guide */}
                        <div
                          style={{
                            position: 'absolute',
                            left: '10%',
                            right: '10%',
                            bottom: '48px',
                            borderBottom: '1px dashed #cbd5e1',
                            pointerEvents: 'none',
                          }}
                        />
                        {!hasDrawn && (
                          <div
                            className="position-absolute d-flex flex-column align-items-center justify-content-center w-100 h-100 text-muted"
                            style={{ top: 0, left: 0, pointerEvents: 'none', opacity: 0.55 }}
                          >
                            <i className="fa-solid fa-signature fa-2x mb-2 text-primary"></i>
                            <span className="small font-weight-bold">
                              ใช้นิ้วมือ ปากกา Stylus หรือเมาส์ลากเพื่อเซ็นชื่อในกรอบนี้
                            </span>
                          </div>
                        )}
                        <div
                          className="position-absolute text-muted"
                          style={{ bottom: '12px', left: '16px', fontSize: '11px', pointerEvents: 'none' }}
                        >
                          <i className="fa-solid fa-wand-magic-sparkles mr-1"></i>
                          บันทึกเป็นพื้นหลังโปร่งใส (PNG) อัตโนมัติ
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 border rounded bg-light" style={{ borderRadius: '12px' }}>
                      <div className="form-group mb-3">
                        <label className="font-weight-bold small text-dark mb-2" htmlFor="profileSign">
                          <i className="fa-solid fa-file-image text-primary mr-1"></i>
                          เลือกไฟล์ภาพลายเซ็น (JPG หรือ PNG)
                        </label>
                        <input
                          type="file"
                          id="profileSign"
                          className="form-control bg-white"
                          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                          onChange={handleFileChange}
                        />
                        <small className="text-muted d-block mt-2">
                          <i className="fa-solid fa-circle-info text-primary mr-1"></i>
                          แนะนำให้ถ่ายหรือสแกนลายเซ็นปากกาสีน้ำเงิน/ดำบนกระดาษขาวแนวนอน ความกว้างอย่างน้อย 200 พิกเซล
                        </small>
                      </div>

                      <div className="p-3 bg-white border rounded" style={{ borderRadius: '10px' }}>
                        <div className="custom-control custom-switch">
                          <input
                            type="checkbox"
                            className="custom-control-input"
                            id="removeWhiteBgSwitch"
                            checked={autoRemoveWhiteBg}
                            onChange={(e) => setAutoRemoveWhiteBg(e.target.checked)}
                          />
                          <label
                            className="custom-control-label font-weight-bold small text-dark"
                            htmlFor="removeWhiteBgSwitch"
                            style={{ cursor: 'pointer' }}
                          >
                            ลบพื้นหลังสีขาวอัตโนมัติ (ทำให้พื้นหลังโปร่งใสสำหรับวางบนเกียรติบัตร)
                          </label>
                        </div>
                        {processingBg && (
                          <div className="small text-primary mt-1">
                            <span className="spinner-border spinner-border-sm mr-1"></span>
                            กำลังตัดพื้นหลังสีขาวอัตโนมัติ...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="mt-4">
                    <button
                      type="button"
                      disabled={saving || processingBg}
                      onClick={handleSaveSignature}
                      className="btn btn-success btn-lg btn-block font-weight-bold shadow-sm"
                      style={{ borderRadius: '10px', fontSize: '1rem' }}
                    >
                      {saving ? (
                        <span>
                          <span className="spinner-border spinner-border-sm mr-2"></span>
                          กำลังอัปโหลดและบันทึกลายเซ็น...
                        </span>
                      ) : (
                        <span>
                          <i className="fa-solid fa-floppy-disk mr-2"></i>บันทึกลายเซ็นดิจิทัล
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right Column: Realistic Certificate Signature Block Preview */}
                <div className="col-12 col-lg-5">
                  <div
                    className="card border bg-light h-100 mb-0"
                    style={{ borderRadius: '12px' }}
                  >
                    <div className="card-header bg-white py-2 px-3 border-bottom d-flex justify-content-between align-items-center">
                      <strong className="text-dark small">
                        <i className="fa-solid fa-certificate text-warning mr-1"></i>
                        ตัวอย่างการแสดงผลบนเอกสารราชการ / เกียรติบัตร
                      </strong>
                      {isShowingUnsavedPreview ? (
                        <span className="badge badge-warning">ตัวอย่างก่อนบันทึก</span>
                      ) : savedSignatureUrl ? (
                        <span className="badge badge-success">บันทึกในระบบแล้ว</span>
                      ) : null}
                    </div>

                    <div className="card-body p-4 d-flex flex-column justify-content-center align-items-center text-center">
                      <div
                        className="bg-white p-4 border rounded shadow-sm w-100"
                        style={{
                          maxWidth: '350px',
                          backgroundImage:
                            'radial-gradient(rgba(30, 58, 138, 0.04) 1px, transparent 0)',
                          backgroundSize: '14px 14px',
                          borderRadius: '12px',
                        }}
                      >
                        <div
                          style={{
                            height: '86px',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            position: 'relative',
                            marginBottom: '4px',
                          }}
                        >
                          {activePreviewImage ? (
                            <img
                              src={activePreviewImage}
                              alt="ตัวอย่างลายเซ็น"
                              style={{
                                maxHeight: '80px',
                                maxWidth: '220px',
                                objectFit: 'contain',
                                position: 'relative',
                                zIndex: 2,
                                marginBottom: '-8px',
                              }}
                            />
                          ) : (
                            <span className="text-muted small mb-2">ยังไม่มีลายเซ็นในระบบ</span>
                          )}
                        </div>

                        <div
                          className="text-secondary small mb-1"
                          style={{ letterSpacing: '0.5px', fontSize: '0.82rem' }}
                        >
                          ลงชื่อ .......................................................
                        </div>

                        <div className="text-dark font-weight-bold" style={{ fontSize: '0.92rem' }}>
                          ({fullName || 'ชื่อ - นามสกุล'})
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                          {displayPosition}
                        </div>
                        {schoolLabel && (
                          <div className="text-muted" style={{ fontSize: '0.76rem' }}>
                            {schoolLabel}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 text-muted small">
                        <i className="fa-solid fa-shield-halved text-success mr-1"></i>
                        ลายเซ็นจะแสดงซ้อนทับเหนือเส้นประอย่างสมจริงเหมือนการลงนามบนเอกสารจริง
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
