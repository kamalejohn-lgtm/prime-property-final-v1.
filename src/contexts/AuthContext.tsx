import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  query,
  where,
  getDocs,
  collection,
  deleteDoc,
  getDocFromServer
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { UserProfile } from "../types";
import { toast } from "sonner";

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        console.log("Auth state changed: User logged in", firebaseUser.email);
        try {
          // 1. Try to find by UID
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            console.log("Profile found by UID.");
            const existingProfile = docSnap.data() as UserProfile;
            // Force admin role for bootstrap emails if they are currently pending
            const officialAdminEmails = [
              "admin@ecomig.org",
              "mhq@ecomig.org",
              "fhq@ecomig.org",
              "dfc@ecomig.org",
              "jman@ecomig.org",
              "jint@ecomig.org",
              "jops@ecomig.org",
              "kamalejohn@gmail.com"
            ];
            const isAdminEmail = officialAdminEmails.includes(firebaseUser.email || "");
            if (isAdminEmail && existingProfile.role === "pending") {
              console.log("Forcing admin role for bootstrap email...");
              existingProfile.role = "admin";
              await updateDoc(docRef, { role: "admin" });
            }
            setProfile(existingProfile);
          } else {
            // 2. Try to find by Email (Pre-authorized case)
            console.log("No UID profile, checking for pre-authorized email...");
            const q = query(collection(db, "users"), where("username", "==", firebaseUser.email));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
              const preAuthDoc = snap.docs[0];
              const preAuthData = preAuthDoc.data() as UserProfile;
              console.log("Found pre-authorized profile by email. Linking to UID...");
              
              // Link this profile to the UID for future fast lookups
              const updatedProfile = { ...preAuthData, id: firebaseUser.uid };
              await setDoc(doc(db, "users", firebaseUser.uid), updatedProfile);
              
              // Optionally delete the old random-id doc if it's different
              if (preAuthDoc.id !== firebaseUser.uid) {
                await deleteDoc(doc(db, "users", preAuthDoc.id));
              }
              
              setProfile(updatedProfile);
            } else {
              // 3. Create new pending profile
              console.log("No pre-authorization found, creating pending profile...");
              const officialAdminEmails = [
                "admin@ecomig.org",
                "mhq@ecomig.org",
                "fhq@ecomig.org",
                "dfc@ecomig.org",
                "jman@ecomig.org",
                "jint@ecomig.org",
                "jops@ecomig.org",
                "kamalejohn@gmail.com"
              ];
              const isAdminEmail = officialAdminEmails.includes(firebaseUser.email || "");
              const pendingProfile: UserProfile = {
                id: firebaseUser.uid,
                username: firebaseUser.email || "user",
                role: isAdminEmail ? "admin" : "pending",
                unit: "Unknown",
                full_name: firebaseUser.displayName || "New User",
                created_at: new Date().toISOString()
              };
              await setDoc(docRef, pendingProfile);
              setProfile(pendingProfile);
            }
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        console.log("Auth state changed: User logged out");
        setProfile(null);
      }
      setLoading(false);
    });

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

    return () => unsubscribe();
  }, []);

  const login = async (usernameOrEmail: string, pass: string) => {
    let email = usernameOrEmail;
    try {
      if (!email.includes("@")) {
        email = `${usernameOrEmail.toLowerCase().trim()}@ecomig.org`;
      }
      
      console.log(`Attempting login for ${email}...`);
      await signInWithEmailAndPassword(auth, email, pass);
      console.log("Login successful.");
    } catch (error: any) {
      console.error("Auth error code:", error.code, "Message:", error.message);
      
      // Check if this is a pre-authorized user in Firestore
      const q = query(collection(db, "users"), where("username", "==", email));
      const snap = await getDocs(q);
      const isPreAuthorized = !snap.empty;
      
      const isNewUserError = error.code === "auth/user-not-found" || 
                            error.code === "auth/invalid-credential" || 
                            error.code === "auth/invalid-login-credentials";
      
      if (isPreAuthorized && isNewUserError) {
        try {
          console.log(`Bootstrapping account for pre-authorized user ${email}...`);
          await createUserWithEmailAndPassword(auth, email, pass);
          console.log("Account created and logged in.");
          return;
        } catch (createError: any) {
          console.error("Create error code:", createError.code);
          if (createError.code === "auth/operation-not-allowed") {
            throw new Error("Email/Password login is currently disabled in the Firebase Console. Please enable it under Authentication > Sign-in method.");
          }
          if (createError.code === "auth/email-already-in-use") {
            // User exists but password was wrong (since signIn failed)
            throw new Error("Incorrect password for this account. If you've forgotten it, please use the 'Forgot Password' link to reset it.");
          }
          throw createError;
        }
      }
      
      // Fallback for official bootstrap emails that might not be in Firestore yet
      const officialEmails = [
        "admin@ecomig.org",
        "mhq@ecomig.org",
        "fhq@ecomig.org",
        "dfc@ecomig.org",
        "jman@ecomig.org",
        "jint@ecomig.org",
        "jops@ecomig.org",
        "kamalejohn@gmail.com"
      ];

      const isOfficialEmail = officialEmails.includes(email.toLowerCase().trim());
      
      if (isOfficialEmail && isNewUserError) {
        try {
          console.log(`Bootstrapping official account ${email}...`);
          await createUserWithEmailAndPassword(auth, email, pass);
          return;
        } catch (createError: any) {
          if (createError.code === "auth/email-already-in-use") {
            throw new Error("Incorrect password for this account. If you've forgotten it, please use the 'Forgot Password' link to reset it.");
          }
          throw createError;
        }
      }
      
      if (error.code === "auth/operation-not-allowed") {
        throw new Error("Email/Password login is currently disabled in the Firebase Console. Please enable it under Authentication > Sign-in method.");
      }
      
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Google Login Error:", error);
      toast.error("Error logging in with Google: " + error.message);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, login, loginWithGoogle, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
