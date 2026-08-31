import { useCallback, useEffect, useState } from "react";
import { formatRequestError } from "../../../lib/api-error";
import { restoreCurrentUser } from "../../auth/api";
import type { AuthUser } from "../../auth/types";
import type { CurrentUserState } from "../types";

export function useCurrentUser(): CurrentUserState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const current = await restoreCurrentUser();

      if (!current) {
        globalThis.location.assign("/login");
        return;
      }

      setUser(current);
    } catch (caught) {
      setError(formatRequestError(caught));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { error, isLoading, load, user };
}
