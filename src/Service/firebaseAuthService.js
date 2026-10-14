import firebaseAdmin from "../config/firebaseAdmin.js";
import AppError from "../utils/AppError.js";

const verifyGoogleIdToken = async (idToken) => {
  if (!idToken) {
    throw new AppError("Google ID token is required.", 400);
  }

  let decodedToken;

  try {
    decodedToken = await firebaseAdmin.verifyIdToken(idToken);
  } catch (error) {
    console.error("Firebase ID token verification failed:", error.message);

    throw new AppError("Invalid or expired Firebase ID token.", 401);
  }

  if (!decodedToken.email || !decodedToken.email_verified) {
    throw new AppError("A verified Google email is required.", 401);
  }

  return {
    googleId: decodedToken.uid,
    email: decodedToken.email.toLowerCase(),
    name: decodedToken.name || decodedToken.email.split("@")[0],
    profilePicture: decodedToken.picture || "",
  };
};



export default verifyGoogleIdToken;
