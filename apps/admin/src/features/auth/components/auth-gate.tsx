import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { restoreCurrentUser } from "../api";
import { readAuthSession } from "../auth-session";
import type { AuthUser } from "../types";

export function AuthGate(props: { children: ReactNode }) {
  const location = useLocation();
  const [user, setUser] = useState<AuthUser | null>(
    () => readAuthSession()?.user ?? null,
  );
  const [isChecking, setIsChecking] = useState(Boolean(readAuthSession()));

  useEffect(() => {
    let isActive = true;

    async function restore() {
      const current = await restoreCurrentUser();

      if (isActive) {
        setUser(current);
        setIsChecking(false);
      }
    }

    void restore();

    return () => {
      isActive = false;
    };
  }, []);

  if (isChecking) {
    return null;
  }

  if (!user) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  return props.children;
}
