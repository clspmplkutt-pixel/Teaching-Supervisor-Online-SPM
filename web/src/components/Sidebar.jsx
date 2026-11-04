import React from 'react';
import { Link } from 'react-router-dom';
import SidebarRole from './SidebarRole';

const Sidebar = () => {
  return (
    <aside className="main-sidebar sidebar-dark-primary elevation-4 main-sidebar-custom no-print">
      {/* ── Brand Logo Header ── */}
      <Link to="/" className="brand-link d-flex align-items-center">
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            flexShrink: 0,
          }}
        >
          <img
            src="/images/obec.png"
            alt="LMSS"
            style={{ width: '28px', height: 'auto', objectFit: 'contain' }}
          />
        </div>
        <div className="brand-text d-flex flex-column" style={{ lineHeight: 1.2, minWidth: 0 }}>
          <div className="d-flex align-items-center gap-1">
            <span className="font-weight-bold text-white" style={{ fontSize: '1.05rem', letterSpacing: '0.3px' }}>
              LMSS Online
            </span>
            <span
              className="badge badge-primary font-weight-bold ml-1"
              style={{ fontSize: '9px', padding: '2px 5px', borderRadius: '6px' }}
            >
              v3.0
            </span>
          </div>
          <small style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            สพม.พิษณุโลก อุตรดิตถ์
          </small>
        </div>
      </Link>

      {/* ── Role-Based Navigation & User Profile ── */}
      <SidebarRole />
    </aside>
  );
};

export default Sidebar;
