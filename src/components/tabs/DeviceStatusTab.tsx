'use client';

import { useEffect, useState } from 'react';
import { watchDeviceStatus, type DeviceStatus } from '@/lib/api';

interface StatusIndicatorProps {
  label: string;
  isOnline: boolean | undefined;
  icon: string;
  description?: string;
}

function StatusIndicator({ label, isOnline, icon, description }: StatusIndicatorProps) {
  const loading = isOnline === undefined;
  const color = loading ? '#94a3b8' : isOnline ? '#4ADE80' : '#EF4444';
  const bgColor = loading ? 'rgba(148,163,184,0.08)' : isOnline
    ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)';
  const borderColor = loading ? 'rgba(148,163,184,0.2)' : isOnline
    ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      padding: '1rem 1.25rem',
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)',
      transition: 'all 0.3s ease',
    }}>
      {/* Status dot */}
      <div style={{ position: 'relative', width: '12px', height: '12px', flexShrink: 0 }}>
        <div style={{
          width: '12px', height: '12px', borderRadius: '50%',
          background: color,
          boxShadow: loading ? 'none' : `0 0 10px ${color}`,
        }} />
        {isOnline && !loading && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `${color}80`,
            animation: 'ping 1.5s infinite',
          }} />
        )}
      </div>

      {/* Icon + Info */}
      <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: '0.9rem', fontWeight: 600,
          color: loading ? 'var(--text-muted)' : 'var(--text-primary)',
          marginBottom: '0.1rem',
        }}>
          {label}
        </p>
        {description && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
      </div>

      {/* Status badge */}
      <div style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.75rem', fontWeight: 600,
        color: color,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        flexShrink: 0,
      }}>
        {loading ? '...' : isOnline ? '✓ Online' : '✗ Offline'}
      </div>
    </div>
  );
}

export default function DeviceStatusTab() {
  const [status, setStatus] = useState<DeviceStatus>({
    usb_camera_connected: false,
    front_camera_ready: false,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = watchDeviceStatus((s) => {
      setStatus(s);
      setLoading(false);
      if (s.last_updated) {
        const date = (s.last_updated as { toDate?: () => Date }).toDate?.();
        if (date) {
          setLastUpdated(date.toLocaleString('id-ID', {
            dateStyle: 'short', timeStyle: 'medium'
          }));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const indicators = [
    {
      label: 'Firebase Connected',
      isOnline: loading ? undefined : (status.firebase_connected ?? false),
      icon: '🔥',
      description: 'Koneksi ke Firebase Firestore & Storage',
    },
    {
      label: 'Internet Available',
      isOnline: loading ? undefined : (status.internet_available ?? false),
      icon: '🌐',
      description: 'Koneksi internet aktif di perangkat kios',
    },
    {
      label: 'USB Camera',
      isOnline: loading ? undefined : status.usb_camera_connected,
      icon: '📷',
      description: 'USB External Camera (UVC) terhubung',
    },
    {
      label: 'Front Camera',
      isOnline: loading ? undefined : status.front_camera_ready,
      icon: '🤳',
      description: 'Kamera depan tablet siap digunakan',
    },
    {
      label: 'Printer',
      isOnline: loading ? undefined : (status.printer_ready ?? false),
      icon: '🖨️',
      description: 'Printer USB atau WiFi terhubung & siap',
    },
  ];

  const onlineCount = indicators.filter(i => i.isOnline === true).length;
  const totalCount = indicators.length;
  const allOnline = onlineCount === totalCount;
  const systemHealthColor = allOnline ? '#4ADE80' : onlineCount >= 3 ? '#FBBF24' : '#EF4444';
  const systemHealthLabel = allOnline ? 'Semua Sistem Normal' : onlineCount >= 3 ? 'Ada Masalah Minor' : 'Perlu Perhatian';

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Status <span className="gradient-text">Perangkat</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Monitoring hardware kios secara real-time dari Firebase
        </p>
      </div>

      {/* System Health Summary */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1.25rem',
        padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
        background: `${systemHealthColor}10`,
        border: `1px solid ${systemHealthColor}30`,
        borderRadius: 'var(--radius-md)',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.75rem',
          background: `${systemHealthColor}15`,
          border: `2px solid ${systemHealthColor}40`,
          flexShrink: 0,
        }}>
          {allOnline ? '✅' : onlineCount >= 3 ? '⚠️' : '❌'}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: systemHealthColor }}>
            {systemHealthLabel}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
            {onlineCount} dari {totalCount} perangkat online
            {lastUpdated && ` · Diperbarui: ${lastUpdated}`}
          </p>
        </div>

        {/* Live badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.4rem 0.8rem',
          background: 'rgba(74,222,128,0.08)',
          border: '1px solid rgba(74,222,128,0.2)',
          borderRadius: '999px',
        }}>
          <div style={{ position: 'relative', width: '8px', height: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ADE80' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(74,222,128,0.5)', animation: 'ping 1.5s infinite' }} />
          </div>
          <span style={{ fontSize: '0.72rem', color: '#4ADE80', fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
          🖥️ Status Hardware Kios
        </h2>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{
                height: '64px', borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                animation: 'pulse 1.5s infinite',
              }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {indicators.map((item, i) => (
              <StatusIndicator key={i} {...item} />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{
        marginTop: '1rem',
        padding: '0.875rem 1.25rem',
        background: 'rgba(108,99,255,0.06)',
        border: '1px solid rgba(108,99,255,0.15)',
        borderRadius: 'var(--radius-md)',
        display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>ℹ️</span>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Status diperbarui secara otomatis dari aplikasi Android saat startup dan setiap kali ada perubahan koneksi USB.
          Data disimpan di Firestore{' '}
          <code style={{ background: 'rgba(108,99,255,0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}>
            /settings/device_status
          </code>.
        </p>
      </div>

      <style>{`
        @keyframes ping { 0%,100% { transform: scale(1); opacity: 1; } 75% { transform: scale(2); opacity: 0; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
