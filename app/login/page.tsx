'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, setAuthToken } from '@/lib/api';
import { clearToken, setToken } from '@/lib/storage';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('pm@example.com');
  const [password, setPassword] = useState('Pm12345');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ data: { token: string } }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setToken(res.data.token);
      setAuthToken(res.data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Email atau password salah');
      clearToken();
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');

        .nw-page {
          min-height: 100vh;
          display: flex;
          background: #0A0E1A;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        /* ── Left panel ── */
        .nw-left {
          flex: 1;
          background: linear-gradient(135deg, #0D1528 0%, #0A1A3A 50%, #071030 100%);
          padding: 48px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }
        .nw-grid-bg {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0, 160, 255, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 160, 255, 0.06) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }
        .nw-glow-1 {
          position: absolute;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 120, 255, 0.18) 0%, transparent 70%);
          top: -120px; right: -120px;
          pointer-events: none;
        }
        .nw-glow-2 {
          position: absolute;
          width: 240px; height: 240px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 200, 255, 0.1) 0%, transparent 70%);
          bottom: 60px; left: 40px;
          pointer-events: none;
        }
        .nw-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 1;
        }
        .nw-logo-icon {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #0078FF, #00C8FF);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .nw-logo-text {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.3px;
        }
        .nw-tagline {
          position: relative;
          z-index: 1;
        }
        .nw-tagline h2 {
          font-family: 'Syne', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: #fff;
          line-height: 1.2;
          margin: 0 0 12px;
        }
        .nw-tagline p {
          font-size: 15px;
          color: rgba(255,255,255,0.45);
          line-height: 1.7;
          margin: 0;
        }
        .nw-badges {
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative;
          z-index: 1;
        }
        .nw-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255,255,255,0.04);
          border: 0.5px solid rgba(0, 160, 255, 0.2);
          border-radius: 10px;
          padding: 12px 16px;
        }
        .nw-badge-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #00C8FF;
          flex-shrink: 0;
        }
        .nw-badge span {
          font-size: 13px;
          color: rgba(255,255,255,0.6);
        }

        /* ── Right panel (form) ── */
        .nw-right {
          width: 440px;
          background: #0F1623;
          padding: 48px 44px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border-left: 0.5px solid rgba(255,255,255,0.06);
        }
        .nw-form-header {
          margin-bottom: 32px;
        }
        .nw-form-header h1 {
          font-family: 'Syne', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 6px;
        }
        .nw-form-header p {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          margin: 0;
        }

        /* Error box */
        .nw-error {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(220, 50, 50, 0.1);
          border: 0.5px solid rgba(220, 50, 50, 0.35);
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 13px;
          color: #FF6B6B;
          margin-bottom: 20px;
        }

        /* Fields */
        .nw-field { margin-bottom: 18px; }
        .nw-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.6px;
          text-transform: uppercase;
          margin-bottom: 7px;
        }
        .nw-input-wrap { position: relative; }
        .nw-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.28);
          font-size: 16px;
          pointer-events: none;
        }
        .nw-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 0.5px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 13px 14px 13px 42px;
          font-size: 14px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: #fff;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s, background 0.15s;
        }
        .nw-input:focus {
          border-color: rgba(0, 160, 255, 0.6);
          background: rgba(0, 160, 255, 0.05);
        }
        .nw-input::placeholder { color: rgba(255,255,255,0.2); }
        .nw-eye-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          color: rgba(255,255,255,0.25);
          font-size: 16px;
          transition: color 0.15s;
        }
        .nw-eye-btn:hover { color: rgba(255,255,255,0.5); }

        .nw-forgot {
          text-align: right;
          margin-bottom: 22px;
        }
        .nw-forgot a {
          font-size: 12px;
          color: #0096FF;
          text-decoration: none;
        }
        .nw-forgot a:hover { text-decoration: underline; }

        /* Submit button */
        .nw-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #0078FF, #00C8FF);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.2px;
          position: relative;
          overflow: hidden;
          transition: opacity 0.15s;
        }
        .nw-btn:hover:not(:disabled) { opacity: 0.9; }
        .nw-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .nw-btn-shine {
          position: absolute;
          top: 0; left: -100%;
          width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          animation: nw-shine 2.5s infinite;
        }
        @keyframes nw-shine {
          0% { left: -100%; }
          60%, 100% { left: 150%; }
        }

        .nw-divider {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 22px 0;
        }
        .nw-divider-line {
          flex: 1;
          height: 0.5px;
          background: rgba(255,255,255,0.08);
        }
        .nw-divider span {
          font-size: 12px;
          color: rgba(255,255,255,0.25);
        }

        .nw-register {
          text-align: center;
          font-size: 13px;
          color: rgba(255,255,255,0.3);
        }
        .nw-register a {
          color: #0096FF;
          text-decoration: none;
        }
        .nw-register a:hover { text-decoration: underline; }

        /* Responsive */
        @media (max-width: 768px) {
          .nw-left { display: none; }
          .nw-right { width: 100%; padding: 32px 24px; }
        }
      `}</style>

      <main className='nw-page'>
        {/* Left branding panel */}
        <div className='nw-left'>
          <div className='nw-grid-bg' />
          <div className='nw-glow-1' />
          <div className='nw-glow-2' />

          <div className='nw-logo'>
            <div className='nw-logo-icon'>
              <svg width='20' height='20' viewBox='0 0 20 20' fill='none'>
                <path
                  d='M4 10L8.5 14.5L16 6'
                  stroke='white'
                  strokeWidth='2.2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </div>
            <span className='nw-logo-text'>Nodewave</span>
          </div>

          <div className='nw-tagline'>
            <h2>
              Project Management
              <br />
              yang Lebih Cerdas
            </h2>
            <p>
              Kelola tim, sprint, dan task
              <br />
              dalam satu platform terpadu.
            </p>
          </div>

          <div className='nw-badges'>
            {[
              'Kanban Board & Sprint Planner',
              'Real-time Team Collaboration',
            ].map((text) => (
              <div key={text} className='nw-badge'>
                <div className='nw-badge-dot' />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right form panel */}
        <div className='nw-right'>
          <div className='nw-form-header'>
            <h1>Masuk</h1>
            <p>Selamat datang kembali 👋</p>
          </div>

          {error && (
            <div className='nw-error' role='alert'>
              <svg
                width='16'
                height='16'
                viewBox='0 0 16 16'
                fill='none'
                aria-hidden='true'
              >
                <circle
                  cx='8'
                  cy='8'
                  r='7'
                  stroke='#FF6B6B'
                  strokeWidth='1.5'
                />
                <path
                  d='M8 5v3.5M8 10.5v.5'
                  stroke='#FF6B6B'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            <div className='nw-field'>
              <label className='nw-label' htmlFor='login-email'>
                Email
              </label>
              <div className='nw-input-wrap'>
                <svg
                  className='nw-input-icon'
                  width='16'
                  height='16'
                  viewBox='0 0 16 16'
                  fill='none'
                  aria-hidden='true'
                >
                  <rect
                    x='1'
                    y='3'
                    width='14'
                    height='10'
                    rx='2'
                    stroke='currentColor'
                    strokeWidth='1.3'
                  />
                  <path
                    d='M1 6l7 4.5L15 6'
                    stroke='currentColor'
                    strokeWidth='1.3'
                  />
                </svg>
                <input
                  id='login-email'
                  className='nw-input'
                  type='email'
                  placeholder='nama@perusahaan.com'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete='email'
                />
              </div>
            </div>

            <div className='nw-field'>
              <label className='nw-label' htmlFor='login-password'>
                Password
              </label>
              <div className='nw-input-wrap'>
                <svg
                  className='nw-input-icon'
                  width='16'
                  height='16'
                  viewBox='0 0 16 16'
                  fill='none'
                  aria-hidden='true'
                >
                  <rect
                    x='3'
                    y='7'
                    width='10'
                    height='7'
                    rx='1.5'
                    stroke='currentColor'
                    strokeWidth='1.3'
                  />
                  <path
                    d='M5 7V5a3 3 0 016 0v2'
                    stroke='currentColor'
                    strokeWidth='1.3'
                    strokeLinecap='round'
                  />
                </svg>
                <input
                  id='login-password'
                  className='nw-input'
                  type={showPassword ? 'text' : 'password'}
                  placeholder='Masukkan password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete='current-password'
                />
                <button
                  type='button'
                  className='nw-eye-btn'
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? 'Sembunyikan password' : 'Tampilkan password'
                  }
                >
                  {showPassword ? (
                    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
                      <path
                        d='M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z'
                        stroke='currentColor'
                        strokeWidth='1.3'
                      />
                      <circle
                        cx='8'
                        cy='8'
                        r='2'
                        stroke='currentColor'
                        strokeWidth='1.3'
                      />
                      <path
                        d='M2 2l12 12'
                        stroke='currentColor'
                        strokeWidth='1.3'
                        strokeLinecap='round'
                      />
                    </svg>
                  ) : (
                    <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
                      <path
                        d='M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z'
                        stroke='currentColor'
                        strokeWidth='1.3'
                      />
                      <circle
                        cx='8'
                        cy='8'
                        r='2'
                        stroke='currentColor'
                        strokeWidth='1.3'
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className='nw-forgot'>
              <a href='/forgot-password'>Lupa password?</a>
            </div>

            <button className='nw-btn' type='submit' disabled={loading}>
              <div className='nw-btn-shine' />
              {loading ? 'Memproses...' : 'Masuk ke Dashboard'}
            </button>
          </form>

          <div className='nw-divider'>
            <div className='nw-divider-line' />
            <span>atau</span>
            <div className='nw-divider-line' />
          </div>

          <div className='nw-register'>
            Belum punya akun? <a href='/register'>Daftar sekarang</a>
          </div>
        </div>
      </main>
    </>
  );
}
