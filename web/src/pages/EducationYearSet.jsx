import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const EducationYearSet = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '';

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        await supabase.from('tbl_education_year').update({ active: '0' }).eq('active', '1');
        const { error } = await supabase.from('tbl_education_year').update({ active: '1' }).eq('id', id);
        if (error) throw error;
        Swal.fire('สำเร็จ', 'ตั้งค่าปีการศึกษาแล้ว', 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'เกิดข้อผิดพลาด', 'error');
      } finally {
        navigate('/education_year');
      }
    };
    if (mounted && id) run();
    return () => { mounted = false; };
  }, [id, navigate]);

  return (
    <div className="text-center p-4">
      <div className="spinner-border text-primary" role="status"></div>
      <p className="mt-2">กำลังตั้งค่า...</p>
    </div>
  );
};

export default EducationYearSet;
