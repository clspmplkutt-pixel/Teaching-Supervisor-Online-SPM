import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { roleModules, moduleLabels, moduleIcons } from '../config/roleModules';

const humanizeModule = (moduleName) => {
  const fromMap = moduleLabels[moduleName];
  if (fromMap) return fromMap;
  return moduleName
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
};

const getRoleId = (user) => {
  return user?.level_id || user?.user_metadata?.role || user?.role || 'teacher';
};

// List of suffixes that indicate a submenu/child page
const SUBMENU_SUFFIXES = [
  '_add', '_edit', '_remove', '_set',
  'Admin_Add', 'Admin_Edit', 'Admin_Chgpwd',
  '_scoring'
];

// Check if a module is a submenu page
const isSubmenuPage = (moduleName) => {
  return SUBMENU_SUFFIXES.some(suffix => moduleName.endsWith(suffix));
};

const SidebarRole = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const roleId = getRoleId(user);

  const modules = roleModules[roleId] || [];

  // Filter out 'info' and submenu pages
  const moduleLinks = modules.filter((m) =>
    m !== 'info' && !isSubmenuPage(m)
  );

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <div className="sidebar">
      <div className="form-inline">
        <div className="input-group" data-widget="sidebar-search">
          <input className="form-control form-control-sidebar" type="search" placeholder="Search" aria-label="Search" />
          <div className="input-group-append">
            <button className="btn btn-sidebar" type="button">
              <i className="fas fa-search fa-fw"></i>
            </button>
          </div>
        </div>
      </div>

      <nav className="mt-2">
        <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
          <li className="nav-item">
            <Link to="/" className={`nav-link ${isActive('/')}`}>
              <i className="nav-icon fas fa-home text-blue"></i>
              <p>หน้าหลัก</p>
            </Link>
          </li>

          {moduleLinks.map((moduleName) => (
            <li className="nav-item" key={moduleName}>
              <Link to={`/${moduleName}`} className={`nav-link ${isActive(`/${moduleName}`)}`}>
                <i className={`${moduleIcons[moduleName] || 'nav-icon far fa-circle'}`}></i>
                <p>{humanizeModule(moduleName) || moduleName}</p>
              </Link>
            </li>
          ))}

          <li className="nav-item mt-3">
            <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} className="nav-link">
              <i className="nav-icon fa-solid fa-arrow-right-from-bracket text-danger"></i>
              <p>ออกจากระบบ</p>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default SidebarRole;
