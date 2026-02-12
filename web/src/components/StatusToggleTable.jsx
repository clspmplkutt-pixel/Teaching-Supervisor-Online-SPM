import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const StatusToggleTable = ({
  title,
  table,
  columns,
  statusField,
  idField = 'id',
  order = [],
}) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from(table).select('*');
      order.forEach((o) => {
        query = query.order(o.field, { ascending: o.ascending });
      });
      const { data, error } = await query;
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [table, order]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleStatus = async (row) => {
    const current = String(row[statusField]) === '1';
    const nextValue = current ? '0' : '1';
    try {
      await supabase.from(table).update({ [statusField]: nextValue }).eq(idField, row[idField]);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> {title}</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                    {statusField && <th>ใช้งาน</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const active = statusField ? String(row[statusField]) === '1' : false;
                    return (
                      <tr key={row[idField]}>
                        {columns.map((col) => (
                          <td key={col.key} className={col.align ? `text-${col.align}` : undefined}>
                            {col.render ? col.render(row) : row[col.key]}
                          </td>
                        ))}
                        {statusField && (
                          <td className="text-center">
                            <button type="button" className="btn btn-link p-0" onClick={() => toggleStatus(row)}>
                              {active
                                ? <i className="fa-solid fa-circle-check text-success fa-xl"></i>
                                : <i className="fa-solid fa-circle-xmark text-danger fa-xl"></i>}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length + (statusField ? 1 : 0)} className="text-center">
                        <h2 className="text-danger">ยังไม่มีข้อมูล</h2>
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
  );
};

export default StatusToggleTable;
