'use client';

import { useEffect, useState, useRef } from 'react';
import {
  watchTemplates,
  uploadTemplate,
  toggleTemplate,
  deleteTemplate,
  type Template,
} from '@/lib/api';
import LayoutEditor from '../LayoutEditor';

export default function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [uploading, setUploading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Metadata states for new template
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [printSize, setPrintSize] = useState('4R');
  const [category, setCategory] = useState('General');
  const [photoCount, setPhotoCount] = useState(4);
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(1800);

  // Visual layout editor trigger state
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    return watchTemplates(
      setTemplates,
      (err) => console.error('[Templates] Error reading templates:', err.message)
    );
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleOrientationChange = (val: 'portrait' | 'landscape') => {
    setOrientation(val);
    if (val === 'portrait') {
      setCanvasWidth(1200);
      setCanvasHeight(1800);
    } else {
      setCanvasWidth(1800);
      setCanvasHeight(1200);
    }
  };

  const handleUpload = async () => {
    if (!newName.trim() || !newFile) return;
    setUploading(true);
    setProgress('Mengupload ke Firebase Storage (0%)...');
    try {
      await uploadTemplate(
        newName.trim(),
        newFile,
        {
          orientation,
          print_size: printSize,
          category,
          photo_count: photoCount,
          canvasWidth,
          canvasHeight,
        },
        (pct) => {
          setProgress(`Mengupload ke Firebase Storage (${pct}%)...`);
        }
      );
      setProgress('✅ Template dan layout berhasil diunggah!');
      setNewName('');
      setNewFile(null);
      setPreview(null);
      setCategory('General');
      setPhotoCount(4);
      setOrientation('portrait');
      setCanvasWidth(1200);
      setCanvasHeight(1800);
      if (fileRef.current) fileRef.current.value = '';
      setTimeout(() => setProgress(''), 3000);
    } catch (e) {
      setProgress(`❌ Gagal: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await toggleTemplate(id, !active);
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    if (!confirm('Hapus template ini? File gambar dan layout akan ikut terhapus.')) return;
    await deleteTemplate(id, imageUrl);
  };

  return (
    <div>
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 style={{ fontSize:'1.75rem', fontWeight:700, marginBottom:'0.25rem' }}>
          Kelola <span className="gradient-text">Template</span> & Layout
        </h1>
        <p style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>
          Upload template PNG, isi metadata, dan atur slot foto dengan Editor Visual
        </p>
      </div>

      {/* Upload Form */}
      <div className="glass-card" style={{ padding:'1.5rem', marginBottom:'1.5rem' }}>
        <h2 style={{ fontSize:'0.95rem', fontWeight:700, marginBottom:'1.25rem' }}>📤 Upload Template Baru</h2>
        <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap', alignItems:'flex-start' }}>
          
          {/* File picker */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width:'160px', height:'240px', borderRadius:'var(--radius-md)',
              border:`2px dashed ${newFile ? 'rgba(108,99,255,0.6)' : 'var(--border)'}`,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              cursor:'pointer', overflow:'hidden', flexShrink:0,
              background: preview ? 'transparent' : 'rgba(255,255,255,0.02)',
              transition:'border-color 0.2s ease',
            }}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
            ) : (
              <>
                <span style={{ fontSize:'2rem' }}>🖼️</span>
                <span style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:'0.5rem', textAlign:'center', padding:'0 0.5rem' }}>
                  Klik pilih frame PNG overlay transparan
                </span>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileChange} />

          {/* Form fields */}
          <div style={{ flex:1, minWidth:'260px', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'0.75rem' }}>
              <div>
                <label style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:'0.35rem' }}>
                  Nama Template
                </label>
                <input
                  className="input-field"
                  placeholder="Classic Frame"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:'0.35rem' }}>
                  Kategori
                </label>
                <input
                  className="input-field"
                  placeholder="Wedding, Kids, Polaroid..."
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:'0.75rem' }}>
              <div>
                <label style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:'0.35rem' }}>
                  Jumlah Foto
                </label>
                <input
                  type="number"
                  className="input-field"
                  min={1} max={12}
                  value={photoCount}
                  onChange={e => setPhotoCount(+e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:'0.35rem' }}>
                  Orientasi
                </label>
                <select
                  className="input-field"
                  value={orientation}
                  onChange={e => handleOrientationChange(e.target.value as 'portrait' | 'landscape')}
                  style={{ background:'var(--surface-2)', color:'white', cursor:'pointer' }}
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:'0.35rem' }}>
                  Ukuran Cetak
                </label>
                <select
                  className="input-field"
                  value={printSize}
                  onChange={e => setPrintSize(e.target.value)}
                  style={{ background:'var(--surface-2)', color:'white', cursor:'pointer' }}
                >
                  <option value="4R">4R</option>
                  <option value="A5">A5</option>
                  <option value="A4">A4</option>
                </select>
              </div>
            </div>

            {/* Custom Canvas dimensions */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
              <div>
                <label style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:'0.35rem' }}>
                  Canvas Width (Acuan Editor)
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={canvasWidth}
                  onChange={e => setCanvasWidth(+e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:'0.35rem' }}>
                  Canvas Height (Acuan Editor)
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={canvasHeight}
                  onChange={e => setCanvasHeight(+e.target.value)}
                />
              </div>
            </div>

            <button
              id="upload-template-btn"
              className="btn-primary"
              onClick={handleUpload}
              disabled={uploading || !newName || !newFile}
              style={{ alignSelf:'flex-start', padding:'0.75rem 1.5rem', marginTop:'0.5rem' }}
            >
              {uploading ? '⏳ Mengupload...' : '📤 Upload Template & Buat Layout'}
            </button>
            {progress && (
              <p style={{ fontSize:'0.8rem', color: progress.startsWith('✅') ? 'var(--accent-green)' : progress.startsWith('❌') ? 'var(--danger)' : 'var(--text-secondary)' }}>
                {progress}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Template Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'1.25rem' }}>
        {templates.map(t => (
          <div key={t.id} className="glass-card" style={{ padding:0, overflow:'hidden', display:'flex', flexDirection:'column', height:'100%' }}>
            
            {/* Preview image */}
            <div style={{ height:'220px', background:'rgba(255,255,255,0.03)', position:'relative', borderBottom:'1px solid var(--border)' }}>
              {t.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.image_url} alt={t.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
              ) : (
                <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:'2.5rem' }}>
                  🖼️
                </div>
              )}
              {/* Active badge overlay */}
              <div style={{ position:'absolute', top:'0.5rem', right:'0.5rem' }}>
                <span className={`badge ${t.active ? 'badge-green' : 'badge-red'}`}>
                  {t.active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
            </div>

            {/* Info details */}
            <div style={{ padding:'1rem', flex:1, display:'flex', flexDirection:'column', gap:'0.25rem' }}>
              <p style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--text-primary)' }}>
                {t.name}
              </p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem', margin:'0.35rem 0' }}>
                <span style={{ fontSize:'0.65rem', background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)', padding:'0.1rem 0.4rem', borderRadius:'4px', color:'var(--text-secondary)' }}>
                  👤 {t.photo_count || 4} Foto
                </span>
                <span style={{ fontSize:'0.65rem', background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)', padding:'0.1rem 0.4rem', borderRadius:'4px', color:'var(--text-secondary)' }}>
                  📐 {t.orientation}
                </span>
                <span style={{ fontSize:'0.65rem', background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)', padding:'0.1rem 0.4rem', borderRadius:'4px', color:'var(--text-secondary)' }}>
                  🖨️ {t.print_size || '4R'}
                </span>
                <span style={{ fontSize:'0.65rem', background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)', padding:'0.1rem 0.4rem', borderRadius:'4px', color:'var(--text-secondary)' }}>
                  📁 {t.category || 'General'}
                </span>
              </div>

              <div style={{ display:'flex', gap:'0.5rem', justifyContent:'space-between', alignItems:'center', marginTop:'auto', paddingTop:'0.75rem', borderTop:'1px solid var(--border)' }}>
                {/* Active Toggle Switch */}
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={t.active}
                    onChange={() => handleToggle(t.id, t.active)}
                  />
                  <span className="toggle-slider" />
                </label>

                <div style={{ display:'flex', gap:'0.35rem' }}>
                  {/* Visual Editor Button */}
                  <button
                    className="btn-ghost"
                    onClick={() => setEditingTemplate(t)}
                    title="Edit layout koordinat slot foto secara visual"
                    style={{ fontSize:'0.72rem', padding:'0.35rem 0.6rem', border:'1px solid var(--border)' }}
                  >
                    📐 Layout
                  </button>

                  {/* Delete Button */}
                  <button
                    className="btn-danger"
                    onClick={() => handleDelete(t.id, t.image_url)}
                    style={{ fontSize:'0.72rem', padding:'0.35rem 0.6rem' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>

          </div>
        ))}

        {templates.length === 0 && (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>
            Belum ada template. Upload template pertama Anda!
          </div>
        )}
      </div>

      {/* Visual Layout Editor Overlay Modal */}
      {editingTemplate && (
        <LayoutEditor
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
}
