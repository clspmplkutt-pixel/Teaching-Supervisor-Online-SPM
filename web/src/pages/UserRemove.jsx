import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const UserRemove = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const peopleId = searchParams.get('people_id') || '';
  const userName = searchParams.get('user') || '';
  const from = searchParams.get('from') || searchParams.get('from_module') || '';

  useEffect(() => {
    let mounted = true;
    const remove = async () => {
      try {
        if (userName) {
          const { error } = await supabase.from('tbl_user').delete().eq('user', userName);
          if (error) throw error;
          Swal.fire('สำเร็จ', 'ลบข้อมูลแล้ว', 'success');
          navigate('/ManageUserAdmin');
          return;
        }
        if (peopleId) {
          const { error } = await supabase.from('tbl_Users').delete().eq('people_id', peopleId);
          if (error) throw error;
          Swal.fire('สำเร็จ', 'ลบข้อมูลแล้ว', 'success');
          navigate(`/${from || 'userteacher'}`);
          return;
        }
        Swal.fire('Error', 'ไม่พบข้อมูลสำหรับลบ', 'error');
        navigate(`/${from || ''}`);
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'เกิดข้อผิดพลาดในการลบ', 'error');
        navigate(`/${from || ''}`);
      }
    };
    if (mounted) remove();
    return () => { mounted = false; };
  }, [peopleId, userName, from, navigate]);

  return (
    <div className="text-center p-4">
      <div className="spinner-border text-primary" role="status"></div>
      <p className="mt-2">กำลังลบข้อมูล...</p>
    </div>
  );
};

export default UserRemove;
