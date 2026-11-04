import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  roleModules,
  adminMenuGroups,
  moduleLabels,
  moduleIcons,
} from '../config/roleModules';
import { useNotificationContext } from '../contexts/NotificationContext';

const humanizeModule = (moduleName) => {
  if (moduleLabels[moduleName]) return moduleLabels[moduleName];
  return moduleName
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
};

const getRoleId = (user) =>
  user?.level_id || user?.user_metadata?.role || user?.role || 'teacher';

const SUBMENU_SUFFIXES = [
  '_add',
  '_edit',
  '_remove',
  '_set',
  'Admin_Add',
  'Admin_Edit',
  'Admin_Chgpwd',
  '_scoring',
  'statusplan_clip',
];

const isSubmenuPage = (moduleName) =>
  SUBMENU_SUFFIXES.some((suffix) => moduleName.endsWith(suffix));

const SidebarRole = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const notif = useNotificationContext();
  const roleId = getRoleId(user);

  const [searchQuery, setSearchQuery] = useState('');
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    adminMenuGroups.forEach((g) => {
      initial[g.id] = Boolean(g.defaultOpen);
    });
    return initial;
  });

  const closeMobileSidebar = () => {
    if (window.innerWidth < 992 && document.body.classList.contains('sidebar-open')) {
      document.body.classList.remove('sidebar-open');
      document.body.classList.add('sidebar-collapse');
    }
  };

  const getModuleBadgeCount = (moduleName) => {
    if (!notif) return 0;
    if (moduleName === 'statusplan') {
      return (notif.teacherRejectedCount || 0) + (notif.teacherNeedClipCount || 0);
    }
    if (moduleName === 'Plan_Check') {
      return roleId === 'directorschool'
        ? notif.directorPendingCount || 0
        : notif.committeePendingCount || 0;
    }
    if (moduleName === 'confirmUser') return notif.adminPendingUsersCount || 0;
    if (moduleName === 'approve_evaluator') return notif.adminPendingEvaluatorsCount || 0;
    return 0;
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/info';
    return location.pathname.toLowerCase() === path.toLowerCase();
  };

  const flatModules = useMemo(() => {
    const list = [...(roleModules[roleId] || [])];
    const isEvaluator = user?.is_evaluator || user?.user_metadata?.is_evaluator;
    if (isEvaluator && roleId !== 'supervision') {
      (roleModules.supervision || []).forEach((m) => {
        if (!list.includes(m)) list.push(m);
      });
    }
    return list.filter((m) => m !== 'info' && !isSubmenuPage(m));
  }, [roleId, user]);

  const trimmedQuery = searchQuery.trim().toLowerCase();

  const filteredFlatModules = useMemo(() => {
    if (!trimmedQuery) return flatModules;
    return flatModules.filter((m) => {
      const label = humanizeModule(m).toLowerCase();
      return label.includes(trimmedQuery) || m.toLowerCase().includes(trimmedQuery);
    });
  }, [flatModules, trimmedQuery]);

  const toggleGroup = (id) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderMenuLink = (moduleName, compact = false) => {
    const badgeCount = getModuleBadgeCount(moduleName);
    const active = isActive(`/${moduleName}`);
    return (
      <li className="nav-item" key={moduleName}>
        <Link
          to={`/${moduleName}`}
          onClick={closeMobileSidebar}
          className={`nav-link ${active ? 'active' : ''}`}
          style={compact ? { paddingLeft: '1.6rem', fontSize: '0.86rem' } : undefined}
        >
          <i className={moduleIcons[moduleName] || 'nav-icon far fa-circle'}></i>
          <p className="d-flex justify-content-between align-items-center" style={{ width: 'calc(100% - 2rem)' }}>
            <span className="text-truncate">{humanizeModule(moduleName)}</span>
            {badgeCount > 0 && (
              <span className="badge badge-danger ml-1" style={{ fontSize: '10px', borderRadius: '10px' }}>
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </p>
        </Link>
      </li>
    );
  };

  return (
    <div className="sidebar pt-2">
      {/* Live React Quick Search Filter */}
      <div className="px-2 mb-2">
        <div className="input-group input-group-sm">
          <input
            className="form-control form-control-sidebar"
            type="search"
            placeholder="ค้นหาเมนู..."
            aria-label="ค้นหาเมนู"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ borderRadius: '8px 0 0 8px' }}
          />
          <div className="input-group-append">
            <button
              className="btn btn-sidebar"
              type="button"
              onClick={() => searchQuery && setSearchQuery('')}
              style={{ borderRadius: '0 8px 8px 0' }}
              aria-label="ล้างคำค้นหา"
            >
              <i className={`fas ${searchQuery ? 'fa-times' : 'fa-search'} fa-fw`}></i>
            </button>
          </div>
        </div>
      </div>

      <nav className="mt-1 pb-4">
        <ul className="nav nav-pills nav-sidebar flex-column" role="menu">
          {/* Home Link */}
          {!trimmedQuery && (
            <li className="nav-item mb-1">
              <Link to="/" onClick={closeMobileSidebar} className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                <i className="nav-icon fa-solid fa-house-chimney text-info"></i>
                <p>หน้าหลัก (Dashboard)</p>
              </Link>
            </li>
          )}

          {/* Admin Categorized Accordion vs Standard Role Menu */}
          {roleId === 'admin' && !trimmedQuery ? (
            adminMenuGroups.map((group) => {
              const hasActiveChild = group.items.some((m) => isActive(`/${m}`));
              const isOpen = openGroups[group.id] || hasActiveChild;
              const groupBadge = group.items.reduce((sum, m) => sum + getModuleBadgeCount(m), 0);

              return (
                <li key={group.id} className={`nav-item ${isOpen ? 'menu-open' : ''} mb-1`}>
                  <a
                    href={`#group-${group.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleGroup(group.id);
                    }}
                    className="nav-link d-flex align-items-center justify-content-between"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      color: '#e2e8f0',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                    }}
                  >
                    <span className="text-truncate">
                      <i className={`nav-icon ${group.icon} mr-2`}></i>
                      {group.title}
                    </span>
                    <span className="d-inline-flex align-items-center">
                      {groupBadge > 0 && (
                        <span className="badge badge-warning text-dark mr-2" style={{ fontSize: '10px' }}>
                          {groupBadge}
                        </span>
                      )}
                      <i
                        className={`fas fa-angle-${isOpen ? 'down' : 'left'}`}
                        style={{ fontSize: '11px', opacity: 0.75 }}
                      ></i>
                    </span>
                  </a>
                  {isOpen && (
                    <ul className="nav nav-treeview d-block pl-1 mt-1">
                      {group.items.map((m) => renderMenuLink(m, true))}
                    </ul>
                  )}
                </li>
              );
            })
          ) : filteredFlatModules.length === 0 ? (
            <li className="px-3 py-3 text-center text-muted small">ไม่พบเมนูที่ค้นหา</li>
          ) : (
            filteredFlatModules.map((m) => renderMenuLink(m, false))
          )}

          <li className="nav-item mt-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <a
              href="#logout"
              onClick={(e) => {
                e.preventDefault();
                logout();
              }}
              className="nav-link text-danger"
            >
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
