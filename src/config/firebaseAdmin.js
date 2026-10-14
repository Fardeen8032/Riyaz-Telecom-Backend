import "dotenv/config";
import { cert,getApp,getApps,initializeApp} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const initializeFirebaseAdmin = () => {
  const existingApp = getApps().find(
    (app) => app.name === "[DEFAULT]"
  );

  if (existingApp) {
    return existingApp;
  }

  const serviceAccountJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!serviceAccountJson || !projectId) {
    throw new Error(
      "Firebase Admin configuration is missing. Check FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_PROJECT_ID."
    );
  }

  let serviceAccount;

  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON."
    );
  }

  if (serviceAccount.project_id !== projectId) {
    throw new Error(
      "Firebase project ID does not match the service account."
    );
  }

  return initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });
};

const firebaseApp = initializeFirebaseAdmin();

const firebaseAdmin = getAuth(firebaseApp);

export default firebaseAdmin;
