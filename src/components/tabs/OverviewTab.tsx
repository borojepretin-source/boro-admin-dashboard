'use client';

import { useEffect, useState } from 'react';
import { watchVouchers, watchTemplates, watchSessions, type Voucher, type Template, type Session } from '@/lib/api';

interface Stats {
  totalVouchers: number;
  activeVouchers: number;
  usedVouchers: number;
  totalTemplates: number;
  activeTemplates: number;
  todaySessions: number;
  totalSessions: number;
  totalPrinted: number;
}

export default function OverviewTab() {
  const [stats, setStats] = useState<Stats>({
    totalVouchers: 0, activeVouchers: 0, usedVouchers: 0,
    totalTemplates: 0, activeTemplates: 0,
    todaySessions: 0, totalSessions: 0, totalPrinted: 0,
  });
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(watchVouchers(
      (vouchers: Voucher[]) => {
        setStats(prev => ({
          ...prev,
          totalVouchers:  vouchers.length,
          activeVouchers: vouchers.filter(v => !v.is_used).length,
          usedVouchers:   vouchers.filter(v => v.is_used).length,
        }));
      },
      (err) => console.error('[Overview] Vouchers error:', err.message)
    ));

    unsubs.push(watchTemplates(
      (templates: Template[]) => {
        setStats(prev => ({
          ...prev,
          totalTemplates:  templates.length,
          activeTemplates: templates.filter(t => t.active).length,
        }));
      },
      (err) => console.error('[Overview] Templates error:', err.message)
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
            const ms = s.started_at?.toMillis();
            return ms ? ms >= todayTs : false;
          }).length,
          totalPrinted:  sessions.filter(s => s.printed).length,
        }));
        setRecentSessions(sessions.slice(0, 5));
      },
      (err) => console.error('[Overview] Sessions error:', err.message)
    ));

    return () => unsubs.forEach(fn => fn());
  }, []);

  const statCards = [
    { label: 'Voucher Aktif',     value: stats.activeVouchers, icon: '🎫', color: '#6C63FF', sub: `${stats.usedVouchers} sudah digunakan` },
    { label: 'Sesi Hari Ini',     value: stats.todaySessions,  icon: '📸', color: '#4FACFE', sub: `${stats.totalSessions} total sesi` },
    { label: 'Template Aktif',    value: stats.activeTemplates, icon: '🖼️', color: '#FF6B9D', sub: `${stats.totalTemplates} total template` },
    { label: 'Foto Dicetak',      value: stats.totalPrinted,   icon: '🖨️', color: '#4ADE80', sub: `dari ${stats.totalSessions} sesi` },
  ];

  return (
    <div>
      <div style={{ marginBottom:'2rem' }}>
        <h1 style={{ fontSize:'1.75rem', fontWeight:700, marginBottom:'0.25rem' }}>
          Ikhtisar <span className="gradient-text">Dashboard</span>
        </h1>
        <p style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>
          Monitoring real-time Boro Photo Booth
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
          📋 Sesi Terbaru
        </h2>
        {recentSessions.length === 0 ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>
            Belum ada sesi yang tercatat
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Voucher</th>
                <th>Email</th>
                <th>Waktu</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.map(s => (
                <tr key={s.id}>
                  <td>
                    <span style={{ fontFamily:'monospace', fontWeight:700, color:'white', background:'rgba(108,99,255,0.15)', padding:'0.2rem 0.5rem', borderRadius:'6px' }}>
                      {s.code || s.voucher_code || s.id.slice(0,6)}
                    </span>
                  </td>
                  <td>{s.email || <span style={{color:'var(--text-muted)'}}>—</span>}</td>
                  <td style={{ fontSize:'0.8rem' }}>
                    {s.started_at?.toDate
                      ? s.started_at.toDate().toLocaleString('id-ID', { dateStyle:'short', timeStyle:'short' })
                      : '—'}
                  </td>
                  <td>
                    <span className={`badge ${s.printed ? 'badge-green' : 'badge-amber'}`}>
                      {s.printed ? '✓ Dicetak' : '⏳ Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
