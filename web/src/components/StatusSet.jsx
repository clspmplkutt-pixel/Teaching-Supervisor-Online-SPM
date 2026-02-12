import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const StatusSet = ({
  table,
  idField = 'id',
  statusField,
  statusParam = 'status',
  redirectTo = '/',
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '';
  const status = searchParams.get(statusParam);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const { error } = await supabase.from(table).update({ [statusField]: status }).eq(idField, id);
        if (error) throw error;
        Swal.fire('สำเร็จ', 'บันทึกข้อมูลแล้ว', 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'เกิดข้อผิดพลาด', 'error');
      } finally {
        navigate(redirectTo);
      }
    };
    if (mounted && id) run();
    return () => { mounted = false; };
  }, [id, status, table, statusField, idField, redirectTo, navigate]);

  return (
    <div className="text-center p-4">
      <div className="spinner-border text-primary" role="status"></div>
      <p className="mt-2">กำลังตั้งค่า...</p>
    </div>
  );
};

export default StatusSet;
