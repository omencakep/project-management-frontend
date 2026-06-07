'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, setAuthToken } from '@/lib/api';
import { clearToken, getToken } from '@/lib/storage';

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    const token = getToken();
    setAuthToken(token);
    if (!token) return;
    apiFetch<{ data: any[] }>('/projects', { token }).then((res) => setProjects(res.data));
  }, []);

  return (
    <main className="container" style={{ padding: '32px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>Dashboard</h1>
        <button className="button secondary" onClick={() => { clearToken(); setAuthToken(null); }}>
          Logout
        </button>
      </div>
      <div className="grid">
        {projects.map((project) => (
          <div className="card" key={project.id} style={{ padding: 20 }}>
            <h3>{project.name}</h3>
            <p className="muted">{project.description}</p>
            <Link className="button" href={`/projects/${project.id}`}>Open board</Link>
          </div>
        ))}
      </div>
    </main>
  );
}
