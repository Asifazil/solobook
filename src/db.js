// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, writeBatch } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDMX1vuI2zS2ZMyfMIwmqRKeqQgNU7Ch4w",
  authDomain: "accounting-648fa.firebaseapp.com",
  projectId: "accounting-648fa",
  storageBucket: "accounting-648fa.firebasestorage.app",
  messagingSenderId: "537358440365",
  appId: "1:537358440365:web:6d1fa0a66de12b14d8b324"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
