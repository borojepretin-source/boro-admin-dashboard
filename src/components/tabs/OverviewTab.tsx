'use client';

import { useEffect, useState } from 'react';
import { watchVouchers, watchSessions, type Voucher, type Session } from '@/lib/api';

interface Stats {
  activeVouchers: number;
  todaySessions: number;
  totalSessions: number;
  totalPrinted: number;
}

export default function OverviewTab() {
  const [stats, setStats] = useState<Stats>({
    activeVouchers: 0,
    todaySessions: 0,
    totalSessions: 0,
    totalPrinted: 0,
  });
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(watchVouchers(
      (vouchers: Voucher[]) => {
        setStats(prev => ({
          ...prev,
          activeVouchers: vouchers.length,
        }));
      },
      (err) => console.error('[Overview] Vouchers error:', err.message)
    ));

    unsubs.push(watchSessions(
      (sessions: Session[]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTs = today.getTime();
        setStats(prev => ({
          ...prev,
          totalSessions: sessions.length,
          todaySessions: sessions.filter(s => {
            const ms = s.started_at?.toMillis ? s.started_at.toMillis() : (s.started_at as any)?.getTime?.() ?? 0;
            return ms >= todayTs;
          }).length,
          totalPrinted: sessions.filter(s => s.printed).length,
        }));
        setRecentSessions(sessions.slice(0, 5));
      },
      (err) => console.error('[Overview] Sessions error:', err.message)
    ));

    return () => unsubs.forEach(fn => fn());
  }, []);

  const statCards = [
    { label: 'Voucher Tersedia', value: stats.activeVouchers, icon: '🎫', color: '#6C63FF', sub: 'siap digunakan' },
    { label: 'Sesi Hari Ini',    value: stats.todaySessions,  icon: '📸', color: '#4FACFE', sub: 'pelanggan hari ini' },
    { label: 'Total Sesi',        value: stats.totalSessions,  icon: '🗂️', color: '#FF6B9D', sub: 'sesi tersimpan (maks 30 hari)' },
    { label: 'Foto Dicetak',     value: stats.totalPrinted,   icon: '🖨️', color: '#4ADE80', sub: `dari ${stats.totalSessions} sesi` },
  ];

  return (
    <div>
      <div style={{ marginBottom:'2rem' }}>
        <h1 style={{ fontSize:'1.75rem', fontWeight:700, marginBottom:'0.25rem' }}>
          Ikhtisar <span className="gradient-text">Dashboard</span>
        </h1>
        <p style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>
          Monitoring real-time operasional Boro Photo Booth
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1rem', marginBottom:'2rem' }}>
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <p style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'0.5rem' }}>
                  {s.label}
                </p>
                <p style={{ fontSize:'2.5rem', fontWeight:800, color:'white', lineHeight:1, marginBottom:'0.4rem' }}>
                  {s.value}
                </p>
                <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{s.sub}</p>
              </div>
              <div style={{
                width:'48px', height:'48px', borderRadius:'12px',
                background:`rgba(${s.color === '#6C63FF' ? '108,99,255' : s.color === '#4FACFE' ? '79,172,254' : s.color === '#FF6B9D' ? '255,107,157' : '74,222,128'},0.15)`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem',
              }}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Sessions */}
      <div className="glass-card" style={{ padding:'1.5rem' }}>
        <h2 style={{ fontSize:'1rem', fontWeight:700, marginBottom:'1.25rem', color:'var(--text-primary)' }}>
          📋 Sesi Terbaru (Live)
        </h2>

        {recentSessions.length === 0 ? (
          <p style={{ color:'var(--text-muted)', fontSize:'0.875rem', textAlign:'center', padding:'2rem 0' }}>
            Belum ada sesi hari ini
          </p>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Kode Voucher</th>
                  <th>Waktu</th>
                  <th>Status</th>
                  <th>Email</th>
                  <th>Cetak</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s) => {
                  const date = s.started_at?.toDate ? s.started_at.toDate() : null;
                  const timeStr = date ? date.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }) : '—';
                  return (
                    <tr key={s.id}>
                      <td>
                        {s.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.photo_url}
                            alt="session"
                            style={{ width:'40px', height:'40px', objectFit:'cover', borderRadius:'6px' }}
                          />
                        ) : (
                          <div style={{ width:'40px', height:'40px', borderRadius:'6px', background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem' }}>
                            📸
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontFamily:'monospace', fontWeight:700, color:'white', background:'rgba(108,99,255,0.15)', padding:'0.2rem 0.5rem', borderRadius:'6px' }}>
                          {s.code || s.voucher_code || '—'}
                        </span>
                      </td>
                      <td>{timeStr}</td>
                      <td>
                        <span className={`badge ${s.status === 'FINISHED' ? 'badge-green' : 'badge-blue'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {s.email || '—'}
                      </td>
                      <td>
                        <span className={`badge ${s.printed ? 'badge-green' : 'badge-amber'}`}>
                          {s.printed ? 'Ya' : 'Tidak'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
