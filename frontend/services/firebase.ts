import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyChnt8d02gM1zg47ZLbNWpyU_pphPrEz7A',
  authDomain: 'washingo-9863a.firebaseapp.com',
  projectId: 'washingo-9863a',
  storageBucket: 'washingo-9863a.firebasestorage.app',
  messagingSenderId: '1034233428104',
  appId: '1:1034233428104:android:dc9f01cd5fc8d1ce06873d',
};

let firebaseApp: any = null;
let firebaseAuth: any = null;

function initFirebase() {
  if (firebaseApp) return { app: firebaseApp, auth: firebaseAuth };

  try {
    // Try native @react-native-firebase first (dev build)
    const nativeApp = require('@react-native-firebase/app').default;
    const nativeAuth = require('@react-native-firebase/auth').default;
    firebaseApp = nativeApp;
    firebaseAuth = nativeAuth;
    console.log('Firebase: Using native @react-native-firebase');
  } catch {
    // Fallback: use JS SDK (web preview / Expo Go)
    try {
      const { initializeApp, getApps, getApp } = require('firebase/app');
      const { getAuth } = require('firebase/auth');

      if (getApps().length === 0) {
        firebaseApp = initializeApp(firebaseConfig);
        console.log('Firebase: Initialized JS SDK');
      } else {
        firebaseApp = getApp();
        console.log('Firebase: JS SDK already initialized');
      }
      firebaseAuth = getAuth(firebaseApp);
    } catch (e) {
      console.log('Firebase: No SDK available, using backend OTP fallback');
      firebaseApp = null;
      firebaseAuth = null;
    }
  }

  return { app: firebaseApp, auth: firebaseAuth };
}

// Initialize immediately on import
const { app, auth } = initFirebase();

export { firebaseConfig, firebaseApp, firebaseAuth };
export default initFirebase;
