import Link from 'next/link';

export default function Home() {
  return (
    <main className="container" style={{ padding: '32px 0' }}>
      <div className="card" style={{ padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>NodeWave PM</h1>
        <p className="muted">Login, lihat project, dan buka board task.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <Link className="button" href="/login">Login</Link>
          <Link className="button secondary" href="/dashboard">Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
