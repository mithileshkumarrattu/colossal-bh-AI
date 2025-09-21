"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  type User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth"
import { auth } from "./firebase"
import { firebaseService } from "./firebase-service"
import type { User } from "./types"

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[v0] Auth state changed:", firebaseUser?.uid)
      setFirebaseUser(firebaseUser)

      if (firebaseUser) {
        try {
          let userData = await firebaseService.getUser(firebaseUser.uid)

          if (!userData) {
            // Create new user document with Firebase UID as document ID
            await firebaseService.createUserWithId(firebaseUser.uid, {
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "Anonymous User",
              photoURL: firebaseUser.photoURL || undefined,
              role: "user",
              contexts: {
                family: 0.3,
                workplace: 0.1,
                educational: 0.2,
                social: 0.4,
              },
              notificationsEnabled: true,
              isOnline: true,
            })
            userData = await firebaseService.getUser(firebaseUser.uid)
          } else {
            // Update online status
            await firebaseService.updateUser(firebaseUser.uid, { isOnline: true })
          }

          setUser(userData)
        } catch (error) {
          console.error("[v0] Error handling auth state:", error)
        }
      } else {
        setUser(null)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)

    // Update Firebase Auth profile
    await updateProfile(result.user, { displayName })

    // Create user document with Firebase UID
    await firebaseService.createUserWithId(result.user.uid, {
      email,
      displayName,
      role: "user",
      contexts: {
        family: 0.3,
        workplace: 0.1,
        educational: 0.2,
        social: 0.4,
      },
      notificationsEnabled: true,
      isOnline: true,
    })
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const logout = async () => {
    if (firebaseUser) {
      await firebaseService.updateUser(firebaseUser.uid, { isOnline: false })
    }
    await signOut(auth)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
