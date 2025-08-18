
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDE0EGTX6Bny_Ie0S5uBRLe8NbbAuz8tEY",
  authDomain: "orderflow-yqf9u.firebaseapp.com",
  projectId: "orderflow-yqf9u",
  storageBucket: "orderflow-yqf9u.firebasestorage.app",
  messagingSenderId: "727657225590",
  appId: "1:727657225590:web:8f4e5160657ff6e5066e57"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
