import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';

const ImportDMC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [existingPairs, setExistingPairs] = useState([]);
  const [yearEdu, setYearEdu] = useState('');
  const [dmcRound, setDmcRound] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, text: '' });
  const [schoolSizes, setSchoolSizes] = useState([]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      try {
        const [dmcRes, sizeRes] = await Promise.all([
          supabase
            .from('tbl_school_DMCdata')
            .select('education_year, education_section')
            .order('education_year', { ascending: false })
            .order('education_section', { ascending: false }),
          supabase
            .from('tbl_school_size')
            .select('*')
            .order('school_size_id', { ascending: true })
        ]);

        if (dmcRes.error) throw dmcRes.error;
        if (sizeRes.error) throw sizeRes.error;

        const pairs = [];
        const seen = new Set();
        (dmcRes.data || []).forEach((row) => {
          const key = `${row.education_year}-${row.education_section}`;
          if (!seen.has(key)) {
            seen.add(key);
            pairs.push(row);
          }
        });

        if (mounted) {
          setExistingPairs(pairs);
          setSchoolSizes(sizeRes.data || []);
        }
      } catch (err) {
        console.error('ImportDMC load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  const loadExisting = async () => {
    const { data } = await supabase
      .from('tbl_school_DMCdata')
      .select('education_year, education_section')
      .order('education_year', { ascending: false })
      .order('education_section', { ascending: false });

    const pairs = [];
    const seen = new Set();
    (data || []).forEach((row) => {
      const key = `${row.education_year}-${row.education_section}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push(row);
      }
    });
    setExistingPairs(pairs);
  };

  const findSchoolSize = (totalStudents) => {
    const num = Number(totalStudents) || 0;
    for (const size of schoolSizes) {
      const min = Number(size.school_size_min) || 0;
      const max = Number(size.school_size_max) || 999999;
      if (num >= min && num <= max) {
        return size.school_size_id;
      }
    }
    return '1';
  };

  const getVal = (row, key) => {
    const val = row[key];
    if (val === undefined || val === null || val === '') return 0;
    const parsed = parseInt(String(val).replace(/,/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!yearEdu || !dmcRound) {
      Swal.fire('แจ้งเตือน', 'กรุณาระบุปีการศึกษาและรอบการรายงาน', 'warning');
      return;
    }

    const confirm = await Swal.fire({
      title: 'ยืนยันการนำเข้าข้อมูล?',
      html: `ต้องการดึงข้อมูลนักเรียน DMC จากระบบกลาง<br/>ปีการศึกษา <b>${yearEdu}</b> รอบที่ <b>${dmcRound}</b> ใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันดึงข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
    });

    if (!confirm.isConfirmed) return;

    setProcessing(true);
    setProgress({ current: 0, total: 0, text: 'กำลังเชื่อมต่อ API DMC...' });

    try {
      const res = await fetch(`https://api.bopp-obec.info/v1/dmc/report/class_all_school/area/650000?year_edu=${yearEdu}&dmc_round=${dmcRound}`);
      if (!res.ok) throw new Error('API bopp-obec ตอบสนองผิดพลาด: ' + res.status);
      const rows = await res.json();

      if (!Array.isArray(rows) || rows.length === 0) {
        Swal.fire('ไม่พบข้อมูล', `ไม่พบข้อมูลนักเรียน DMC ประจำปีการศึกษา ${yearEdu} รอบที่ ${dmcRound}`, 'info');
        setProcessing(false);
        return;
      }

      const totalRows = rows.length;
      setProgress({ current: 0, total: totalRows, text: `พบข้อมูล ${totalRows} โรงเรียน กำลังประมวลผล...` });

      const { data: existingRecords } = await supabase
        .from('tbl_school_DMCdata')
        .select('school_code8')
        .eq('education_year', yearEdu)
        .eq('education_section', dmcRound);

      const existingSet = new Set((existingRecords || []).map((r) => String(r.school_code8)));

      let insertCount = 0;
      let updateCount = 0;

      for (let i = 0; i < totalRows; i++) {
        const row = rows[i];
        const schoolCode = String(row['รหัสสถานศึกษา'] || '').trim();
        if (!schoolCode) continue;

        setProgress({
          current: i + 1,
          total: totalRows,
          text: `กำลังบันทึกโรงเรียนที่ ${i + 1}/${totalRows}: ${row['ชื่อโรงเรียน'] || schoolCode}`
        });

        const payload = {
          school_code8: schoolCode,
          education_year: yearEdu,
          education_section: dmcRound,
          a1m: getVal(row, 'อ.1 ชาย'),
          a1f: getVal(row, 'อ.1 หญิง'),
          a1r: getVal(row, 'อ.1 ห้อง'),
          a2m: getVal(row, 'อ.2 ชาย'),
          a2f: getVal(row, 'อ.2 หญิง'),
          a2r: getVal(row, 'อ.2 ห้อง'),
          a3m: getVal(row, 'อ.3 ชาย'),
          a3f: getVal(row, 'อ.3 หญิง'),
          a3r: getVal(row, 'อ.3 ห้อง'),
          p1m: getVal(row, 'ป.1 ชาย'),
          p1f: getVal(row, 'ป.1 หญิง'),
          p1r: getVal(row, 'ป.1 ห้อง'),
          p2m: getVal(row, 'ป.2 ชาย'),
          p2f: getVal(row, 'ป.2 หญิง'),
          p2r: getVal(row, 'ป.2 ห้อง'),
          p3m: getVal(row, 'ป.3 ชาย'),
          p3f: getVal(row, 'ป.3 หญิง'),
          p3r: getVal(row, 'ป.3 ห้อง'),
          p4m: getVal(row, 'ป.4 ชาย'),
          p4f: getVal(row, 'ป.4 หญิง'),
          p4r: getVal(row, 'ป.4 ห้อง'),
          p5m: getVal(row, 'ป.5 ชาย'),
          p5f: getVal(row, 'ป.5 หญิง'),
          p5r: getVal(row, 'ป.5 ห้อง'),
          p6m: getVal(row, 'ป.6 ชาย'),
          p6f: getVal(row, 'ป.6 หญิง'),
          p6r: getVal(row, 'ป.6 ห้อง'),
          m1m: getVal(row, 'ม.1 ชาย'),
          m1f: getVal(row, 'ม.1 หญิง'),
          m1r: getVal(row, 'ม.1 ห้อง'),
          m2m: getVal(row, 'ม.2 ชาย'),
          m2f: getVal(row, 'ม.2 หญิง'),
          m2r: getVal(row, 'ม.2 ห้อง'),
          m3m: getVal(row, 'ม.3 ชาย'),
          m3f: getVal(row, 'ม.3 หญิง'),
          m3r: getVal(row, 'ม.3 ห้อง'),
          m4m: getVal(row, 'ม.4 ชาย'),
          m4f: getVal(row, 'ม.4 หญิง'),
          m4r: getVal(row, 'ม.4 ห้อง'),
          m5m: getVal(row, 'ม.5 ชาย'),
          m5f: getVal(row, 'ม.5 หญิง'),
          m5r: getVal(row, 'ม.5 ห้อง'),
          m6m: getVal(row, 'ม.6 ชาย'),
          m6f: getVal(row, 'ม.6 หญิง'),
          m6r: getVal(row, 'ม.6 ห้อง'),
          v1m: getVal(row, 'ปวช.1 ชาย'),
          v1f: getVal(row, 'ปวช.1 หญิง'),
          v1r: getVal(row, 'ปวช.1 ห้อง'),
          v2m: getVal(row, 'ปวช.2 ชาย'),
          v2f: getVal(row, 'ปวช.2 หญิง'),
          v2r: getVal(row, 'ปวช.2 ห้อง'),
          v3m: getVal(row, 'ปวช.3 ชาย'),
          v3f: getVal(row, 'ปวช.3 หญิง'),
          v3r: getVal(row, 'ปวช.3 ห้อง'),
        };

        if (existingSet.has(schoolCode)) {
          const { error } = await supabase
            .from('tbl_school_DMCdata')
            .update(payload)
            .eq('school_code8', schoolCode)
            .eq('education_year', yearEdu)
            .eq('education_section', dmcRound);
          if (error) throw error;
          updateCount += 1;
        } else {
          const { error } = await supabase
            .from('tbl_school_DMCdata')
            .insert([payload]);
          if (error) throw error;
          insertCount += 1;
        }

        const sumAll = getVal(row, 'รวมทั้งหมด');
        if (sumAll > 0) {
          const schoolSize = findSchoolSize(sumAll);
          await supabase
            .from('tbl_school')
            .update({ school_size: schoolSize })
            .eq('school_code8', schoolCode);
        }
      }

      await loadExisting();

      Swal.fire({
        title: 'นำเข้าข้อมูลสำเร็จ',
        html: `
          <div class="text-left py-2" style="font-size: 14px;">
            <div>• โรงเรียนทั้งหมด: <b>${totalRows}</b> โรงเรียน</div>
            <div>• เพิ่มข้อมูลใหม่: <b class="text-success">${insertCount}</b> โรงเรียน</div>
            <div>• อัปเดตข้อมูลเดิม: <b class="text-primary">${updateCount}</b> โรงเรียน</div>
          </div>
        `,
        icon: 'success'
      });
    } catch (err) {
      console.error(err);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถดึงข้อมูล DMC ได้: ' + err.message, 'error');
    } finally {
      setProcessing(false);
      setProgress({ current: 0, total: 0, text: '' });
    }
  };

  const handleRemove = async (eduYear, eduSec) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบข้อมูล?',
      html: `ต้องการลบข้อมูลสถิตินักเรียน DMC<br/>ปีการศึกษา <b>${eduYear}</b> รอบที่ <b>${eduSec}</b> ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      const { error } = await supabase
        .from('tbl_school_DMCdata')
        .delete()
        .eq('education_year', eduYear)
        .eq('education_section', eduSec);
      if (error) throw error;
      Swal.fire('สำเร็จ', `ลบข้อมูลปีการศึกษา ${eduYear} รอบที่ ${eduSec} เรียบร้อยแล้ว`, 'success');
      await loadExisting();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', `ไม่สามารถลบข้อมูลได้: ${err.message}`, 'error');
    }
  };

  if (loading) {
    return <LoadingSpinner title="ดึงข้อมูลนักเรียนจาก DMC" message="กำลังโหลดข้อมูล..." />;
  }

  return (
    <div className="container-fluid py-3">
      <div className="row">
        {/* Form Import Card */}
        <div className="col-lg-6 mb-4">
          <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white py-3 border-bottom">
              <h5 className="font-weight-bold mb-0 text-dark">
                <i className="fa-solid fa-cloud-arrow-down text-primary mr-2"></i> นำเข้าข้อมูลนักเรียนจาก DMC (BOPP API)
              </h5>
              <p className="text-muted small mb-0 mt-1">
                ดึงจำนวนนักเรียนรายชั้นเรียนและปรับขนาดสถานศึกษา (school_size) อัตโนมัติ
              </p>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="mb-3 col-6">
                    <label className="font-weight-bold small text-muted">ปีการศึกษา (พ.ศ.):</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="เช่น 2567"
                      value={yearEdu}
                      onChange={(e) => setYearEdu(e.target.value)}
                      required
                      disabled={processing}
                    />
                  </div>
                  <div className="mb-3 col-6">
                    <label className="font-weight-bold small text-muted">รอบการรายงาน:</label>
                    <select
                      className="form-control"
                      value={dmcRound}
                      onChange={(e) => setDmcRound(e.target.value)}
                      required
                      disabled={processing}
                    >
                      <option value="">-- เลือกรอบการรายงาน --</option>
                      <option value="1">10 มิถุนายน (รอบที่ 1)</option>
                      <option value="2">10 พฤศจิกายน (รอบที่ 2)</option>
                      <option value="3">30 เมษายน (รอบที่ 3)</option>
                    </select>
                  </div>
                </div>

                {processing && (
                  <div className="mb-3 p-3 bg-light rounded border">
                    <div className="d-flex justify-content-between align-items-center mb-1 small">
                      <span className="font-weight-bold text-primary">{progress.text}</span>
                      <span>{progress.total > 0 ? `${Math.round((progress.current / progress.total) * 100)}%` : ''}</span>
                    </div>
                    <div className="progress" style={{ height: '10px' }}>
                      <div
                        className="progress-bar progress-bar-striped progress-bar-animated bg-success"
                        role="progressbar"
                        style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '100%' }}
                      />
                    </div>
                  </div>
                )}

                <div className="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-secondary px-3"
                    onClick={() => navigate('/')}
                    disabled={processing}
                  >
                    กลับหน้าหลัก
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success font-weight-bold px-4"
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin mr-1"></i> กำลังนำเข้า...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-download mr-1"></i> เริ่มดึงข้อมูล DMC
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Existing DMC Records Card */}
        <div className="col-lg-6 mb-4">
          <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="font-weight-bold mb-0 text-dark">
                <i className="fa-solid fa-database text-info mr-2"></i> ข้อมูล DMC ในระบบ ({existingPairs.length} รอบ)
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th style={{ width: '50px' }} className="text-center">#</th>
                      <th>รอบปีการศึกษา</th>
                      <th style={{ width: '120px' }} className="text-center">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingPairs.map((row, index) => {
                      const roundLabel =
                        row.education_section === '1' ? '10 มิ.ย. (รอบที่ 1)' :
                        row.education_section === '2' ? '10 พ.ย. (รอบที่ 2)' :
                        row.education_section === '3' ? '30 เม.ย. (รอบที่ 3)' : `รอบที่ ${row.education_section}`;

                      return (
                        <tr key={`${row.education_year}-${row.education_section}`}>
                          <td className="text-center text-muted small">{index + 1}</td>
                          <td>
                            <div className="font-weight-bold text-dark">
                              ปีการศึกษา {row.education_year}
                            </div>
                            <div className="text-muted small">
                              {roundLabel}
                            </div>
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger px-2"
                              onClick={() => handleRemove(row.education_year, row.education_section)}
                              title="ลบข้อมูลรอบนี้"
                            >
                              <i className="fa-solid fa-trash-can mr-1"></i> ลบ
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {existingPairs.length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center py-4 text-muted">
                          ยังไม่มีข้อมูลนักเรียน DMC ในระบบ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportDMC;
