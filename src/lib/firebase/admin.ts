import "server-only";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const APP_NAME = "kids-bank-admin";

function getAdminApp(): App {
  const existingApp = getApps().find((app) => app.name === APP_NAME);
  if (existingApp) return existingApp;

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  // Netlify: use service-account fields stored as server-only environment variables.
  // Never put these values in NEXT_PUBLIC_* variables or source control.
  if (clientEmail || privateKey) {
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Firebase Admin environment variables are incomplete."
      );
    }

    return initializeApp(
      {
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      },
      APP_NAME
    );
  }

  // Local development: continue using GOOGLE_APPLICATION_CREDENTIALS.
  return initializeApp(
    {
      credential: applicationDefault(),
      ...(projectId ? { projectId } : {}),
    },
    APP_NAME
  );
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
