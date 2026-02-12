import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const SchoolRemove = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get('school_id') || '';

  useEffect(() => {
    let mounted = true;
    const remove = async () => {
      try {
        const { error } = await supabase.from('tbl_school').delete().eq('school_id', schoolId);
        if (error) throw error;
        Swal.fire('สำเร็จ', 'ลบข้อมูลแล้ว', 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'เกิดข้อผิดพลาดในการลบ', 'error');
      } finally {
        navigate('/school');
      }
    };
    if (mounted && schoolId) remove();
    return () => { mounted = false; };
  }, [schoolId, navigate]);

  return (
    <div className="text-center p-4">
      <div className="spinner-border text-primary" role="status"></div>
      <p className="mt-2">กำลังลบข้อมูล...</p>
    </div>
  );
};

export default SchoolRemove;
