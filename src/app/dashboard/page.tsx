'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import OverviewTab from '@/components/tabs/OverviewTab';
import VouchersTab from '@/components/tabs/VouchersTab';
import SessionsTab from '@/components/tabs/SessionsTab';
import DeviceStatusTab from '@/components/tabs/DeviceStatusTab';
import { watchDeviceStatus, cleanupOldSessions, DeviceStatus } from '@/lib/api';

type Tab = 'overview' | 'vouchers' | 'sessions' | 'device_status';

const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',       label: 'Ikhtisar',          icon: '📊' },
  { id: 'vouchers',       label: 'Voucher',            icon: '🎫' },
  { id: 'sessions',       label: 'Riwayat Sesi',       icon: '📸' },
  { id: 'device_status',  label: 'Status Perangkat',   icon: '🖥️' },
];

export default function DashboardPage() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    usb_camera_connected: false,
    front_camera_ready: false,
  });

  useEffect(() => {
    const unsubscribe = watchDeviceStatus((status) => {
      setDeviceStatus(status);
    });
    return () => unsubscribe();
  }, []);

  // Auto-Cleanup 30 Hari: Berjalan otomatis sekali sehari saat admin membuka dashboard
  useEffect(() => {
    if (!user) return;
    const lastCleanup = localStorage.getItem('boro_last_cleanup');
    const now = Date.now();
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    if (!lastCleanup || now - Number(lastCleanup) > twelveHoursMs) {
      cleanupOldSessions(30)
        .then(() => {
          localStorage.setItem('boro_last_cleanup', String(now));
        })
        .catch((err) => {
          console.warn('[Dashboard] Auto cleanup background notice:', err);
        });
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:'40px', height:'40px', border:'3px solid rgba(108,99,255,0.3)', borderTop:'3px solid #6C63FF', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) return null;

  const tabComponents: Record<Tab, React.ReactNode> = {
    overview:       <OverviewTab />,
    vouchers:       <VouchersTab />,
    sessions:       <SessionsTab />,
    device_status:  <DeviceStatusTab />,
  };

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        background: 'rgba(255,255,255,0.02)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}>
        {/* Brand */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'2rem', padding:'0 0.5rem' }}>
          <div style={{
            width:'40px', height:'40px', borderRadius:'12px',
            background:'linear-gradient(135deg, #6C63FF, #4FACFE)',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink: 0,
            boxShadow:'0 4px 16px rgba(108,99,255,0.4)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
              <circle cx="12" cy="13" r="3"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:'0.9rem', lineHeight:1.2 }} className="gradient-text">Boro Admin</div>
            <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:'2px' }}>Photo Booth</div>
          </div>
        </div>

        {/* Live indicator */}
        <div style={{
          display:'flex', alignItems:'center', gap:'0.5rem',
          padding:'0.5rem 0.75rem', marginBottom:'1.5rem',
          background:'rgba(74,222,128,0.08)',
          border:'1px solid rgba(74,222,128,0.2)',
          borderRadius:'var(--radius-md)',
        }}>
          <div style={{ position:'relative', width:'8px', height:'8px' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#4ADE80' }} />
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(74,222,128,0.5)', animation:'ping 1.5s infinite' }} />
          </div>
          <span style={{ fontSize:'0.72rem', color:'#4ADE80', fontWeight:600 }}>Firebase Terhubung</span>
        </div>

        {/* Camera Status Indicators */}
        <div style={{
          display:'flex',
          flexDirection:'column',
          gap:'0.5rem',
          padding:'0.75rem',
          marginBottom:'1.5rem',
          background:'rgba(255,255,255,0.02)',
          border:'1px solid var(--border)',
          borderRadius:'var(--radius-md)',
        }}>
          <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:600, marginBottom:'0.25rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>
            Status Kamera
          </div>
          {/* USB Camera */}
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <div style={{
              width:'8px', height:'8px', borderRadius:'50%',
              background: deviceStatus.usb_camera_connected ? '#4ADE80' : '#EF4444',
              boxShadow: deviceStatus.usb_camera_connected ? '0 0 8px #4ADE80' : '0 0 8px #EF4444'
            }} />
            <span style={{ fontSize:'0.72rem', color: deviceStatus.usb_camera_connected ? '#4ADE80' : '#EF4444', fontWeight:500 }}>
              {deviceStatus.usb_camera_connected ? 'USB Camera Connected' : 'USB Camera Not Connected'}
            </span>
          </div>
          {/* Front Camera */}
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <div style={{
              width:'8px', height:'8px', borderRadius:'50%',
              background: deviceStatus.front_camera_ready ? '#4ADE80' : '#EF4444',
              boxShadow: deviceStatus.front_camera_ready ? '0 0 8px #4ADE80' : '0 0 8px #EF4444'
            }} />
            <span style={{ fontSize:'0.72rem', color: deviceStatus.front_camera_ready ? '#4ADE80' : '#EF4444', fontWeight:500 }}>
              {deviceStatus.front_camera_ready ? 'Front Camera Ready' : 'Front Camera Not Ready'}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:'0.25rem' }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span style={{ fontSize:'1rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User info + sign out */}
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:'1rem', marginTop:'1rem' }}>
          <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:'0.5rem', padding:'0 0.5rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {user.email}
          </div>
          {!isAdmin && (
            <div className="badge badge-amber" style={{ marginBottom:'0.5rem', marginLeft:'0.5rem' }}>Kasir</div>
          )}
          {isAdmin && (
            <div className="badge badge-purple" style={{ marginBottom:'0.5rem', marginLeft:'0.5rem' }}>Admin</div>
          )}
          <button
            id="signout-btn"
            className="btn-ghost"
            onClick={signOut}
            style={{ width:'100%', justifyContent:'center', marginTop:'0.5rem' }}
          >
            🚪 Keluar
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main style={{ flex:1, overflow:'auto', padding:'2rem' }}>
        <div key={activeTab} className="animate-fade-up">
          {tabComponents[activeTab]}
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping { 0%,100% { transform: scale(1); opacity: 1; } 75% { transform: scale(2); opacity: 0; } }
      `}</style>
    </div>
  );
}
