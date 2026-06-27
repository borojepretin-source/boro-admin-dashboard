'use client';

import { useEffect, useState, useRef, FormEvent } from 'react';
import { getSettings, updateSettings, uploadLogo, type SystemSettings } from '@/lib/api';

const PRINT_SIZE_OPTIONS = ['4R', 'A5', 'A4'];

export default function SettingsTab() {
  const [settings, setSettings] = useState<SystemSettings>({
    session_duration: 600,
    inactivity_timeout: 120,
    logo_url: '',
    booth_name: 'Boro Photo Booth',
    photo_count: 4,
    print_size: '4R',
    email_enabled: true,
    printer_enabled: true,
    auto_detect_camera: true,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [msg, setMsg] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSettings().then(s => {
      setSettings(s);
      if (s.logo_url) setLogoPreview(s.logo_url);
    });
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await updateSettings(settings);
      setMsg('✅ Pengaturan berhasil disimpan dan langsung aktif di semua perangkat!');
    } catch {
      setMsg('❌ Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setMsg('⏳ Mengupload logo...');
    try {
      const url = await uploadLogo(file);
      setSettings(prev => ({ ...prev, logo_url: url }));
      setLogoPreview(url);
      setMsg('✅ Logo berhasil diperbarui!');
    } catch {
      setMsg('❌ Gagal upload logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const fmtSeconds = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m} menit ${sec > 0 ? `${sec} detik` : ''}`.trim();
  };

  const ToggleSwitch = ({ value, onChange, id }: { value: boolean; onChange: (v: boolean) => void; id: string }) => (
    <button
      id={id}
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: '52px', height: '28px', borderRadius: '14px',
        background: value ? 'linear-gradient(135deg, #6C63FF, #4FACFE)' : 'rgba(255,255,255,0.1)',
        border: value ? 'none' : '1px solid var(--border)',
        cursor: 'pointer', position: 'relative', transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%',
        background: 'white', position: 'absolute',
        top: '4px', left: value ? '28px' : '4px',
        transition: 'left 0.2s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  );

  return (
    <div>
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 style={{ fontSize:'1.75rem', fontWeight:700, marginBottom:'0.25rem' }}>
          <span className="gradient-text">Pengaturan</span> Sistem
        </h1>
        <p style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>
          Perubahan langsung tersinkronisasi ke semua perangkat Android
        </p>
      </div>

      {/* Sync notice */}
      <div style={{
        display:'flex', alignItems:'center', gap:'0.75rem',
        padding:'0.875rem 1.25rem', marginBottom:'1.5rem',
        background:'rgba(108,99,255,0.08)',
        border:'1px solid rgba(108,99,255,0.25)',
        borderRadius:'var(--radius-md)',
      }}>
        <span style={{ fontSize:'1.2rem' }}>🔄</span>
        <div>
          <p style={{ fontSize:'0.85rem', fontWeight:600, color:'var(--text-primary)' }}>
            Sinkronisasi Real-Time via Firebase
          </p>
          <p style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
            Semua perubahan akan langsung aktif di kios Android tanpa perlu restart aplikasi.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
        {/* Logo */}
        <div className="glass-card" style={{ padding:'1.5rem' }}>
          <h2 style={{ fontSize:'0.95rem', fontWeight:700, marginBottom:'1.25rem' }}>🏷️ Logo Booth</h2>
          <div style={{ display:'flex', gap:'1.5rem', alignItems:'center', flexWrap:'wrap' }}>
            <div
              onClick={() => logoRef.current?.click()}
              style={{
                width:'96px', height:'96px', borderRadius:'50%',
                border:'2px dashed var(--border)',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', overflow:'hidden', flexShrink:0,
              }}
            >
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="logo" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                <span style={{ fontSize:'2rem' }}>📷</span>
              )}
            </div>
            <input ref={logoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleLogoChange} />
            <div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => logoRef.current?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? '⏳ Mengupload...' : '📤 Ganti Logo'}
              </button>
              <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'0.5rem' }}>
                Logo akan ditampilkan di layar kios Android.
              </p>
            </div>
          </div>
        </div>

        {/* Session Settings */}
        <div className="glass-card" style={{ padding:'1.5rem' }}>
          <h2 style={{ fontSize:'0.95rem', fontWeight:700, marginBottom:'1.25rem' }}>⏱️ Pengaturan Sesi</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'1.25rem' }}>
            <div>
              <label style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:'0.35rem' }}>
                Durasi Sesi (detik)
              </label>
              <input
                type="number"
                className="input-field"
                min={60} max={3600} step={60}
                value={settings.session_duration}
                onChange={e => setSettings(prev => ({ ...prev, session_duration: +e.target.value }))}
              />
              <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:'0.3rem' }}>
                = {fmtSeconds(settings.session_duration)}
              </p>
            </div>
            <div>
              <label style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:'0.35rem' }}>
                Timeout Tidak Aktif (detik)
              </label>
              <input
                type="number"
                className="input-field"
                min={30} max={600} step={30}
                value={settings.inactivity_timeout}
                onChange={e => setSettings(prev => ({ ...prev, inactivity_timeout: +e.target.value }))}
              />
              <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:'0.3rem' }}>
                = {fmtSeconds(settings.inactivity_timeout)}
              </p>
            </div>
            <div>
              <label style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:'0.35rem' }}>
                Nama Booth
              </label>
              <input
                className="input-field"
                placeholder="Boro Photo Booth"
                value={settings.booth_name}
                onChange={e => setSettings(prev => ({ ...prev, booth_name: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Photo & Print Settings */}
        <div className="glass-card" style={{ padding:'1.5rem' }}>
          <h2 style={{ fontSize:'0.95rem', fontWeight:700, marginBottom:'1.25rem' }}>📷 Pengaturan Foto & Cetak</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'1.25rem' }}>
            <div>
              <label style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:'0.35rem' }}>
                Jumlah Foto per Sesi
              </label>
              <input
                type="number"
                className="input-field"
                min={1} max={8} step={1}
                value={settings.photo_count}
                onChange={e => setSettings(prev => ({ ...prev, photo_count: +e.target.value }))}
              />
              <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:'0.3rem' }}>
                Jumlah slot foto yang tersedia (1–8)
              </p>
            </div>
            <div>
              <label style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:'0.35rem' }}>
                Ukuran Cetak
              </label>
              <select
                id="print-size-select"
                className="input-field"
                value={settings.print_size}
                onChange={e => setSettings(prev => ({ ...prev, print_size: e.target.value }))}
                style={{ background:'var(--surface-2)', color:'white', cursor:'pointer' }}
              >
                {PRINT_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:'0.3rem' }}>
                Format kertas untuk mencetak foto
              </p>
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="glass-card" style={{ padding:'1.5rem' }}>
          <h2 style={{ fontSize:'0.95rem', fontWeight:700, marginBottom:'1.25rem' }}>🔧 Fitur Aktif</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {[
              {
                id: 'toggle-email', key: 'email_enabled' as keyof SystemSettings,
                label: '📧 Email Foto',
                desc: 'Pelanggan dapat memasukkan email untuk menerima foto',
              },
              {
                id: 'toggle-printer', key: 'printer_enabled' as keyof SystemSettings,
                label: '🖨️ Cetak Foto',
                desc: 'Aktifkan fitur cetak foto di akhir sesi',
              },
              {
                id: 'toggle-camera', key: 'auto_detect_camera' as keyof SystemSettings,
                label: '📷 Auto Deteksi Kamera',
                desc: 'Otomatis gunakan USB camera jika tersedia, fallback ke kamera depan',
              },
            ].map(item => (
              <div key={item.id} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'0.875rem 1rem',
                background:'rgba(255,255,255,0.02)',
                borderRadius:'var(--radius-md)',
                border:'1px solid var(--border)',
              }}>
                <div>
                  <p style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--text-primary)', marginBottom:'0.2rem' }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
                    {item.desc}
                  </p>
                </div>
                <ToggleSwitch
                  id={item.id}
                  value={settings[item.key] as boolean}
                  onChange={val => setSettings(prev => ({ ...prev, [item.key]: val }))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save button */}
        <div style={{ display:'flex', gap:'1rem', alignItems:'center' }}>
          <button
            id="save-settings-btn"
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{ padding:'0.85rem 2rem', fontSize:'0.95rem' }}
          >
            {saving ? '⏳ Menyimpan...' : '💾 Simpan & Sinkronkan'}
          </button>
          {msg && (
            <p style={{
              fontSize:'0.85rem',
              color: msg.startsWith('✅') ? 'var(--accent-green)' : msg.startsWith('❌') ? 'var(--danger)' : 'var(--text-secondary)',
            }}>
              {msg}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
