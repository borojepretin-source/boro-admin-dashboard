'use client';

import { useEffect, useState } from 'react';
import {
  watchVouchers,
  generateVoucher,
  generateBulkVouchers,
  deleteVoucher,
  type Voucher,
} from '@/lib/api';

export default function VouchersTab() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [bulkCount, setBulkCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = watchVouchers(
      (vList) => {
        // Hanya tampilkan voucher yang belum terpakai (aktif)
        setVouchers(vList.filter(v => !v.is_used));
      },
      (err) => {
        if (err.message?.includes('permission')) {
          setError('Akses ditolak Firestore. Pastikan Anda sudah login sebagai admin.');
        } else {
          setError(`Gagal membaca vouchers: ${err.message}`);
        }
      }
    );
    return unsub;
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const code = await generateVoucher();
      setLastGenerated([code]);
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
      if (msg.includes('permission')) {
        setError('Akses ditolak. Pastikan akun Anda terdaftar di collection admins di Firestore.');
      } else {
        setError(`Gagal generate voucher: ${msg}`);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const codes = await generateBulkVouchers(bulkCount);
      setLastGenerated(codes);
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
      if (msg.includes('permission')) {
        setError('Akses ditolak. Pastikan akun Anda terdaftar di collection admins di Firestore.');
      } else {
        setError(`Gagal generate bulk voucher: ${msg}`);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Hapus voucher ${code}?`)) return;
    setLoading(true);
    setError(null);
    try {
      await deleteVoucher(code);
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
      if (msg.includes('permission')) {
        setError('Akses ditolak. Hanya admin yang dapat menghapus voucher.');
      } else {
        setError(`Gagal hapus voucher: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = vouchers.filter(v => {
    return !search || v.code.includes(search.toUpperCase());
  });

  return (
    <div>
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 style={{ fontSize:'1.75rem', fontWeight:700, marginBottom:'0.25rem' }}>
          Kelola <span className="gradient-text">Voucher</span>
        </h1>
        <p style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>
          Generate dan lihat kode 4-karakter untuk diberikan ke pelanggan kasir
        </p>
      </div>

      {/* Info notice auto-delete */}
      <div style={{
        marginBottom:'1.5rem',
        padding:'0.875rem 1.25rem',
        background:'rgba(108,99,255,0.08)',
        border:'1px solid rgba(108,99,255,0.25)',
        borderRadius:'var(--radius-md)',
        display:'flex',
        alignItems:'center',
        gap:'0.75rem',
        fontSize:'0.85rem',
        color:'var(--text-secondary)',
      }}>
        <span style={{ fontSize:'1.2rem' }}>ℹ️</span>
        <span>
          <strong>Otomatis Terhapus:</strong> Begitu voucher dimasukkan dan dipakai customer di kiosk, kode akan <strong>otomatis hilang</strong> dari daftar ini secara real-time. Catatan pemakaian tersimpan di menu <strong>Riwayat Sesi</strong>.
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          marginBottom:'1rem',
          padding:'0.875rem 1.25rem',
          background:'rgba(248,113,113,0.1)',
          border:'1px solid rgba(248,113,113,0.35)',
          borderRadius:'var(--radius-md)',
          color:'var(--danger)',
          fontSize:'0.85rem',
          display:'flex',
          alignItems:'flex-start',
          gap:'0.75rem',
        }}>
          <span style={{ flexShrink:0, marginTop:'1px' }}>⚠️</span>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--danger)', cursor:'pointer', flexShrink:0 }}
          >✕</button>
        </div>
      )}

      {/* Generator Panel */}
      <div className="glass-card" style={{ padding:'1.5rem', marginBottom:'1.5rem' }}>
        <h2 style={{ fontSize:'0.95rem', fontWeight:700, marginBottom:'1.25rem' }}>🎲 Generate Voucher Baru</h2>
        
        <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', alignItems:'flex-end' }}>
          {/* Single */}
          <div style={{ flex:'1', minWidth:'180px' }}>
            <button
              id="generate-single-btn"
              className="btn-primary"
              onClick={handleGenerate}
              disabled={generating}
              style={{ width:'100%', justifyContent:'center', padding:'0.75rem' }}
            >
              {generating ? '⏳ Generating...' : '✨ Generate 1 Voucher'}
            </button>
          </div>

          {/* Bulk */}
          <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
            <input
              type="number"
              className="input-field"
              min={2} max={50}
              value={bulkCount}
              onChange={e => setBulkCount(+e.target.value)}
              style={{ width:'80px', textAlign:'center' }}
            />
            <button
              id="generate-bulk-btn"
              className="btn-primary"
              onClick={handleBulkGenerate}
              disabled={generating}
              style={{ padding:'0.75rem 1.25rem' }}
            >
              {generating ? '⏳...' : `📦 Bulk (${bulkCount})`}
            </button>
          </div>
        </div>

        {/* Last generated preview */}
        {lastGenerated.length > 0 && (
          <div style={{ marginTop:'1.25rem', padding:'1rem', background:'rgba(108,99,255,0.08)', border:'1px solid rgba(108,99,255,0.25)', borderRadius:'var(--radius-md)' }}>
            <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'0.5rem' }}>
              ✅ Kode baru siap pakai (klik untuk salin):
            </p>
            <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
              {lastGenerated.map(code => (
                <button
                  key={code}
                  onClick={() => handleCopy(code)}
                  title="Klik untuk menyalin kode"
                  style={{
                    fontFamily:'monospace', fontWeight:700, fontSize:'1.1rem',
                    background: copiedCode === code ? 'rgba(74,222,128,0.2)' : 'linear-gradient(135deg, rgba(108,99,255,0.3), rgba(79,172,254,0.2))',
                    border: `1px solid ${copiedCode === code ? '#4ADE80' : 'rgba(108,99,255,0.4)'}`,
                    color: copiedCode === code ? '#4ADE80' : 'white',
                    padding:'0.4rem 0.85rem', borderRadius:'8px', letterSpacing:'0.15em',
                    cursor:'pointer', transition:'all 0.2s ease',
                  }}
                >
                  {code} {copiedCode === code ? '✓' : '📋'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Voucher Table */}
      <div className="glass-card" style={{ padding:'1.5rem' }}>
        <div style={{ display:'flex', gap:'1rem', marginBottom:'1.25rem', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between' }}>
          <input
            className="input-field"
            placeholder="🔍 Cari kode voucher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth:'240px' }}
          />
          <span style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>
            <strong>{filtered.length}</strong> voucher aktif tersedia
          </span>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Kode Voucher</th>
                <th>Status</th>
                <th>Waktu Dibuat</th>
                <th style={{ textAlign:'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.code}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                      <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:'1.2rem', letterSpacing:'0.15em', color:'white' }}>
                        {v.code}
                      </span>
                      <button
                        className="btn-ghost"
                        onClick={() => handleCopy(v.code)}
                        style={{ fontSize:'0.75rem', padding:'0.25rem 0.5rem' }}
                        title="Salin kode"
                      >
                        {copiedCode === v.code ? '✓ Tersalin' : '📋 Salin'}
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-green">
                      ✓ Aktif / Siap Pakai
                    </span>
                  </td>
                  <td style={{ fontSize:'0.85rem' }}>
                    {v.created_at?.toDate
                      ? v.created_at.toDate().toLocaleString('id-ID', { dateStyle:'medium', timeStyle:'short' })
                      : 'Baru saja'}
                  </td>
                  <td style={{ textAlign:'right' }}>
                    <button
                      className="btn-danger"
                      onClick={() => handleDelete(v.code)}
                      disabled={loading}
                      style={{ fontSize:'0.75rem', padding:'0.3rem 0.65rem' }}
                    >
                      🗑️ Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign:'center', padding:'2.5rem', color:'var(--text-muted)' }}>
                    Tidak ada voucher aktif. Silakan buat voucher baru dengan tombol di atas.
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
