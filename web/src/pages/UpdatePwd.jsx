import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { encryptLegacyPassword } from '../utils/legacyCrypto';

const UpdatePwd = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('กำลังอัปเดตรหัสผ่าน...');

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const { data, error } = await supabase.from('tbl_Users').select('id, birthday');
        if (error) throw error;
        for (const row of data || []) {
          const birthday = String(row.birthday || '').replace(/-/g, '');
          if (!birthday) continue;
          const encrypted = encryptLegacyPassword(birthday);
          await supabase.from('tbl_Users').update({ passwd: encrypted }).eq('id', row.id);
        }
        if (!mounted) return;
        setStatus('อัปเดตรหัสผ่านเรียบร้อย');
        Swal.fire('สำเร็จ', 'อัปเดตรหัสผ่านเรียบร้อย', 'success');
        navigate('/');
      } catch (err) {
        console.error(err);
        if (mounted) {
          setStatus('เกิดข้อผิดพลาด');
          Swal.fire('Error', 'ไม่สามารถอัปเดตรหัสผ่านได้', 'error');
        }
      }
    };
    run();
    return () => { mounted = false; };
  }, [navigate]);

  return (
    <div className="text-center p-4">
      <div className="spinner-border text-primary" role="status"></div>
      <p className="mt-2">{status}</p>
    </div>
  );
};

export default UpdatePwd;
