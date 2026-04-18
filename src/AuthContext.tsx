import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string;

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  balance: number;
  createdAt?: any;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  login:             (email: string, password: string) => Promise<void>;
  register:          (name: string, email: string, password: string) => Promise<void>;
  logout:            () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile:    () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const unsubProfileRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      // نظّف المستمع السابق
      if (unsubProfileRef.current) {
        unsubProfileRef.current();
        unsubProfileRef.current = null;
      }

      setUser(u);

      if (!u) {
        setProfile(null);
        setLoading(false);   // لا يوجد مستخدم → جاهز
        return;
      }

      // المستخدم موجود → انتظر البروفايل قبل loading=false
      setLoading(true);
      const ref = doc(db, "users", u.uid);
      let firstSnapshot = true;

      const unsubProfile = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else if (firstSnapshot) {
          // أنشئ البروفايل إذا ما موجود
          const newProfile: UserProfile = {
            uid: u.uid, name: u.displayName || "", email: u.email || "",
            balance: 0, createdAt: new Date(),
          };
          setDoc(ref, newProfile).catch(console.error);
          setProfile(newProfile);
        }
        if (firstSnapshot) {
          firstSnapshot = false;
          setLoading(false);   // البروفايل وصل → جاهز
        }
      }, () => {
        // في حالة خطأ في قراءة البروفايل (مثلاً زائر)
        setProfile(null);
        setLoading(false);
      });

      unsubProfileRef.current = unsubProfile;
    });

    return () => {
      unsubAuth();
      if (unsubProfileRef.current) unsubProfileRef.current();
    };
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid, name, email, phone: "", address: "",
      balance: 0, createdAt: new Date(),
    });
  };

  const logout = async () => { await signOut(auth); };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid), data, { merge: true });
    if (data.name) await updateProfile(user, { displayName: data.name });
  };

  const refreshProfile = async () => {
    if (!user) return;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) setProfile(snap.data() as UserProfile);
  };

  const isAdmin = !!user && user.email?.toLowerCase() === ADMIN_EMAIL?.toLowerCase();

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, login, register, logout, updateUserProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
