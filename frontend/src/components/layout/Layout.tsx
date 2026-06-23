import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useLCStore } from '../../store/lcStore';
import { Toast } from './Toast';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLC, isSaving, lastSaved, error, clearError, createNewLC } = useLCStore();

  const handleNewLC = async () => {
    const id = await createNewLC();
    navigate(`/lc/${id}/step/1`);
  };

  const isOnLC = location.pathname.includes('/lc/');
  const lcId = currentLC?.id;

  const navToStep = (step: number) => {
    if (lcId && currentLC && currentLC.currentStep >= step) {
      navigate(`/lc/${lcId}/step/${step}`);
    }
  };

  const currentStep = (() => {
    const m = location.pathname.match(/\/step\/(\d)/);
    return m ? parseInt(m[1]) : 0;
  })();

  return (
    <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-mark">C</span>
          {!sidebarCollapsed && <span className="sidebar-logo-text">CitiDirect</span>}
        </div>

        {!sidebarCollapsed && (
          <nav className="sidebar-nav">
            <div className="sidebar-section-label">Trade Finance</div>
            <a
              className={`sidebar-link${!isOnLC ? ' active' : ''}`}
              onClick={() => navigate('/')}
            >
              <span className="sidebar-link-icon">☰</span>
              LC Applications
            </a>
            {isOnLC && currentLC && (
              <>
                <div className="sidebar-section-label" style={{ marginTop: 16 }}>Current Application</div>
                <div className="sidebar-lc-ref">{currentLC.applicationRef}</div>
                {[1,2,3,4,5].map(s => (
                  <a
                    key={s}
                    className={`sidebar-link sidebar-step-link${currentStep === s ? ' active' : ''}${currentLC.currentStep < s ? ' disabled' : ''}`}
                    onClick={() => navToStep(s)}
                  >
                    <span className="sidebar-step-num">{s}</span>
                    {['Setup & Parties','Goods & Docs','Payment','Pre-Validation','Review & Submit'][s-1]}
                  </a>
                ))}
              </>
            )}
          </nav>
        )}

        <button
          className="sidebar-collapse-btn"
          onClick={() => setSidebarCollapsed(c => !c)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? '›' : '‹'}
        </button>
      </aside>

      <div className="main-area">
        <header className="top-header">
          <div className="header-left">
            {isOnLC && currentLC && (
              <div className="header-breadcrumb">
                <span onClick={() => navigate('/')} style={{ cursor: 'pointer', opacity: 0.7 }}>LC Applications</span>
                <span style={{ margin: '0 8px', opacity: 0.4 }}>/</span>
                <span>{currentLC.applicationRef}</span>
              </div>
            )}
          </div>
          <div className="header-right">
            {isSaving && <span className="pill pill-info">Saving…</span>}
            {lastSaved && !isSaving && (
              <span style={{ fontSize: 12, opacity: 0.6, color: 'var(--chrome-soft)' }}>
                Saved {new Date(lastSaved).toLocaleTimeString()}
              </span>
            )}
            {!isOnLC && (
              <button className="btn btn-primary btn-sm" onClick={handleNewLC}>
                + New LC Application
              </button>
            )}
            <div className="header-avatar">HU</div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {error && <Toast message={error} onClose={clearError} />}
    </div>
  );
}
