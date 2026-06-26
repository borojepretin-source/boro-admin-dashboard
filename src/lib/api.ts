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
  image_url: string;
  active: boolean;
  created_at?: Timestamp;
}

export interface Session {
  id: string;
  voucher_code: string;
  template_id: string;
  email: string;
  photo_url: string;
  printed: boolean;
  email_sent?: boolean;
  created_at: Timestamp;
}

export interface SystemSettings {
  session_duration: number;    // seconds
  inactivity_timeout: number;  // seconds
  logo_url: string;
  booth_name: string;
}

// ─── Vouchers ──────────────────────────────────────────────────────────────────

export const vouchersRef = collection(db, 'vouchers');

export async function generateVoucher(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // removed confusable chars
  let code: string;
  let exists = true;

  // Keep generating until we get a unique code
  do {
    code = Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    const snap = await getDoc(doc(db, 'vouchers', code));
    exists = snap.exists();
  } while (exists);

  await setDoc(doc(db, 'vouchers', code), {
    is_used: false,
    created_at: serverTimestamp(),
  });

  return code;
}

export async function generateBulkVouchers(count: number): Promise<string[]> {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(await generateVoucher());
  }
  return codes;
}

export async function deleteVoucher(code: string): Promise<void> {
  await deleteDoc(doc(db, 'vouchers', code));
}

export function watchVouchers(callback: (v: Voucher[]) => void) {
  const q = query(vouchersRef, orderBy('created_at', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ code: d.id, ...d.data() } as Voucher)));
  });
}

// ─── Templates ────────────────────────────────────────────────────────────────

export const templatesRef = collection(db, 'templates');

export async function uploadTemplate(
  name: string,
  file: File
): Promise<Template> {
  const storageRef = ref(storage, `templates/${Date.now()}_${file.name}`);
  const snap = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snap.ref);

  const docRef = await addDoc(templatesRef, {
    name,
    image_url: url,
    active: true,
    created_at: serverTimestamp(),
  });

  return { id: docRef.id, name, image_url: url, active: true };
}

export async function toggleTemplate(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'templates', id), { active });
}

export async function deleteTemplate(id: string, imageUrl: string): Promise<void> {
  // Delete from Storage if URL is a Firebase Storage URL
  if (imageUrl && imageUrl.includes('firebasestorage')) {
    try {
      const storageRef = ref(storage, imageUrl);
      await deleteObject(storageRef);
    } catch { /* non-fatal */ }
  }
  await deleteDoc(doc(db, 'templates', id));
}

export function watchTemplates(callback: (t: Template[]) => void) {
  const q = query(templatesRef, orderBy('created_at', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Template)));
  });
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessionsRef = collection(db, 'sessions');

export function watchSessions(callback: (s: Session[]) => void) {
  const q = query(sessionsRef, orderBy('created_at', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Session)));
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

const settingsDocRef = doc(db, 'settings', 'config');

export async function getSettings(): Promise<SystemSettings> {
  const snap = await getDoc(settingsDocRef);
  return snap.exists()
    ? (snap.data() as SystemSettings)
    : { session_duration: 600, inactivity_timeout: 120, logo_url: '', booth_name: 'Boro Photo Booth' };
}

export async function updateSettings(settings: Partial<SystemSettings>): Promise<void> {
  await setDoc(settingsDocRef, settings, { merge: true });
}

export async function uploadLogo(file: File): Promise<string> {
  const storageRef = ref(storage, `logos/logo_${Date.now()}.${file.name.split('.').pop()}`);
  const snap = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snap.ref);
  await updateSettings({ logo_url: url });
  return url;
}

export function watchSettings(callback: (s: SystemSettings) => void) {
  return onSnapshot(settingsDocRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as SystemSettings);
    } else {
      callback({ session_duration: 600, inactivity_timeout: 120, logo_url: '', booth_name: 'Boro Photo Booth' });
    }
  });
}
