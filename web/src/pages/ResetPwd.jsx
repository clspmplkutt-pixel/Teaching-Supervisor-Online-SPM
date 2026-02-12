import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { encryptLegacyPassword } from '../utils/legacyCrypto';

const ResetPwd = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idParam = searchParams.get('id') || '';
  const fromModule = searchParams.get('from_module') || '';

  useEffect(() => {
    let mounted = true;
    const resetPwd = async () => {
      try {
        if (!idParam) {
          Swal.fire('Error', 'ไม่พบข้อมูลผู้ใช้งาน', 'error');
          navigate(`/${fromModule || ''}`);
          return;
        }
        const { data, error } = await supabase.from('tbl_Users').select('*').eq('id', idParam).maybeSingle();
        if (error) throw error;
        if (!data) {
          Swal.fire('Error', 'ไม่พบข้อมูลผู้ใช้งาน', 'error');
          navigate(`/${fromModule || ''}`);
          return;
        }
        const birthday = String(data.birthday || '').replace(/-/g, '');
        const encrypted = encryptLegacyPassword(birthday);
        const { error: updateError } = await supabase.from('tbl_Users').update({ passwd: encrypted }).eq('id', idParam);
        if (updateError) throw updateError;
        Swal.fire('สำเร็จ', 'Reset รหัสผ่านเรียบร้อย', 'success');
        navigate(`/${fromModule || ''}`);
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'ไม่สามารถรีเซ็ตรหัสผ่านได้', 'error');
        navigate(`/${fromModule || ''}`);
      }
    };
    if (mounted) resetPwd();
    return () => { mounted = false; };
  }, [idParam, fromModule, navigate]);

  return (
    <div className="text-center p-4">
      <div className="spinner-border text-primary" role="status"></div>
      <p className="mt-2">กำลังรีเซ็ตรหัสผ่าน...</p>
    </div>
  );
};

export default ResetPwd;
