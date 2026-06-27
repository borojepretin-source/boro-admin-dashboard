'use client';

import { useEffect, useState } from 'react';
import { watchSessions, type Session } from '@/lib/api';

export default function SessionsTab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [filterPrint, setFilterPrint] = useState<'all' | 'printed' | 'not_printed'>('all');

  useEffect(() => {
    return watchSessions(
      setSessions,
      (err) => console.error('[Sessions] Error reading sessions:', err.message)
    );
  }, []);

  const getDurationDisplay = (started?: any, finished?: any) => {
    if (!started || !finished) return '—';
    const startMs = typeof started.toMillis === 'function' ? started.toMillis() : new Date(started).getTime();
    const finishMs = typeof finished.toMillis === 'function' ? finished.toMillis() : new Date(finished).getTime();
    const diffMs = finishMs - startMs;
    if (diffMs <= 0) return '—';
    const totalSecs = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs}s`;
  };

  const filtered = sessions.filter(s => {
    // 1. Print filter
    const matchPrint = filterPrint === 'all' || (filterPrint === 'printed' ? s.printed : !s.printed);

    // 2. Date filter (Hari Ini, 7 Hari, 30 Hari, Semua)
    let matchDate = true;
    if (s.started_at) {
      const ms = typeof s.started_at?.toMillis === 'function' ? s.started_at.toMillis() : (s.started_at as unknown as { getTime: () => number })?.getTime?.() ?? 0;
      if (dateFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        matchDate = ms >= today.getTime();
      } else if (dateFilter === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        matchDate = ms >= sevenDaysAgo.getTime();
      } else if (dateFilter === '30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        matchDate = ms >= thirtyDaysAgo.getTime();
      }
    }

    // 3. Search filter (Kode, Email, Tanggal)
    const dateStr = s.started_at?.toDate
      ? s.started_at.toDate().toLocaleDateString('id-ID')
      : '';
    const matchSearch = !search
      || s.email?.toLowerCase().includes(search.toLowerCase())
      || s.code?.toUpperCase().includes(search.toUpperCase())
      || s.voucher_code?.toUpperCase().includes(search.toUpperCase())
      || dateStr.includes(search);

    return matchPrint && matchDate && matchSearch;
  });

  const handleDownload = (url: string, sessionId: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `boro_photo_${sessionId}.jpg`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Riwayat <span className="gradient-text">Sesi Foto</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Semua sesi yang telah dilakukan oleh pelanggan
        </p>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {/* Filters and Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Input */}
            <input
              className="input-field"
              placeholder="🔍 Cari Kode, Email, Tanggal (Tgl/Bln/Thn)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: '280px' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {filtered.length} sesi
            </span>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Date Filters */}
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>Tanggal:</span>
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: 'today', label: 'Hari Ini' },
                  { id: '7days', label: '7 Hari' },
                  { id: '30days', label: '30 Hari' }
                ] as const
              ).map(f => (
                <button
                  key={f.id}
                  className={dateFilter === f.id ? 'btn-primary' : 'btn-ghost'}
                  onClick={() => setDateFilter(f.id)}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Print Filters */}
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>Status Cetak:</span>
              {(['all', 'printed', 'not_printed'] as const).map(f => (
                <button
                  key={f}
                  className={filterPrint === f ? 'btn-primary' : 'btn-ghost'}
                  onClick={() => setFilterPrint(f)}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                >
                  {f === 'all' ? 'Semua' : f === 'printed' ? '🖨️ Dicetak' : '⏳ Belum'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Kode</th>
                <th>Tanggal</th>
                <th>Jam</th>
                <th>Status</th>
                <th>Template</th>
                <th>Jumlah Foto</th>
                <th>Email</th>
                <th>Print</th>
                <th>Durasi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const dateObj = s.started_at?.toDate ? s.started_at.toDate() : null;
                const tanggal = dateObj ? dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
                const jam = dateObj ? dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—';

                // Status styling
                let statusBadge = 'badge-blue';
                let statusText = 'STARTED';
                if (s.status === 'FINISHED') {
                  statusBadge = 'badge-green';
                  statusText = 'FINISHED';
                } else if (s.status === 'ABANDONED') {
                  statusBadge = 'badge-amber';
                  statusText = 'ABANDONED';
                }

                return (
                  <tr key={s.id}>
                    <td>
                      {s.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.photo_url}
                          alt="session"
                          style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }}
                        />
                      ) : (
                        <div style={{ width: '56px', height: '56px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                          📷
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'white', background: 'rgba(108,99,255,0.15)', padding: '0.2rem 0.5rem', borderRadius: '6px', letterSpacing: '0.1em' }}>
                        {s.code || s.voucher_code || '—'}
                      </span>
                    </td>
                    <td>{tanggal}</td>
                    <td>{jam}</td>
                    <td>
                      <span className={`badge ${statusBadge}`}>
                        {statusText}
                      </span>
                    </td>
                    <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.template_name || s.template_id || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {s.photo_count ?? 0}
                    </td>
                    <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.email || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      <span className={`badge ${s.printed ? 'badge-green' : 'badge-amber'}`}>
                        {s.printed ? 'Ya' : 'Tidak'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {getDurationDisplay(s.started_at, s.finished_at)}
                    </td>
                    <td>
                      {s.photo_url && (
                        <button
                          className="btn-ghost"
                          onClick={() => handleDownload(s.photo_url!, s.id)}
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                        >
                          ⬇️ Download
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Tidak ada sesi ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
