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
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const unsubscribe = watchDeviceStatus((s) => {
      setStatus(s);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Update timer setiap 5 detik untuk menghitung selisih heartbeat secara akurat
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Cek apakah kiosk aktif (heartbeat diterima kurang dari 60 detik yang lalu)
  const lastMs = status.last_updated?.toMillis
    ? status.last_updated.toMillis()
    : (status.last_updated as any)?.toDate?.()?.getTime?.() ?? 0;

  const diffSecs = lastMs > 0 ? Math.floor((now - lastMs) / 1000) : 999999;
  const isKioskOnline = !loading && lastMs > 0 && diffSecs < 60;

  let lastUpdatedText = 'Belum pernah terhubung';
  if (lastMs > 0) {
    if (diffSecs < 10) {
      lastUpdatedText = 'Baru saja (< 10 detik lalu)';
    } else if (diffSecs < 60) {
      lastUpdatedText = `${diffSecs} detik yang lalu`;
    } else {
      const mins = Math.floor(diffSecs / 60);
      lastUpdatedText = `${mins} menit yang lalu`;
    }
  }

  const indicators = [
    {
      label: 'Komputer Kiosk',
      isOnline: loading ? undefined : isKioskOnline,
      icon: '🖥️',
      description: isKioskOnline ? 'Aplikasi web kiosk berjalan aktif' : 'Komputer mati atau browser kiosk ditutup',
    },
    {
      label: 'Koneksi Internet Kiosk',
      isOnline: loading ? undefined : (isKioskOnline && (status.internet_available ?? false)),
      icon: '🌐',
      description: isKioskOnline && status.internet_available ? 'Jaringan internet di booth stabil' : 'Internet di booth terputus',
    },
    {
      label: 'Kamera DSLR / USB',
      isOnline: loading ? undefined : (isKioskOnline && status.usb_camera_connected),
      icon: '📷',
      description: isKioskOnline && status.usb_camera_connected ? 'Kamera Canon / USB eksternal terhubung & siap' : 'Kamera Canon / USB tidak terdeteksi',
    },
    {
      label: 'Webcam Cadangan',
      isOnline: loading ? undefined : (isKioskOnline && status.front_camera_ready),
      icon: '🤳',
      description: isKioskOnline && status.front_camera_ready ? 'Webcam browser aktif' : 'Webcam tidak terdeteksi',
    },
    {
      label: 'Printer Fisik',
      isOnline: loading ? undefined : (isKioskOnline && (status.printer_ready ?? false)),
      icon: '🖨️',
      description: isKioskOnline && status.printer_ready ? 'Printer USB/WiFi siap mencetak' : 'Printer offline atau bridge printer mati',
    },
    {
      label: 'Koneksi Firebase Cloud',
      isOnline: loading ? undefined : (isKioskOnline && (status.firebase_connected ?? false)),
      icon: '🔥',
      description: isKioskOnline && status.firebase_connected ? 'Terkoneksi ke Firestore & Storage' : 'Tidak terhubung ke Firebase',
    },
  ];

  const onlineCount = indicators.filter(i => i.isOnline === true).length;
  const totalCount = indicators.length;
  const systemHealthColor = isKioskOnline ? (onlineCount >= 5 ? '#4ADE80' : '#FBBF24') : '#EF4444';
  const systemHealthLabel = isKioskOnline
    ? (onlineCount >= 5 ? 'Semua Perangkat Normal & Siap' : 'Kiosk Online (Perlu Cek Kamera/Printer)')
    : 'Kiosk Offline / Aplikasi Belum Dibuka';

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Status <span className="gradient-text">Perangkat</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Monitoring kesehatan hardware kiosk secara real-time via heartbeat Firebase
        </p>
      </div>

      {/* System Health Summary Banner */}
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
          {isKioskOnline ? (onlineCount >= 5 ? '✅' : '⚠️') : '❌'}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: systemHealthColor }}>
            {systemHealthLabel}
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            {isKioskOnline ? `${onlineCount} dari ${totalCount} indikator aktif` : 'Tidak menerima sinyal heartbeat'}
            {` · Heartbeat: ${lastUpdatedText}`}
          </p>
        </div>

        {/* Live Badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.4rem 0.8rem',
          background: isKioskOnline ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${isKioskOnline ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: '999px',
        }}>
          <div style={{ position: 'relative', width: '8px', height: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isKioskOnline ? '#4ADE80' : '#EF4444' }} />
            {isKioskOnline && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(74,222,128,0.5)', animation: 'ping 1.5s infinite' }} />
            )}
          </div>
          <span style={{ fontSize: '0.72rem', color: isKioskOnline ? '#4ADE80' : '#EF4444', fontWeight: 700 }}>
            {isKioskOnline ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Offline Alert Box if kiosk is not online */}
      {!loading && !isKioskOnline && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem 1.25rem',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--danger)',
          fontSize: '0.85rem',
          lineHeight: 1.5,
        }}>
          <strong>⚠️ Perhatian:</strong> Mesin kiosk tidak mengirimkan data dalam 1 menit terakhir. Pastikan komputer booth menyala, terhubung ke internet, dan aplikasi web <code>sesi-jepret-customer</code> sedang dibuka.
        </div>
      )}

      {/* Status Indicators List */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
          🖥️ Status Detail Hardware
        </h2>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[...Array(6)].map((_, i) => (
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

      <style>{`
        @keyframes ping { 0%,100% { transform: scale(1); opacity: 1; } 75% { transform: scale(2); opacity: 0; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
