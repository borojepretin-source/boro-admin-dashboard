'use client';

import { useEffect, useState, useRef } from 'react';
import {
  watchTemplateLayout,
  saveTemplateLayout,
  type Template,
  type LayoutSlot,
  type TemplateLayout,
} from '@/lib/api';

interface LayoutEditorProps {
  template: Template;
  onClose: () => void;
}

export default function LayoutEditor({ template, onClose }: LayoutEditorProps) {
  const [slots, setSlots] = useState<LayoutSlot[]>([]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const canvasWidth = template.canvasWidth || 1200;
  const canvasHeight = template.canvasHeight || 1800;

  const editorRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    index: number;
    type: 'move' | 'resize-se' | 'resize-sw' | 'resize-ne' | 'resize-nw' | 'resize-n' | 'resize-s' | 'resize-e' | 'resize-w';
    startX: number;
    startY: number;
    startSlot: { x: number; y: number; width: number; height: number };
  } | null>(null);

  // Scaled dimensions of the canvas on screen
  const [scale, setScale] = useState(1);
  const [editorDim, setEditorDim] = useState({ width: 0, height: 0 });

  // Load layout configuration in real-time
  useEffect(() => {
    setLoading(true);
    const unsubscribe = watchTemplateLayout(template.id, (layout) => {
      if (layout && layout.slots) {
        setSlots(layout.slots);
      } else {
        // Fallback or default initial slots
        const defaultSlots: LayoutSlot[] = [];
        for (let i = 0; i < template.photo_count; i++) {
          defaultSlots.push({
            slotNumber: i + 1,
            x: Math.round(canvasWidth * 0.1),
            y: Math.round((canvasHeight / template.photo_count) * i + (canvasHeight / template.photo_count) * 0.1),
            width: Math.round(canvasWidth * 0.8),
            height: Math.round((canvasHeight / template.photo_count) * 0.7),
            rotation: 0,
            fit: 'cover',
            radius: 12,
            opacity: 1.0,
          });
        }
        setSlots(defaultSlots);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [template, canvasWidth, canvasHeight]);

  // Recalculate editor scale on window resize or load
  useEffect(() => {
    const updateDimensions = () => {
      if (!editorRef.current) return;
      const parent = editorRef.current.parentElement;
      if (!parent) return;

      const maxW = Math.min(parent.clientWidth * 0.9, 500); // Constraint editor size
      const maxH = window.innerHeight * 0.7;

      let w = maxW;
      let h = w * (canvasHeight / canvasWidth);

      if (h > maxH) {
        h = maxH;
        w = h * (canvasWidth / canvasHeight);
      }

      setEditorDim({ width: w, height: h });
      setScale(w / canvasWidth);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [canvasWidth, canvasHeight, slots]);

  const handleMouseDown = (
    e: React.MouseEvent,
    index: number,
    type: 'move' | 'resize-se' | 'resize-sw' | 'resize-ne' | 'resize-nw' | 'resize-n' | 'resize-s' | 'resize-e' | 'resize-w'
  ) => {
    e.stopPropagation();
    setSelectedSlotIndex(index);

    const slot = slots[index];
    dragRef.current = {
      index,
      type,
      startX: e.clientX,
      startY: e.clientY,
      startSlot: { x: slot.x, y: slot.y, width: slot.width, height: slot.height },
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragRef.current) return;
    const { index, type, startX, startY, startSlot } = dragRef.current;

    const dx = (e.clientX - startX) / scale;
    const dy = (e.clientY - startY) / scale;

    const updatedSlots = [...slots];
    const slot = { ...updatedSlots[index] };

    if (type === 'move') {
      slot.x = Math.round(Math.max(0, Math.min(canvasWidth - slot.width, startSlot.x + dx)));
      slot.y = Math.round(Math.max(0, Math.min(canvasHeight - slot.height, startSlot.y + dy)));
    } else if (type === 'resize-se') {
      slot.width = Math.round(Math.max(100, Math.min(canvasWidth - slot.x, startSlot.width + dx)));
      slot.height = Math.round(Math.max(100, Math.min(canvasHeight - slot.y, startSlot.height + dy)));
    } else if (type === 'resize-sw') {
      const newWidth = Math.round(Math.max(100, startSlot.width - dx));
      const deltaW = startSlot.width - newWidth;
      slot.x = Math.round(Math.max(0, startSlot.x + deltaW));
      slot.width = newWidth;
      slot.height = Math.round(Math.max(100, Math.min(canvasHeight - slot.y, startSlot.height + dy)));
    } else if (type === 'resize-ne') {
      slot.width = Math.round(Math.max(100, Math.min(canvasWidth - slot.x, startSlot.width + dx)));
      const newHeight = Math.round(Math.max(100, startSlot.height - dy));
      const deltaH = startSlot.height - newHeight;
      slot.y = Math.round(Math.max(0, startSlot.y + deltaH));
      slot.height = newHeight;
    } else if (type === 'resize-nw') {
      const newWidth = Math.round(Math.max(100, startSlot.width - dx));
      const deltaW = startSlot.width - newWidth;
      slot.x = Math.round(Math.max(0, startSlot.x + deltaW));
      slot.width = newWidth;

      const newHeight = Math.round(Math.max(100, startSlot.height - dy));
      const deltaH = startSlot.height - newHeight;
      slot.y = Math.round(Math.max(0, startSlot.y + deltaH));
      slot.height = newHeight;
    }

    updatedSlots[index] = slot;
    setSlots(updatedSlots);
  };

  const handleMouseUp = () => {
    dragRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleAddSlot = () => {
    const slotNumber = slots.length + 1;
    const newSlot: LayoutSlot = {
      slotNumber,
      x: Math.round(canvasWidth * 0.2),
      y: Math.round(canvasHeight * 0.2),
      width: Math.round(canvasWidth * 0.6),
      height: Math.round(canvasHeight * 0.2),
      rotation: 0,
      fit: 'cover',
      radius: 12,
      opacity: 1.0,
    };
    setSlots([...slots, newSlot]);
    setSelectedSlotIndex(slots.length);
  };

  const handleRemoveSlot = (index: number) => {
    const updated = slots.filter((_, i) => i !== index).map((s, i) => ({
      ...s,
      slotNumber: i + 1, // Re-index slots
    }));
    setSlots(updated);
    setSelectedSlotIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await saveTemplateLayout(template.id, { slots });
      setMessage('✅ Layout berhasil disimpan!');
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setMessage(`❌ Gagal: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePropertyChange = (key: keyof LayoutSlot, value: any) => {
    if (selectedSlotIndex === null) return;
    const updated = [...slots];
    updated[selectedSlotIndex] = {
      ...updated[selectedSlotIndex],
      [key]: value,
    };
    setSlots(updated);
  };

  const activeSlot = selectedSlotIndex !== null ? slots[selectedSlotIndex] : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(10,10,25,0.95)',
      backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column',
      padding: '2rem', overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>
            📐 Visual Layout Editor — <span className="gradient-text">{template.name}</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Atur dan posisikan area slot foto secara dinamis. Kanvas: {canvasWidth}x{canvasHeight}px ({template.orientation})
          </p>
        </div>
        <button className="btn-ghost" onClick={onClose} style={{ fontSize: '1.5rem', padding: '0.5rem' }}>✕</button>
      </div>

      {/* Editor Body */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(108,99,255,0.3)', borderTop: '3px solid #6C63FF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '2rem', flex: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          
          {/* Visual Workspace */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            flex: '1 1 450px', maxWidth: '550px'
          }}>
            <div
              ref={editorRef}
              style={{
                width: `${editorDim.width}px`,
                height: `${editorDim.height}px`,
                position: 'relative',
                background: 'rgba(255,255,255,0.02)',
                border: '2px solid rgba(108,99,255,0.3)',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              }}
            >
              {/* Main Template PNG Frame */}
              {template.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={template.image_url}
                  alt="template"
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'contain', pointerEvents: 'none',
                    zIndex: 10,
                  }}
                />
              )}

              {/* Dynamic Overlay Layout Slots */}
              {slots.map((slot, index) => {
                const isSelected = selectedSlotIndex === index;
                return (
                  <div
                    key={index}
                    onMouseDown={(e) => handleMouseDown(e, index, 'move')}
                    style={{
                      position: 'absolute',
                      left: `${slot.x * scale}px`,
                      top: `${slot.y * scale}px`,
                      width: `${slot.width * scale}px`,
                      height: `${slot.height * scale}px`,
                      transform: `rotate(${slot.rotation}deg)`,
                      background: isSelected ? 'rgba(108,99,255,0.3)' : 'rgba(255,255,255,0.15)',
                      border: isSelected ? '2px solid #6C63FF' : '1px dashed rgba(255,255,255,0.5)',
                      borderRadius: `${slot.radius * scale}px`,
                      opacity: slot.opacity,
                      cursor: 'move',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: isSelected ? 20 : 5,
                      boxShadow: isSelected ? '0 0 15px rgba(108,99,255,0.5)' : 'none',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    {/* Slot Badge Indicator */}
                    <div style={{
                      background: isSelected ? '#6C63FF' : 'rgba(0,0,0,0.6)',
                      color: 'white', fontWeight: 700, fontSize: '0.8rem',
                      padding: '0.2rem 0.6rem', borderRadius: '50px',
                      userSelect: 'none', pointerEvents: 'none'
                    }}>
                      Slot {slot.slotNumber}
                    </div>

                    {/* Resize handles */}
                    {isSelected && (
                      <>
                        {/* SE corner */}
                        <div
                          onMouseDown={(e) => handleMouseDown(e, index, 'resize-se')}
                          style={{
                            position: 'absolute', bottom: '-4px', right: '-4px',
                            width: '10px', height: '10px', background: '#6C63FF',
                            borderRadius: '50%', cursor: 'se-resize', zIndex: 30
                          }}
                        />
                        {/* SW corner */}
                        <div
                          onMouseDown={(e) => handleMouseDown(e, index, 'resize-sw')}
                          style={{
                            position: 'absolute', bottom: '-4px', left: '-4px',
                            width: '10px', height: '10px', background: '#6C63FF',
                            borderRadius: '50%', cursor: 'sw-resize', zIndex: 30
                          }}
                        />
                        {/* NE corner */}
                        <div
                          onMouseDown={(e) => handleMouseDown(e, index, 'resize-ne')}
                          style={{
                            position: 'absolute', top: '-4px', right: '-4px',
                            width: '10px', height: '10px', background: '#6C63FF',
                            borderRadius: '50%', cursor: 'ne-resize', zIndex: 30
                          }}
                        />
                        {/* NW corner */}
                        <div
                          onMouseDown={(e) => handleMouseDown(e, index, 'resize-nw')}
                          style={{
                            position: 'absolute', top: '-4px', left: '-4px',
                            width: '10px', height: '10px', background: '#6C63FF',
                            borderRadius: '50%', cursor: 'nw-resize', zIndex: 30
                          }}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', width: '100%' }}>
              <button className="btn-ghost" onClick={handleAddSlot} style={{ flex: 1 }}>
                ➕ Tambah Slot
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
                {saving ? '⏳ Menyimpan...' : '💾 Simpan Layout'}
              </button>
            </div>
            {message && <p style={{ marginTop: '0.75rem', color: message.includes('✅') ? 'var(--accent-green)' : 'var(--danger)', fontSize: '0.9rem' }}>{message}</p>}
          </div>

          {/* Properties Panel */}
          <div style={{ flex: '1 1 300px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem', flex: 1 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '1.25rem' }}>
                ⚙️ Properti Slot
              </h3>

              {activeSlot ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Slot identifier and deletion */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Memodifikasi Slot {activeSlot.slotNumber}
                    </span>
                    <button
                      className="btn-danger"
                      onClick={() => handleRemoveSlot(selectedSlotIndex!)}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      🗑️ Hapus Slot
                    </button>
                  </div>

                  <hr style={{ border: 0, borderTop: '1px solid var(--border)' }} />

                  {/* Absolute Position inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Posisi X (px)</label>
                      <input
                        type="number"
                        className="input-field"
                        value={activeSlot.x}
                        onChange={(e) => handlePropertyChange('x', +e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Posisi Y (px)</label>
                      <input
                        type="number"
                        className="input-field"
                        value={activeSlot.y}
                        onChange={(e) => handlePropertyChange('y', +e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Lebar (px)</label>
                      <input
                        type="number"
                        className="input-field"
                        value={activeSlot.width}
                        onChange={(e) => handlePropertyChange('width', +e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Tinggi (px)</label>
                      <input
                        type="number"
                        className="input-field"
                        value={activeSlot.height}
                        onChange={(e) => handlePropertyChange('height', +e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Fit Style */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Penskalaan Foto (Fit)</label>
                    <select
                      className="input-field"
                      value={activeSlot.fit}
                      onChange={(e) => handlePropertyChange('fit', e.target.value)}
                      style={{ background: 'var(--surface-2)', color: 'white', cursor: 'pointer' }}
                    >
                      <option value="cover">Cover (Penuh & Crop)</option>
                      <option value="contain">Contain (Utuh & Fit)</option>
                      <option value="fill">Fill (Stretch)</option>
                    </select>
                  </div>

                  {/* Corner Border Radius */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      <span>Border Radius (Sudut Membulat)</span>
                      <span>{activeSlot.radius}px</span>
                    </div>
                    <input
                      type="range"
                      min={0} max={100}
                      value={activeSlot.radius}
                      onChange={(e) => handlePropertyChange('radius', +e.target.value)}
                      style={{ width: '100%', accentColor: '#6C63FF' }}
                    />
                  </div>

                  {/* Rotation angle */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      <span>Rotasi (Kemiringan)</span>
                      <span>{activeSlot.rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min={-180} max={180}
                      value={activeSlot.rotation}
                      onChange={(e) => handlePropertyChange('rotation', +e.target.value)}
                      style={{ width: '100%', accentColor: '#6C63FF' }}
                    />
                  </div>

                  {/* Opacity slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      <span>Opasitas (Transparansi)</span>
                      <span>{Math.round(activeSlot.opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.1} max={1.0} step={0.05}
                      value={activeSlot.opacity}
                      onChange={(e) => handlePropertyChange('opacity', +e.target.value)}
                      style={{ width: '100%', accentColor: '#6C63FF' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                  <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🖱️</span>
                  <p style={{ fontSize: '0.85rem' }}>Pilih atau klik salah satu slot foto di kanvas untuk memodifikasi posisinya secara akurat.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
