import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCeaipUe5l93DTozhrRICqPklaP5BSErUc',
  authDomain: 'fantasy-realms-web.firebaseapp.com',
  projectId: 'fantasy-realms-web',
  storageBucket: 'fantasy-realms-web.firebasestorage.app',
  messagingSenderId: '590470785583',
  appId: '1:590470785583:web:f7555850d8a417de2f74da',
  measurementId: 'G-PSE311JKV4',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
