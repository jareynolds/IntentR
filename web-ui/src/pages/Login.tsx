import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LoginTextSection {
  title: string;
  subtitle: string;
  text: string;
}

interface LoginConfig {
  aboveLogin: LoginTextSection;
  belowLogin: LoginTextSection;
}

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<LoginConfig | null>(null);
  const { login, loginWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();

  // Load login configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/configuration/login-config.json');
        if (response.ok) {
          const data: LoginConfig = await response.json();
          // Truncate text to 200 characters max
          if (data.aboveLogin?.text) {
            data.aboveLogin.text = data.aboveLogin.text.slice(0, 200);
          }
          if (data.belowLogin?.text) {
            data.belowLogin.text = data.belowLogin.text.slice(0, 200);
          }
          setConfig(data);
        }
      } catch (err) {
        console.warn('Failed to load login configuration:', err);
      }
    };
    loadConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleGoogleLogin = async (): Promise<void> => {
    setError(null);
    try {
      await loginWithGoogle();
      // User will be redirected to Google, so no need to navigate here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-8) var(--spacing-4)',
        background: 'var(--color-systemBackground-secondary)',
      }}
    >
      {/* Above Login Section */}
      {config?.aboveLogin && (config.aboveLogin.title || config.aboveLogin.subtitle || config.aboveLogin.text) && (
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
            marginBottom: 'var(--spacing-6)',
            textAlign: 'center',
          }}
        >
          {config.aboveLogin.title && (
            <h1
              style={{
                fontSize: '34px',
                lineHeight: '41px',
                fontWeight: 400,
                letterSpacing: '0.37px',
                color: 'var(--color-label)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              {config.aboveLogin.title}
            </h1>
          )}
          {config.aboveLogin.subtitle && (
            <h2
              style={{
                fontSize: '22px',
                lineHeight: '28px',
                fontWeight: 400,
                letterSpacing: '0.35px',
                color: 'var(--color-systemBlue)',
                marginBottom: 'var(--spacing-3)',
              }}
            >
              {config.aboveLogin.subtitle}
            </h2>
          )}
          {config.aboveLogin.text && (
            <p
              style={{
                fontSize: '15px',
                lineHeight: '20px',
                fontWeight: 400,
                letterSpacing: '-0.24px',
                color: 'var(--color-label-secondary)',
              }}
            >
              {config.aboveLogin.text}
            </p>
          )}
        </div>
      )}

      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '400px',
        }}
      >
        {/* Card Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            padding: 'var(--spacing-4)',
            paddingBottom: 0,
          }}
        >
          {/* Logo Icon */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-systemBlue)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            <svg
              style={{ width: '40px', height: '40px', color: 'white' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
          </div>

          {/* Welcome Title */}
          <h2
            style={{
              fontSize: '28px',
              lineHeight: '34px',
              fontWeight: 400,
              letterSpacing: '0.36px',
              color: 'var(--color-label)',
              textAlign: 'center',
            }}
          >
            Welcome to INTENTR
          </h2>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '15px',
              lineHeight: '20px',
              fontWeight: 400,
              letterSpacing: '-0.24px',
              color: 'var(--color-label-secondary)',
              textAlign: 'center',
            }}
          >
            Design-first development workflow management
          </p>
        </div>

        {/* Card Content */}
        <div
          className="card-content"
          style={{
            padding: 'var(--spacing-4)',
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-4)',
            }}
          >
            {/* Error Alert */}
            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-2)',
              }}
            >
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                type="email"
                className="input"
                id="email"
                placeholder="designer@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-2)',
              }}
            >
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                type="password"
                className="input"
                id="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Sign In Button */}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={isLoading}
              style={{ width: '100%' }}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Divider */}
            <div
              style={{
                position: 'relative',
                margin: 'var(--spacing-2) 0',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    borderTop: '1px solid var(--color-systemGray4)',
                  }}
                />
              </div>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    padding: '0 var(--spacing-2)',
                    fontSize: '13px',
                    lineHeight: '18px',
                    fontWeight: 400,
                    letterSpacing: '-0.08px',
                    color: 'var(--color-label-secondary)',
                    background: 'var(--color-systemBackground)',
                  }}
                >
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="btn btn-outline"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--spacing-3)',
              }}
            >
              <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>

            {/* Sign Up Link */}
            <div style={{ textAlign: 'center', marginTop: 'var(--spacing-2)' }}>
              <button
                type="button"
                className="btn btn-ghost"
              >
                Don't have an account? Sign up
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Below Login Section */}
      {config?.belowLogin && (config.belowLogin.title || config.belowLogin.subtitle || config.belowLogin.text) && (
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
            marginTop: 'var(--spacing-6)',
            textAlign: 'center',
          }}
        >
          {config.belowLogin.title && (
            <h3
              style={{
                fontSize: '22px',
                lineHeight: '28px',
                fontWeight: 400,
                letterSpacing: '0.35px',
                color: 'var(--color-label)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              {config.belowLogin.title}
            </h3>
          )}
          {config.belowLogin.subtitle && (
            <h4
              style={{
                fontSize: '17px',
                lineHeight: '22px',
                fontWeight: 600,
                letterSpacing: '-0.41px',
                color: 'var(--color-systemBlue)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              {config.belowLogin.subtitle}
            </h4>
          )}
          {config.belowLogin.text && (
            <p
              style={{
                fontSize: '15px',
                lineHeight: '20px',
                fontWeight: 400,
                letterSpacing: '-0.24px',
                color: 'var(--color-label-secondary)',
              }}
            >
              {config.belowLogin.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
