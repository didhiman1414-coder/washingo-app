// @react-native-firebase/auth — auto-initializes from google-services.json
// No initializeApp() needed. No firebase web SDK used.

let auth: any = null;

try {
  auth = require('@react-native-firebase/auth').default;
} catch {
  // Native Firebase not available (web preview) — backend OTP fallback used
  console.log('Firebase native auth not available — using backend OTP fallback');
}

export { auth as firebaseAuth };
export default auth;
