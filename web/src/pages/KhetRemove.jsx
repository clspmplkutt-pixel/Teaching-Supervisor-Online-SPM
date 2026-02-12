import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const KhetRemove = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('khet_code') || '';

  useEffect(() => {
    let mounted = true;
    const remove = async () => {
      try {
        const { error } = await supabase.from('tbl_khet').delete().eq('khet_code', code);
        if (error) throw error;
        Swal.fire('สำเร็จ', 'ลบข้อมูลแล้ว', 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'เกิดข้อผิดพลาดในการลบ', 'error');
      } finally {
        navigate('/khet');
      }
    };
    if (mounted && code) remove();
    return () => { mounted = false; };
  }, [code, navigate]);

  return (
    <div className="text-center p-4">
      <div className="spinner-border text-primary" role="status"></div>
      <p className="mt-2">กำลังลบข้อมูล...</p>
    </div>
  );
};

export default KhetRemove;
