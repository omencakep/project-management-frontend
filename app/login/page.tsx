'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, setAuthToken } from '@/lib/api';
import { clearToken, setToken } from '@/lib/storage';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('pm@example.com');
  const [password, setPassword] = useState('Pm12345');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await apiFetch<{ data: { token: string } }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setToken(res.data.token);
      setAuthToken(res.data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login gagal');
      clearToken();
      setAuthToken(null);
    }
  }

  return (
    <main className="container" style={{ padding: '32px 0' }}>
      <form className="card" onSubmit={submit} style={{ padding: 24, maxWidth: 420 }}>
        <h1>Login</h1>
        <div className="grid">
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}
          <button className="button">Masuk</button>
        </div>
      </form>
    </main>
  );
}
