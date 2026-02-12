import React from 'react';
import SidebarRole from './SidebarRole';

const Sidebar = () => {
  return (
    <aside className="main-sidebar sidebar-dark-primary elevation-4 main-sidebar-custom">
      <a href="/" className="brand-link">
        <img src="/images/obec.png" alt="PNS2" className="brand-image img-circle elevation-3" style={{ opacity: '.8' }} />
        <span className="brand-text font-weight-light">PNS2</span>
      </a>

      <SidebarRole />
    </aside>
  );
};

export default Sidebar;
