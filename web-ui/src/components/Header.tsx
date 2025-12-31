import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HelpDrawer } from './HelpDrawer';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  onMobileMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onMobileMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%',
      borderBottom: '1px solid var(--color-secondary, #3b82f6)',
      backgroundColor: 'var(--color-primary, #1e3a8a)'
    }}>
      <div style={{ padding: '16px 30px' }} className="header-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Mobile hamburger menu button */}
            <button
              className="header-mobile-menu-btn"
              onClick={onMobileMenuClick}
              aria-label="Open navigation menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>

            <img
              src="/intentr-logo.svg"
              alt="IntentR Logo"
              style={{ width: '48px', height: '48px' }}
              className="header-logo"
            />
            <div className="header-title-group">
              <h1 style={{ color: '#FFFFFF', fontSize: '32px', fontWeight: 600, margin: 0 }} className="header-title">{title}</h1>
              {subtitle && (
                <p style={{ fontSize: '12px', color: '#FFFFFF', margin: 0 }} className="header-subtitle">{subtitle}</p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
              {user?.name || 'User'}
            </span>
            <button
              onClick={() => setIsHelpOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 500,
                color: '#FFFFFF',
                backgroundColor: 'transparent',
                border: 'none',
                height: '32px',
                width: '32px',
                borderRadius: 'var(--button-border-radius, 6px)',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-secondary, #3b82f6)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Help"
            >
              <svg
                style={{ width: '20px', height: '20px' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
            <button
              onClick={() => navigate('/settings')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 500,
                color: '#FFFFFF',
                backgroundColor: 'transparent',
                border: 'none',
                height: '32px',
                width: '32px',
                borderRadius: 'var(--button-border-radius, 6px)',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-secondary, #3b82f6)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Settings"
            >
              <svg
                style={{ width: '20px', height: '20px' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
            <button
              onClick={logout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 500,
                border: 'none',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                height: '32px',
                borderRadius: 'var(--button-border-radius, 6px)',
                padding: '0 12px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Help Drawer */}
      <HelpDrawer isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </header>

    <style>{`
      /* Mobile menu button - hidden on desktop */
      .header-mobile-menu-btn {
        display: none;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border: none;
        background: transparent;
        color: #FFFFFF;
        cursor: pointer;
        border-radius: 8px;
        transition: background 0.2s ease;
        margin-right: 4px;
      }

      .header-mobile-menu-btn:hover {
        background: var(--color-secondary, #3b82f6);
      }

      @media (max-width: 768px) {
        .header-mobile-menu-btn {
          display: flex;
        }

        .header-content {
          padding: 12px 16px !important;
        }

        .header-logo {
          width: 36px !important;
          height: 36px !important;
        }

        .header-title {
          font-size: 22px !important;
        }

        .header-subtitle {
          font-size: 10px !important;
        }

        /* Hide user name on mobile */
        .header-content > div > div:last-child > span:first-child {
          display: none;
        }
      }
    `}</style>
    </>
  );
};
