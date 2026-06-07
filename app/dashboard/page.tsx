'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, setAuthToken } from '@/lib/api';
import { clearToken, getToken } from '@/lib/storage';

type Project = { id: string; name: string; description?: string | null };

// ── Type untuk user yang login ──
type Me = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  department?: string | null;
  isActive?: boolean;
  roles?: string[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // ── State user yang sedang login ──
  const [me, setMe] = useState<Me | null>(null);

  const PAGE_SIZE = 6;

  // ── Modal ──
  const [showModal, setShowModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    clientId: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  function openModal() {
    setCreateForm({ name: '', description: '', clientId: '' });
    setCreateError('');
    setCreateSuccess(false);
    setShowModal(true);
  }

  function closeModal() {
    if (createLoading) return;
    setShowModal(false);
  }

  async function loadProjects(token: string) {
    setLoading(true);
    setError('');
    const query = new URLSearchParams({
      take: String(PAGE_SIZE),
      skip: String((page - 1) * PAGE_SIZE),
    });
    if (search.trim()) query.set('search', search.trim());
    try {
      const res = await apiFetch<{ data: Project[]; total?: number }>(
        `/projects?${query.toString()}`,
        { token },
      );
      setProjects(res.data);
      setTotal(res.total ?? res.data.length);
    } catch (err: any) {
      setProjects([]);
      setError(err.message || 'Gagal memuat project');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setCreateLoading(true);
    setCreateError('');
    try {
      await apiFetch<{ data: Project }>('/projects', {
        method: 'POST',
        token,
        body: {
          name: createForm.name.trim(),
          description: createForm.description.trim() || undefined,
          clientId: createForm.clientId.trim() || undefined,
        },
      });
      setCreateSuccess(true);
      await loadProjects(token);
      setTimeout(() => setShowModal(false), 900);
    } catch (err: any) {
      setCreateError(err.message || 'Gagal membuat project');
    } finally {
      setCreateLoading(false);
    }
  }

  // ── Mount: fetch /users/me + projects ──
  useEffect(() => {
    const token = getToken();
    setAuthToken(token);
    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch profil user yang login
    apiFetch<{ data: Me }>('/users/me', { token })
      .then((res) => setMe(res.data))
      .catch(() => {}); // silent fallback — avatar tetap tampil dengan inisial email

    let active = true;
    setLoading(true);
    setError('');
    const query = new URLSearchParams({
      take: String(PAGE_SIZE),
      skip: String((page - 1) * PAGE_SIZE),
    });
    if (search.trim()) query.set('search', search.trim());
    apiFetch<{ data: Project[]; total?: number }>(
      `/projects?${query.toString()}`,
      { token },
    )
      .then((res) => {
        if (active) {
          setProjects(res.data);
          setTotal(res.total ?? res.data.length);
        }
      })
      .catch((err) => {
        if (active) {
          setProjects([]);
          setError(err.message || 'Gagal memuat project');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, router, search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (showModal) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showModal, createLoading]);

  function logout() {
    clearToken();
    setAuthToken(null);
    router.push('/login');
  }

  const hasNext = projects.length === PAGE_SIZE;
  const hasPrev = page > 1;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        .db-page{font-family:'Plus Jakarta Sans',sans-serif;background:#0A0E1A;min-height:100vh;display:flex;flex-direction:column;}
        .db-nav{background:#0D1222;border-bottom:0.5px solid rgba(255,255,255,0.07);padding:0 28px;height:58px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;position:sticky;top:0;z-index:10;}
        .db-nav-left{display:flex;align-items:center;gap:20px;}
        .db-logo{display:flex;align-items:center;gap:10px;}
        .db-logo-icon{width:30px;height:30px;background:linear-gradient(135deg,#0078FF,#00C8FF);border-radius:8px;display:flex;align-items:center;justify-content:center;}
        .db-logo-text{font-family:'Syne',sans-serif;font-size:17px;font-weight:800;color:#fff;}
        .db-nav-sep{width:0.5px;height:20px;background:rgba(255,255,255,0.1);}
        .db-breadcrumb{font-size:13px;font-weight:600;color:rgba(255,255,255,0.4);}
        .db-nav-right{display:flex;align-items:center;gap:8px;}
        .db-btn-ghost{background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.1);border-radius:7px;padding:7px 13px;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;display:flex;align-items:center;gap:6px;transition:background 0.15s,color 0.15s,border-color 0.15s;}
        .db-btn-ghost:hover{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.18);color:#fff;}
        .db-body{flex:1;padding:28px 28px 40px;display:flex;flex-direction:column;gap:22px;max-width:1200px;width:100%;margin:0 auto;}
        .db-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
        @media(max-width:640px){.db-stats{grid-template-columns:1fr;}}
        .db-stat{background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px;display:flex;align-items:center;gap:14px;}
        .db-stat-icon{width:38px;height:38px;border-radius:9px;background:rgba(0,120,255,0.14);border:0.5px solid rgba(0,160,255,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;color:#00A8FF;flex-shrink:0;}
        .db-stat-label{font-size:11px;font-weight:600;color:rgba(255,255,255,0.35);letter-spacing:0.5px;text-transform:uppercase;margin-bottom:4px;}
        .db-stat-value{font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#fff;line-height:1;}
        .db-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;}
        .db-search-wrap{position:relative;flex:1;max-width:320px;}
        .db-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.28);font-size:16px;pointer-events:none;}
        .db-search{width:100%;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 14px 10px 36px;font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;color:#fff;outline:none;transition:border-color 0.15s,background 0.15s;}
        .db-search:focus{border-color:rgba(0,160,255,0.5);background:rgba(0,160,255,0.04);}
        .db-search::placeholder{color:rgba(255,255,255,0.2);}
        .db-btn-primary{background:linear-gradient(135deg,#0078FF,#00C8FF);border:none;border-radius:8px;padding:10px 18px;font-size:13px;font-weight:700;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;display:flex;align-items:center;gap:7px;position:relative;overflow:hidden;transition:opacity 0.15s;text-decoration:none;}
        .db-btn-primary:hover{opacity:0.9;}
        .db-btn-primary:disabled{opacity:0.5;cursor:not-allowed;}
        .db-shine{position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);animation:db-shine 2.5s infinite;}
        @keyframes db-shine{0%{left:-100%}60%,100%{left:150%}}
        .db-section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
        .db-section-title{font-size:11px;font-weight:600;color:rgba(255,255,255,0.3);letter-spacing:0.7px;text-transform:uppercase;}
        .db-page-label{font-size:12px;color:rgba(255,255,255,0.3);}
        .db-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
        @media(max-width:900px){.db-grid{grid-template-columns:repeat(2,1fr);}}
        @media(max-width:560px){.db-grid{grid-template-columns:1fr;}}
        .db-card{background:#0D1628;border:0.5px solid rgba(255,255,255,0.07);border-radius:10px;padding:18px;display:flex;flex-direction:column;gap:10px;cursor:pointer;transition:border-color 0.15s,background 0.15s;position:relative;overflow:hidden;text-decoration:none;}
        .db-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#0078FF,#00C8FF);opacity:0;transition:opacity 0.15s;}
        .db-card:hover{border-color:rgba(0,160,255,0.3);background:#0F1A30;}
        .db-card:hover::before{opacity:1;}
        .db-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
        .db-card-icon{width:34px;height:34px;border-radius:8px;background:rgba(0,120,255,0.12);border:0.5px solid rgba(0,160,255,0.18);display:flex;align-items:center;justify-content:center;font-size:16px;color:#00A8FF;flex-shrink:0;}
        .db-card-badge{font-size:10px;font-weight:600;letter-spacing:0.4px;padding:3px 9px;border-radius:20px;text-transform:uppercase;white-space:nowrap;}
        .badge-active{background:rgba(0,200,100,0.12);color:#00D97A;border:0.5px solid rgba(0,200,100,0.2);}
        .db-card-name{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#fff;line-height:1.3;}
        .db-card-desc{font-size:12px;color:rgba(255,255,255,0.38);line-height:1.55;flex:1;}
        .db-card-footer{display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:0.5px solid rgba(255,255,255,0.06);}
        .db-card-cta{font-size:11px;font-weight:700;color:#0096FF;display:flex;align-items:center;gap:4px;transition:color 0.15s;}
        .db-card:hover .db-card-cta{color:#00C8FF;}
        .db-state{grid-column:1/-1;text-align:center;padding:48px 24px;color:rgba(255,255,255,0.22);font-size:13px;}
        .db-state svg{display:block;margin:0 auto 10px;opacity:0.3;}
        .db-error-bar{display:flex;align-items:center;gap:10px;background:rgba(220,50,50,0.08);border:0.5px solid rgba(220,50,50,0.25);border-radius:8px;padding:12px 16px;font-size:13px;color:#FF6B6B;}
        .db-pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;}
        .db-count{font-size:12px;color:rgba(255,255,255,0.28);}
        .db-page-btns{display:flex;gap:8px;}
        .db-page-btn{background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.1);border-radius:7px;padding:8px 16px;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;display:flex;align-items:center;gap:6px;transition:background 0.15s,color 0.15s;}
        .db-page-btn:hover:not(:disabled){background:rgba(255,255,255,0.08);color:#fff;}
        .db-page-btn:disabled{opacity:0.3;cursor:not-allowed;}
        @keyframes db-pulse{0%,100%{opacity:0.4}50%{opacity:0.7}}
        .db-skeleton{background:rgba(255,255,255,0.07);border-radius:8px;animation:db-pulse 1.6s ease-in-out infinite;}

        /* ── Modal ── */
        .modal-overlay{position:fixed;inset:0;z-index:100;background:rgba(5,8,18,0.82);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;animation:modal-fade-in 0.18s ease;}
        @keyframes modal-fade-in{from{opacity:0}to{opacity:1}}
        .modal-box{background:#0D1628;border:0.5px solid rgba(0,160,255,0.2);border-radius:14px;width:100%;max-width:440px;box-shadow:0 24px 80px rgba(0,0,0,0.7);animation:modal-slide-up 0.2s ease;overflow:hidden;}
        @keyframes modal-slide-up{from{transform:translateY(18px);opacity:0}to{transform:translateY(0);opacity:1}}
        .modal-topbar{height:3px;background:linear-gradient(90deg,#0078FF,#00C8FF,#00D97A);}
        .modal-header{display:flex;align-items:flex-start;justify-content:space-between;padding:20px 22px 0;gap:12px;}
        .modal-eyebrow{font-size:10px;font-weight:700;color:rgba(0,168,255,0.7);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:5px;}
        .modal-title{font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:#fff;line-height:1.2;}
        .modal-close{background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.1);border-radius:7px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.4);cursor:pointer;font-size:18px;line-height:1;transition:background 0.15s,color 0.15s;flex-shrink:0;}
        .modal-close:hover{background:rgba(255,255,255,0.1);color:#fff;}
        .modal-body{padding:18px 22px 22px;display:flex;flex-direction:column;gap:14px;}
        .modal-field{display:flex;flex-direction:column;gap:6px;}
        .modal-label{font-size:11px;font-weight:700;color:rgba(255,255,255,0.35);letter-spacing:0.5px;text-transform:uppercase;display:flex;align-items:center;gap:5px;}
        .modal-required{color:#FF6B6B;}
        .modal-input{background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 13px;font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;color:#fff;outline:none;transition:border-color 0.15s,background 0.15s;width:100%;box-sizing:border-box;}
        .modal-input:focus{border-color:rgba(0,160,255,0.5);background:rgba(0,160,255,0.04);}
        .modal-input::placeholder{color:rgba(255,255,255,0.2);}
        .modal-textarea{resize:vertical;min-height:78px;line-height:1.6;}
        .modal-hint{font-size:11px;color:rgba(255,255,255,0.25);line-height:1.5;}
        .modal-error{display:flex;align-items:center;gap:8px;background:rgba(220,50,50,0.08);border:0.5px solid rgba(220,50,50,0.22);border-radius:8px;padding:10px 13px;font-size:12px;color:#FF6B6B;}
        .modal-success{display:flex;align-items:center;gap:8px;background:rgba(0,200,100,0.08);border:0.5px solid rgba(0,200,100,0.22);border-radius:8px;padding:10px 13px;font-size:12px;color:#00D97A;}
        .modal-divider{height:0.5px;background:rgba(255,255,255,0.07);margin:2px 0;}
        .modal-footer{display:flex;gap:8px;}
        .modal-cancel{flex:1;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.1);border-radius:8px;padding:11px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.4);font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;transition:background 0.15s,color 0.15s;}
        .modal-cancel:hover:not(:disabled){background:rgba(255,255,255,0.08);color:#fff;}
        .modal-cancel:disabled{opacity:0.4;cursor:not-allowed;}
        .modal-submit{flex:2;background:linear-gradient(135deg,#0078FF,#00C8FF);border:none;border-radius:8px;padding:11px 18px;font-size:13px;font-weight:700;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;position:relative;overflow:hidden;transition:opacity 0.15s;}
        .modal-submit:hover:not(:disabled){opacity:0.9;}
        .modal-submit:disabled{opacity:0.5;cursor:not-allowed;}
        @keyframes modal-spin{to{transform:rotate(360deg)}}
        .modal-spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:modal-spin 0.7s linear infinite;flex-shrink:0;}

        /* ── Avatar menu ── */
        .db-avatar-wrap{position:relative;}
        .db-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#0078FF,#00C8FF);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;cursor:pointer;flex-shrink:0;border:1.5px solid transparent;transition:border-color 0.15s;user-select:none;}
        .db-avatar:hover{border-color:rgba(0,200,255,0.55);}
        .db-avatar-popover{position:absolute;top:calc(100% + 10px);right:0;background:#0D1628;border:0.5px solid rgba(0,160,255,0.2);border-radius:12px;padding:14px 16px;min-width:210px;box-shadow:0 16px 48px rgba(0,0,0,0.65);z-index:50;animation:pop-in 0.13s ease;}
        @keyframes pop-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .db-avatar-info{margin-bottom:10px;}
        .db-avatar-name{font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;}
        .db-avatar-email{font-size:11px;color:rgba(255,255,255,0.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:8px;}
        .db-avatar-role{display:inline-flex;align-items:center;gap:5px;background:rgba(0,120,255,0.12);border:0.5px solid rgba(0,160,255,0.22);border-radius:10px;padding:2px 10px;font-size:10px;font-weight:700;color:#00A8FF;letter-spacing:0.4px;text-transform:uppercase;}
        .db-avatar-divider{height:0.5px;background:rgba(255,255,255,0.07);margin:10px 0;}
        .db-avatar-logout{width:100%;background:rgba(255,60,60,0.07);border:0.5px solid rgba(255,60,60,0.18);border-radius:8px;padding:8px;font-size:12px;font-weight:700;color:#FF6B6B;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:background 0.15s;}
        .db-avatar-logout:hover{background:rgba(255,60,60,0.14);}
      `}</style>

      <div className='db-page'>
        {/* ── Modal ── */}
        {showModal && (
          <div
            className='modal-overlay'
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div
              className='modal-box'
              role='dialog'
              aria-modal='true'
              aria-labelledby='modal-title'
            >
              <div className='modal-topbar' />
              <div className='modal-header'>
                <div>
                  <div className='modal-eyebrow'>Project Management</div>
                  <div className='modal-title' id='modal-title'>
                    Buat Project Baru
                  </div>
                </div>
                <button
                  className='modal-close'
                  onClick={closeModal}
                  disabled={createLoading}
                  aria-label='Tutup'
                >
                  ×
                </button>
              </div>
              <div className='modal-body'>
                {createError && (
                  <div className='modal-error'>
                    <svg
                      width='14'
                      height='14'
                      viewBox='0 0 14 14'
                      fill='none'
                      aria-hidden='true'
                    >
                      <circle
                        cx='7'
                        cy='7'
                        r='6'
                        stroke='#FF6B6B'
                        strokeWidth='1.3'
                      />
                      <path
                        d='M7 4.5V7.5M7 9.5v.3'
                        stroke='#FF6B6B'
                        strokeWidth='1.3'
                        strokeLinecap='round'
                      />
                    </svg>
                    {createError}
                  </div>
                )}
                {createSuccess && (
                  <div className='modal-success'>
                    <svg
                      width='14'
                      height='14'
                      viewBox='0 0 14 14'
                      fill='none'
                      aria-hidden='true'
                    >
                      <circle
                        cx='7'
                        cy='7'
                        r='6'
                        stroke='#00D97A'
                        strokeWidth='1.3'
                      />
                      <path
                        d='M4.5 7l2 2 3-3.5'
                        stroke='#00D97A'
                        strokeWidth='1.3'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                    Project berhasil dibuat!
                  </div>
                )}
                <form
                  id='create-project-form'
                  onSubmit={handleCreateProject}
                  style={{ display: 'contents' }}
                >
                  <div className='modal-field'>
                    <label className='modal-label' htmlFor='proj-name'>
                      Nama Project <span className='modal-required'>*</span>
                    </label>
                    <input
                      id='proj-name'
                      className='modal-input'
                      placeholder='Contoh: Website Redesign Q3'
                      value={createForm.name}
                      onChange={(e) =>
                        setCreateForm((s) => ({ ...s, name: e.target.value }))
                      }
                      required
                      disabled={createLoading || createSuccess}
                      autoFocus
                    />
                  </div>
                  <div className='modal-field'>
                    <label className='modal-label' htmlFor='proj-desc'>
                      Deskripsi
                    </label>
                    <textarea
                      id='proj-desc'
                      className='modal-input modal-textarea'
                      placeholder='Jelaskan tujuan dan scope project ini...'
                      value={createForm.description}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          description: e.target.value,
                        }))
                      }
                      disabled={createLoading || createSuccess}
                    />
                    <span className='modal-hint'>
                      Opsional — tampil di card dashboard.
                    </span>
                  </div>
                  <div className='modal-field'>
                    <label className='modal-label' htmlFor='proj-client'>
                      Client ID
                    </label>
                    <input
                      id='proj-client'
                      className='modal-input'
                      placeholder='UUID client (opsional)'
                      value={createForm.clientId}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          clientId: e.target.value,
                        }))
                      }
                      disabled={createLoading || createSuccess}
                    />
                    <span className='modal-hint'>
                      Kosongkan jika belum ada client yang terhubung.
                    </span>
                  </div>
                </form>
                <div className='modal-divider' />
                <div className='modal-footer'>
                  <button
                    type='button'
                    className='modal-cancel'
                    onClick={closeModal}
                    disabled={createLoading}
                  >
                    Batal
                  </button>
                  <button
                    type='submit'
                    form='create-project-form'
                    className='modal-submit'
                    disabled={
                      createLoading || createSuccess || !createForm.name.trim()
                    }
                  >
                    {createLoading ? (
                      <>
                        <div className='modal-spinner' />
                        Menyimpan...
                      </>
                    ) : createSuccess ? (
                      '✓ Tersimpan!'
                    ) : (
                      <>
                        <svg
                          width='14'
                          height='14'
                          viewBox='0 0 14 14'
                          fill='none'
                          aria-hidden='true'
                        >
                          <path
                            d='M7 2v10M2 7h10'
                            stroke='white'
                            strokeWidth='2'
                            strokeLinecap='round'
                          />
                        </svg>
                        Buat Project
                        <div className='db-shine' />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Navbar ── */}
        <nav className='db-nav'>
          <div className='db-nav-left'>
            <div className='db-logo'>
              <div className='db-logo-icon'>
                <svg width='16' height='16' viewBox='0 0 16 16' fill='none'>
                  <path
                    d='M3 8l3.5 3.5L13 4'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </div>
              <span className='db-logo-text'>Nodewave</span>
            </div>
            <div className='db-nav-sep' />
            <span className='db-breadcrumb'>Dashboard</span>
          </div>
          <div className='db-nav-right'>
            <button className='db-btn-ghost' onClick={() => router.back()}>
              <svg
                width='14'
                height='14'
                viewBox='0 0 14 14'
                fill='none'
                aria-hidden='true'
              >
                <path
                  d='M9 2L4 7l5 5'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
              Kembali
            </button>
            <button className='db-btn-ghost' onClick={logout}>
              <svg
                width='14'
                height='14'
                viewBox='0 0 14 14'
                fill='none'
                aria-hidden='true'
              >
                <path
                  d='M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9 10l3-3-3-3M12 7H5'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
              Logout
            </button>

            {/* ── Avatar dengan data dari /users/me ── */}
            <AvatarMenu me={me} onLogout={logout} />
          </div>
        </nav>

        <div className='db-body'>
          <div className='db-stats'>
            <div className='db-stat'>
              <div className='db-stat-icon'>
                <svg
                  width='18'
                  height='18'
                  viewBox='0 0 18 18'
                  fill='none'
                  aria-hidden='true'
                >
                  <rect
                    x='1'
                    y='1'
                    width='6'
                    height='16'
                    rx='1.5'
                    stroke='currentColor'
                    strokeWidth='1.4'
                  />
                  <rect
                    x='11'
                    y='1'
                    width='6'
                    height='10'
                    rx='1.5'
                    stroke='currentColor'
                    strokeWidth='1.4'
                  />
                </svg>
              </div>
              <div>
                <div className='db-stat-label'>Total Project</div>
                <div className='db-stat-value'>{total || projects.length}</div>
              </div>
            </div>
            <div className='db-stat'>
              <div
                className='db-stat-icon'
                style={{
                  background: 'rgba(0,200,100,0.12)',
                  borderColor: 'rgba(0,200,100,0.2)',
                  color: '#00D97A',
                }}
              >
                <svg
                  width='18'
                  height='18'
                  viewBox='0 0 18 18'
                  fill='none'
                  aria-hidden='true'
                >
                  <circle
                    cx='9'
                    cy='9'
                    r='7.5'
                    stroke='currentColor'
                    strokeWidth='1.4'
                  />
                  <path
                    d='M6 9l2.5 2.5L12.5 6.5'
                    stroke='currentColor'
                    strokeWidth='1.4'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </div>
              <div>
                <div className='db-stat-label'>Aktif</div>
                <div className='db-stat-value'>{projects.length}</div>
              </div>
            </div>
            <div className='db-stat'>
              <div
                className='db-stat-icon'
                style={{
                  background: 'rgba(255,160,0,0.12)',
                  borderColor: 'rgba(255,160,0,0.2)',
                  color: '#FFB830',
                }}
              >
                <svg
                  width='18'
                  height='18'
                  viewBox='0 0 18 18'
                  fill='none'
                  aria-hidden='true'
                >
                  <circle
                    cx='9'
                    cy='9'
                    r='7.5'
                    stroke='currentColor'
                    strokeWidth='1.4'
                  />
                  <path
                    d='M9 5.5V9l2.5 2'
                    stroke='currentColor'
                    strokeWidth='1.4'
                    strokeLinecap='round'
                  />
                </svg>
              </div>
              <div>
                <div className='db-stat-label'>Halaman</div>
                <div className='db-stat-value'>{page}</div>
              </div>
            </div>
          </div>

          <div className='db-toolbar'>
            <div className='db-search-wrap'>
              <svg
                className='db-search-icon'
                width='15'
                height='15'
                viewBox='0 0 15 15'
                fill='none'
                aria-hidden='true'
              >
                <circle
                  cx='6.5'
                  cy='6.5'
                  r='5'
                  stroke='currentColor'
                  strokeWidth='1.3'
                />
                <path
                  d='M10.5 10.5L13 13'
                  stroke='currentColor'
                  strokeWidth='1.3'
                  strokeLinecap='round'
                />
              </svg>
              <input
                className='db-search'
                placeholder='Cari project...'
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <button className='db-btn-primary' onClick={openModal}>
              <div className='db-shine' />
              <svg
                width='14'
                height='14'
                viewBox='0 0 14 14'
                fill='none'
                aria-hidden='true'
              >
                <path
                  d='M7 2v10M2 7h10'
                  stroke='white'
                  strokeWidth='2'
                  strokeLinecap='round'
                />
              </svg>
              Project Baru
            </button>
          </div>

          <div>
            <div className='db-section-header'>
              <span className='db-section-title'>Semua Project</span>
              <span className='db-page-label'>Halaman {page}</span>
            </div>
            {error && (
              <div
                className='db-error-bar'
                role='alert'
                style={{ marginBottom: 12 }}
              >
                <svg
                  width='15'
                  height='15'
                  viewBox='0 0 15 15'
                  fill='none'
                  aria-hidden='true'
                >
                  <circle
                    cx='7.5'
                    cy='7.5'
                    r='6.5'
                    stroke='#FF6B6B'
                    strokeWidth='1.3'
                  />
                  <path
                    d='M7.5 4.5v3.5M7.5 10v.5'
                    stroke='#FF6B6B'
                    strokeWidth='1.3'
                    strokeLinecap='round'
                  />
                </svg>
                {error}
              </div>
            )}
            <div className='db-grid'>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className='db-card'
                    style={{ pointerEvents: 'none', gap: 10 }}
                  >
                    <div
                      className='db-skeleton'
                      style={{ height: 34, width: 34, borderRadius: 8 }}
                    />
                    <div
                      className='db-skeleton'
                      style={{ height: 16, width: '70%' }}
                    />
                    <div
                      className='db-skeleton'
                      style={{ height: 12, width: '90%' }}
                    />
                    <div
                      className='db-skeleton'
                      style={{ height: 12, width: '60%' }}
                    />
                  </div>
                ))}
              {!loading && !projects.length && !error && (
                <div className='db-state'>
                  <svg
                    width='40'
                    height='40'
                    viewBox='0 0 40 40'
                    fill='none'
                    aria-hidden='true'
                  >
                    <rect
                      x='5'
                      y='8'
                      width='30'
                      height='24'
                      rx='3'
                      stroke='white'
                      strokeWidth='1.5'
                    />
                    <path
                      d='M13 16h14M13 22h8'
                      stroke='white'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                    />
                  </svg>
                  Tidak ada project ditemukan
                </div>
              )}
              {!loading &&
                projects.map((project) => (
                  <Link
                    key={project.id}
                    className='db-card'
                    href={`/projects/${project.id}`}
                  >
                    <div className='db-card-top'>
                      <div className='db-card-icon'>
                        <svg
                          width='16'
                          height='16'
                          viewBox='0 0 16 16'
                          fill='none'
                          aria-hidden='true'
                        >
                          <rect
                            x='1'
                            y='1'
                            width='4'
                            height='14'
                            rx='1'
                            stroke='currentColor'
                            strokeWidth='1.3'
                          />
                          <rect
                            x='9'
                            y='1'
                            width='6'
                            height='9'
                            rx='1'
                            stroke='currentColor'
                            strokeWidth='1.3'
                          />
                        </svg>
                      </div>
                      <span className='db-card-badge badge-active'>Aktif</span>
                    </div>
                    <div className='db-card-name'>{project.name}</div>
                    {project.description && (
                      <div className='db-card-desc'>{project.description}</div>
                    )}
                    <div className='db-card-footer'>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.25)',
                        }}
                      >
                        Project #{project.id}
                      </span>
                      <span className='db-card-cta'>
                        Buka Board{' '}
                        <svg
                          width='12'
                          height='12'
                          viewBox='0 0 12 12'
                          fill='none'
                          aria-hidden='true'
                        >
                          <path
                            d='M2 6h8M7 3l3 3-3 3'
                            stroke='currentColor'
                            strokeWidth='1.4'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          />
                        </svg>
                      </span>
                    </div>
                  </Link>
                ))}
            </div>
          </div>

          <div className='db-pagination'>
            <span className='db-count'>
              {loading ? 'Memuat...' : `Menampilkan ${projects.length} project`}
            </span>
            <div className='db-page-btns'>
              <button
                className='db-page-btn'
                disabled={!hasPrev || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <svg
                  width='13'
                  height='13'
                  viewBox='0 0 13 13'
                  fill='none'
                  aria-hidden='true'
                >
                  <path
                    d='M8 2L4 6.5 8 11'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
                Sebelumnya
              </button>
              <button
                className='db-page-btn'
                disabled={!hasNext || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Selanjutnya
                <svg
                  width='13'
                  height='13'
                  viewBox='0 0 13 13'
                  fill='none'
                  aria-hidden='true'
                >
                  <path
                    d='M5 2l4 4.5-4 4.5'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════
// AvatarMenu — komponen terpisah agar state popover
// tidak menyebabkan re-render seluruh halaman
// ══════════════════════════════════════════════════════
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  PROJECT_MANAGER: 'Project Manager',
  CONTRIBUTOR: 'Contributor',
  CLIENT: 'Client',
};

function AvatarMenu({ me, onLogout }: { me: Me | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false);

  // Tutup popover saat klik di luar
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const el = document.getElementById('db-avatar-menu');
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Hitung inisial: prioritas firstName+lastName, fallback huruf pertama email
  const initials = me
    ? (() => {
        const f = me.firstName?.trim()[0] ?? '';
        const l = me.lastName?.trim()[0] ?? '';
        return f || l ? `${f}${l}`.toUpperCase() : me.email[0].toUpperCase();
      })()
    : '…';

  const displayName = me
    ? [me.firstName, me.lastName].filter(Boolean).join(' ').trim() || me.email
    : 'Memuat...';

  // Hanya ambil role pertama untuk label
  const primaryRole = me?.roles?.[0];

  return (
    <div id='db-avatar-menu' className='db-avatar-wrap'>
      <div
        className='db-avatar'
        title={displayName}
        onClick={() => setOpen((v) => !v)}
        role='button'
        aria-haspopup='true'
        aria-expanded={open}
        aria-label='Buka menu profil'
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        {initials}
      </div>

      {open && (
        <div className='db-avatar-popover' role='menu' aria-label='Menu profil'>
          <div className='db-avatar-info'>
            <div className='db-avatar-name'>{displayName}</div>
            <div className='db-avatar-email'>{me?.email ?? ''}</div>
            {primaryRole && (
              <span className='db-avatar-role'>
                {/* Bullet dot */}
                <svg
                  width='5'
                  height='5'
                  viewBox='0 0 5 5'
                  fill='none'
                  aria-hidden='true'
                >
                  <circle cx='2.5' cy='2.5' r='2.5' fill='#00A8FF' />
                </svg>
                {ROLE_LABELS[primaryRole] ?? primaryRole}
              </span>
            )}
          </div>
          <div className='db-avatar-divider' />
          <button
            className='db-avatar-logout'
            onClick={onLogout}
            role='menuitem'
          >
            <svg
              width='13'
              height='13'
              viewBox='0 0 13 13'
              fill='none'
              aria-hidden='true'
            >
              <path
                d='M4.5 2H3a1 1 0 00-1 1v7a1 1 0 001 1h1.5M8.5 9l2.5-2.5L8.5 4M11 6.5H5'
                stroke='currentColor'
                strokeWidth='1.4'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
