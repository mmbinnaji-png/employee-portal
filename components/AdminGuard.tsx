"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type AdminGuardProps = {
  children: ReactNode;
};

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        setChecking(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));

        if (!userSnap.exists()) {
          router.replace("/login");
          setChecking(false);
          return;
        }

        const userData = userSnap.data();

        if (userData.role !== "admin") {
          router.replace("/dashboard");
          setChecking(false);
          return;
        }

        setAllowed(true);
      } catch {
        router.replace("/login");
      } finally {
        setChecking(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (checking) {
    return <div style={{ padding: 24 }}>Checking access...</div>;
  }

  if (!allowed) return null;

  return <>{children}</>;
}