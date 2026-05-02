// @react-native-firebase/auth
// Auto-initializes from google-services.json
// No initializeApp() needed

let firebaseAuth: any = null;

try {
  const firebaseAuthModule = require('@react-native-firebase/auth');
  firebaseAuth = firebaseAuthModule.default || firebaseAuthModule;
  console.log('Firebase Auth loaded successfully');
} catch (error) {
  console.log('Firebase native auth not available:', error);
  firebaseAuth = null;
}

export { firebaseAuth };
export default firebaseAuth;
