import { initializeApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getFunctions } from "firebase/functions"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyE_HGEgorSj5cdVUq52e48jK4J6yUrhY",
  authDomain: "bhai-5200e.firebaseapp.com",
  projectId: "bhai-5200e",
  storageBucket: "bhai-5200e.firebasestorage.app",
  messagingSenderId: "586513480872",
  appId: "1:586513480872:web:5fe67694b374b274e1169d",
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app)
export default app
