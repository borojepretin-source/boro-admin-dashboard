// Centralized Firestore/Storage access for the admin dashboard
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from './firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Voucher {
  code: string;       // document ID = 4-char code e.g. "A7FD"
  is_used: boolean;
  created_at: Timestamp;
  used_at?: Timestamp;
}

export interface Template {
  id: string;
  name: string;
  image_url: string; // Keeps backwards compatibility
  thumbnail: string;
  templateImage: string;
  orientation: 'portrait' | 'landscape';
  print_size: string;
  category: string;
  photo_count: number;
  active: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  created_at?: Timestamp;
}

export interface LayoutSlot {
  slotNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fit: string;
  radius: number;
  opacity: number;
}

export interface TemplateLayout {
  slots: LayoutSlot[];
}

export interface Session {
  id: string;
  code: string;
  status: 'STARTED' | 'FINISHED' | 'ABANDONED';
  started_at: Timestamp;
  finished_at?: Timestamp;
  device: string;
  template_id?: string;
  template_name?: string;
  email?: string;
  photo_url?: string;
  printed: boolean;
  photo_count?: number;
  email_sent?: boolean;
  // Backward compatibility fields
  voucher_code?: string;
  created_at?: Timestamp;
}

export interface SystemSettings {
  session_duration: number;    // seconds
  inactivity_timeout: number;  // seconds
  logo_url: string;
  booth_name: string;
  photo_count: number;         // number of photos per session (default: 4)
  print_size: string;          // '4R' | 'A5' | 'A4' (default: '4R')
  email_enabled: boolean;      // whether email is enabled (default: true)
  printer_enabled: boolean;    // whether printing is enabled (default: true)
  auto_detect_camera: boolean; // whether to auto-detect USB camera (default: true)
}

// ─── Error helper ─────────────────────────────────────────────────────────────

function isPermissionDenied(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'permission-denied'
  );
}

// ─── Vouchers ──────────────────────────────────────────────────────────────────

export const vouchersRef = collection(db, 'vouchers');

/**
 * Generate a unique 4-character voucher code and write it to Firestore.
 * Checks for duplicates before writing.
 * Throws on permission-denied so the UI can show a meaningful error.
 */
export async function generateVoucher(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // removed confusable chars
  let code = '';
  let exists = true;

  // Keep generating until we get a unique code
  do {
    code = Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    console.log(`[Voucher] Checking code: ${code}`);
    const snap = await getDoc(doc(db, 'vouchers', code));
    exists = snap.exists();
    if (exists) console.log(`[Voucher] Code ${code} already exists, retrying...`);
  } while (exists);

  console.log(`[Voucher] Writing voucher: ${code}`);
  await setDoc(doc(db, 'vouchers', code), {
    is_used: false,
    created_at: serverTimestamp(),
  });
  console.log(`[Voucher] Voucher generated: ${code}`);

  return code;
}

export async function generateBulkVouchers(count: number): Promise<string[]> {
  console.log(`[Voucher] Generating ${count} vouchers...`);
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(await generateVoucher());
  }
  console.log(`[Voucher] Bulk generation complete:`, codes);
  return codes;
}

export async function deleteVoucher(code: string): Promise<void> {
  console.log(`[Voucher] Deleting voucher: ${code}`);
  await deleteDoc(doc(db, 'vouchers', code));
  console.log(`[Voucher] Deleted: ${code}`);
}

/**
 * Watch the vouchers collection in real-time.
 * Calls onError if permission is denied — does NOT crash the app.
 */
export function watchVouchers(
  callback: (v: Voucher[]) => void,
  onError?: (err: Error) => void
) {
  console.log('[Firebase] Reading vouchers...');
  const q = query(vouchersRef, orderBy('created_at', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      console.log(`[Firebase] Vouchers snapshot: ${snap.docs.length} docs`);
      callback(snap.docs.map((d) => ({ code: d.id, ...d.data() } as Voucher)));
    },
    (err) => {
      if (isPermissionDenied(err)) {
        console.error('[Firebase] Permission denied reading vouchers. User may not be authenticated as admin.');
      } else {
        console.error('[Firebase] Error reading vouchers:', err.message);
      }
      onError?.(err);
    }
  );
}

// ─── Templates ────────────────────────────────────────────────────────────────

export const templatesRef = collection(db, 'templates');

export async function uploadTemplate(
  name: string,
  file: File,
  metadata?: Partial<Omit<Template, 'id' | 'created_at'>>,
  onProgress?: (progress: number) => void
): Promise<Template> {
  console.log(`[Template] Uploading template: ${name}`);
  const storageRef = ref(storage, `templates/${Date.now()}_${file.name}`);
  
  const uploadTask = uploadBytesResumable(storageRef, file);

  // Monitor the upload task progress
  await new Promise<void>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(pct);
      },
      (error) => {
        reject(error);
      },
      () => {
        resolve();
      }
    );
  });

  const url = await getDownloadURL(uploadTask.snapshot.ref);

  const newTemplateData = {
    name,
    image_url: url,
    templateImage: url,
    thumbnail: url,
    active: true,
    orientation: metadata?.orientation || 'portrait',
    print_size: metadata?.print_size || '4R',
    category: metadata?.category || 'General',
    photo_count: metadata?.photo_count || 4,
    canvasWidth: metadata?.canvasWidth || 1200,
    canvasHeight: metadata?.canvasHeight || 1800,
    created_at: serverTimestamp(),
  };

  const docRef = await addDoc(templatesRef, newTemplateData);

  // Initialize a default active layout in subcollection layouts/active
  const layoutRef = doc(db, 'templates', docRef.id, 'layouts', 'active');
  const defaultSlots: LayoutSlot[] = [];
  const pCount = metadata?.photo_count || 4;

  const w = newTemplateData.canvasWidth;
  const h = newTemplateData.canvasHeight;
  
  // Arrange default photo boxes nicely based on layout count
  for (let i = 0; i < pCount; i++) {
    defaultSlots.push({
      slotNumber: i + 1,
      x: Math.round(w * 0.1),
      y: Math.round((h / pCount) * i + (h / pCount) * 0.1),
      width: Math.round(w * 0.8),
      height: Math.round((h / pCount) * 0.7),
      rotation: 0,
      fit: 'cover',
      radius: 12,
      opacity: 1.0
    });
  }

  await setDoc(layoutRef, { slots: defaultSlots });

  console.log(`[Template] Template uploaded with ID: ${docRef.id}`);
  return { id: docRef.id, ...newTemplateData } as unknown as Template;
}

export async function getTemplateLayout(templateId: string): Promise<TemplateLayout | null> {
  const docRef = doc(db, 'templates', templateId, 'layouts', 'active');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as TemplateLayout;
  }
  return null;
}

export async function saveTemplateLayout(templateId: string, layout: TemplateLayout): Promise<void> {
  const docRef = doc(db, 'templates', templateId, 'layouts', 'active');
  await setDoc(docRef, layout);
}

export function watchTemplateLayout(
  templateId: string,
  callback: (layout: TemplateLayout | null) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, 'templates', templateId, 'layouts', 'active');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as TemplateLayout);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.error('[Firebase] Error reading template layout:', err.message);
      onError?.(err);
    }
  );
}

export async function toggleTemplate(id: string, active: boolean): Promise<void> {
  console.log(`[Template] Setting template ${id} active=${active}`);
  await updateDoc(doc(db, 'templates', id), { active });
}

export async function deleteTemplate(id: string, imageUrl: string): Promise<void> {
  // Delete from Storage if URL is a Firebase Storage URL
  if (imageUrl && imageUrl.includes('firebasestorage')) {
    try {
      const storageRef = ref(storage, imageUrl);
      await deleteObject(storageRef);
      console.log('[Template] Storage file deleted');
    } catch { /* non-fatal — file may already be gone */ }
  }
  await deleteDoc(doc(db, 'templates', id));
  console.log(`[Template] Template deleted: ${id}`);
}

/**
 * Watch the templates collection in real-time.
 * Calls onError if permission is denied — does NOT crash the app.
 */
export function watchTemplates(
  callback: (t: Template[]) => void,
  onError?: (err: Error) => void
) {
  console.log('[Firebase] Reading templates...');
  const q = query(templatesRef, orderBy('created_at', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      console.log(`[Firebase] Templates snapshot: ${snap.docs.length} docs`);
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Template)));
    },
    (err) => {
      if (isPermissionDenied(err)) {
        console.error('[Firebase] Permission denied reading templates.');
      } else {
        console.error('[Firebase] Error reading templates:', err.message);
      }
      onError?.(err);
    }
  );
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessionsRef = collection(db, 'sessions');

/**
 * Watch the sessions collection in real-time.
 * Calls onError if permission is denied — does NOT crash the app.
 */
export function watchSessions(
  callback: (s: Session[]) => void,
  onError?: (err: Error) => void
) {
  console.log('[Firebase] Reading sessions...');
  // Query all sessions and sort/map client-side for backward compatibility and robustness
  return onSnapshot(
    sessionsRef,
    (snap) => {
      console.log(`[Firebase] Sessions snapshot: ${snap.docs.length} docs`);
      const mapped = snap.docs.map((d) => {
        const data = d.data();
        const code = data.code || data.voucher_code || '';
        const startedAt = data.started_at || data.created_at || Timestamp.now();
        const status = data.status || (data.email ? 'FINISHED' : 'STARTED');
        return {
          id: d.id,
          ...data,
          code,
          status,
          started_at: startedAt,
          printed: data.printed || false,
        } as Session;
      });

      // Sort descending by started_at
      mapped.sort((a, b) => b.started_at.toMillis() - a.started_at.toMillis());
      callback(mapped);
    },
    (err) => {
      if (isPermissionDenied(err)) {
        console.error('[Firebase] Permission denied reading sessions.');
      } else {
        console.error('[Firebase] Error reading sessions:', err.message);
      }
      onError?.(err);
    }
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

const settingsDocRef = doc(db, 'settings', 'config');

export async function getSettings(): Promise<SystemSettings> {
  console.log('[Firebase] Reading settings...');
  const defaults: SystemSettings = {
    session_duration: 600,
    inactivity_timeout: 120,
    logo_url: '',
    booth_name: 'Boro Photo Booth',
    photo_count: 4,
    print_size: '4R',
    email_enabled: true,
    printer_enabled: true,
    auto_detect_camera: true,
  };
  try {
    const snap = await getDoc(settingsDocRef);
    if (snap.exists()) {
      console.log('[Firebase] Settings loaded');
      return { ...defaults, ...snap.data() as SystemSettings };
    }
    console.log('[Firebase] Settings document not found, using defaults');
    return defaults;
  } catch (err) {
    if (isPermissionDenied(err)) {
      console.error('[Firebase] Permission denied reading settings.');
    } else {
      console.error('[Firebase] Error reading settings:', err);
    }
    return defaults;
  }
}

export async function updateSettings(settings: Partial<SystemSettings>): Promise<void> {
  console.log('[Firebase] Writing settings...');
  await setDoc(settingsDocRef, settings, { merge: true });
  console.log('[Firebase] Settings saved');
}

export async function uploadLogo(file: File): Promise<string> {
  console.log('[Firebase] Uploading logo...');
  const storageRef = ref(storage, `logos/logo_${Date.now()}.${file.name.split('.').pop()}`);
  const snap = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snap.ref);
  await updateSettings({ logo_url: url });
  console.log('[Firebase] Logo uploaded');
  return url;
}

export function watchSettings(
  callback: (s: SystemSettings) => void,
  onError?: (err: Error) => void
) {
  const defaults: SystemSettings = {
    session_duration: 600, inactivity_timeout: 120, logo_url: '', booth_name: 'Boro Photo Booth',
    photo_count: 4, print_size: '4R', email_enabled: true, printer_enabled: true, auto_detect_camera: true,
  };
  return onSnapshot(
    settingsDocRef,
    (snap) => {
      if (snap.exists()) {
        callback({ ...defaults, ...snap.data() as SystemSettings });
      } else {
        callback(defaults);
      }
    },
    (err) => {
      if (isPermissionDenied(err)) {
        console.error('[Firebase] Permission denied reading settings.');
      } else {
        console.error('[Firebase] Error reading settings:', err.message);
      }
      onError?.(err);
    }
  );
}

export interface DeviceStatus {
  usb_camera_connected: boolean;
  front_camera_ready: boolean;
  firebase_connected?: boolean;
  internet_available?: boolean;
  printer_ready?: boolean;
  last_updated?: Timestamp;
}

const deviceStatusDocRef = doc(db, 'settings', 'device_status');

export function watchDeviceStatus(
  callback: (status: DeviceStatus) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(
    deviceStatusDocRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as DeviceStatus);
      } else {
        callback({ usb_camera_connected: false, front_camera_ready: false });
      }
    },
    (err) => {
      console.error('[Firebase] Error reading device status:', err.message);
      onError?.(err);
    }
  );
}

// ─── Auto-Cleanup 30 Hari ──────────────────────────────────────────────────────

/**
 * Hapus sesi foto dan file di Firebase Storage yang berumur lebih dari 30 hari secara otomatis.
 * Juga membersihkan voucher lama yang tidak pernah dipakai > 30 hari.
 */
export async function cleanupOldSessions(retentionDays = 30): Promise<{ deletedSessions: number; deletedVouchers: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

  console.log(`[Auto-Cleanup] Mulai membersihkan data lebih dari ${retentionDays} hari (sebelum ${cutoffDate.toLocaleDateString('id-ID')})...`);
  let deletedSessions = 0;
  let deletedVouchers = 0;

  // 1. Bersihkan sessions lama beserta file fotonya di Storage
  try {
    const oldSessionsQuery = query(
      sessionsRef,
      where('started_at', '<=', cutoffTimestamp)
    );
    const snap = await getDocs(oldSessionsQuery);

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      // Hapus foto di Storage jika tersimpan di Firebase Storage
      if (data.photo_url && typeof data.photo_url === 'string' && data.photo_url.includes('firebasestorage')) {
        try {
          const photoRef = ref(storage, data.photo_url);
          await deleteObject(photoRef);
          console.log(`[Auto-Cleanup] Foto storage terhapus: ${docSnap.id}`);
        } catch {
          // File foto mungkin sudah terhapus, abaikan non-fatal
        }
      }
      await deleteDoc(docSnap.ref);
      deletedSessions++;
    }
  } catch (err) {
    console.error('[Auto-Cleanup] Error membersihkan sessions lama:', err);
  }

  // 2. Bersihkan voucher lama yang menggantung/tidak terpakai > 30 hari
  try {
    const oldVouchersQuery = query(
      vouchersRef,
      where('created_at', '<=', cutoffTimestamp)
    );
    const snapVouchers = await getDocs(oldVouchersQuery);
    for (const docSnap of snapVouchers.docs) {
      await deleteDoc(docSnap.ref);
      deletedVouchers++;
    }
  } catch (err) {
    console.error('[Auto-Cleanup] Error membersihkan vouchers lama:', err);
  }

  if (deletedSessions > 0 || deletedVouchers > 0) {
    console.log(`[Auto-Cleanup] Selesai: Berhasil menghapus ${deletedSessions} sesi foto lama dan ${deletedVouchers} voucher kedaluwarsa.`);
  } else {
    console.log('[Auto-Cleanup] Database bersih, tidak ada data berumur > 30 hari.');
  }

  return { deletedSessions, deletedVouchers };
}
