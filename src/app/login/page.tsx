'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch {
      setError('Email atau password salah. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 30% 20%, rgba(108,99,255,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(79,172,254,0.08) 0%, transparent 60%), #070714',
      padding: '1.5rem',
    }}>
      {/* Decorative orbs */}
      <div style={{ position:'fixed', top:'-10%', left:'-10%', width:'500px', height:'500px', borderRadius:'50%', background:'radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'-10%', right:'-10%', width:'500px', height:'500px', borderRadius:'50%', background:'radial-gradient(circle, rgba(79,172,254,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />

      <div className="glass-card animate-fade-up" style={{ width:'100%', maxWidth:'420px', padding:'2.5rem' }}>
        {/* Logo area */}
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6C63FF, #4FACFE)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 0 40px rgba(108,99,255,0.4)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/>
              <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
            </svg>
          </div>
          <h1 style={{ fontSize:'1.5rem', fontWeight:700, marginBottom:'0.25rem' }}>
            <span className="gradient-text">Boro Admin</span>
          </h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>
            Dashboard Manajemen Photo Booth
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div>
            <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:'0.4rem' }}>
              Email Admin
            </label>
            <input
              id="admin-email"
              type="email"
              className="input-field"
              placeholder="admin@boro.id"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:'0.4rem' }}>
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            id="login-btn"
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width:'100%', justifyContent:'center', padding:'0.85rem', marginTop:'0.5rem', fontSize:'0.95rem' }}
          >
            {loading ? (
              <>
                <span style={{ width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid white', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }} />
                Masuk...
              </>
            ) : (
              <>🔐 Masuk ke Dashboard</>
            )}
          </button>
        </form>

        <div style={{ marginTop:'2rem', paddingTop:'1.5rem', borderTop:'1px solid var(--border)', textAlign:'center' }}>
          <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
            Hanya tersedia untuk Admin & Kasir
          </p>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
