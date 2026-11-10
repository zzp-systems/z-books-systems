/**
 * Z-Books Google Drive Integration Service
 * Standards: Firebase Auth client-side token acquisition + Google Drive v3 REST API
 * Scope: https://www.googleapis.com/auth/drive.file (App created files)
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut, Auth } from 'firebase/auth';
import rawConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  projectId: rawConfig?.projectId || 'gen-lang-client-0613047965',
  appId: rawConfig?.appId || '1:1097167688911:web:zbooks',
  apiKey: (rawConfig as any)?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSy-zbooks-drive-auth-placeholder',
  authDomain: rawConfig?.authDomain || 'gen-lang-client-0613047965.firebaseapp.com'
};

let appInstance: any = null;
let authInstance: Auth | null = null;

try {
  appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  authInstance = getAuth(appInstance);
} catch (err) {
  console.warn('Firebase Auth initialization warning:', err);
}

export const auth = authInstance as Auth;

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  size?: string;
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!auth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!auth) {
    throw new Error('Google Drive integration is currently configuring. Please try again in a moment.');
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain Google Drive OAuth access token from Firebase.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Google Sign In failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  if (auth) {
    await signOut(auth);
  }
  cachedAccessToken = null;
};

/**
 * Upload or backup JSON/text content to Google Drive
 */
export async function uploadBackupToDrive(fileName: string, content: string, mimeType: string = 'application/json'): Promise<DriveFileItem> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Google. Please Sign In first.');
  }

  // 1. Prepare metadata
  const metadata = {
    name: fileName,
    mimeType: mimeType,
    description: 'Z-Books Philippine SME Enterprise Accounting Backup'
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: mimeType }));

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,modifiedTime,size', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Drive Upload Failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data as DriveFileItem;
}

/**
 * List files created by this app in Google Drive
 */
export async function listDriveBackups(): Promise<DriveFileItem[]> {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    const res = await fetch("https://www.googleapis.com/drive/v3/files?q=trashed%3Dfalse&fields=files(id,name,mimeType,modifiedTime,webViewLink,size)&orderBy=modifiedTime%20desc&pageSize=15", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.warn("Failed to list files from Google Drive:", await res.text());
      return [];
    }

    const data = await res.json();
    return (data.files || []) as DriveFileItem[];
  } catch (err) {
    console.warn("Error fetching Drive backups:", err);
    return [];
  }
}
