"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type UserType = {
  walletAddress: string;
  username: string;
  _id: string;
  profilePic?: string;
} | null;

type UserContextType = {
  user: UserType;
  setUser: (user: UserType) => void;
};

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => undefined,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserType>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("pagerUser");
      if (storedUser) {
        const parsed: unknown = JSON.parse(storedUser);
        if (
          parsed &&
          typeof parsed === "object" &&
          "walletAddress" in parsed &&
          typeof parsed.walletAddress === "string" &&
          "username" in parsed &&
          typeof parsed.username === "string" &&
          "_id" in parsed
        ) {
          setUser(parsed as UserType);
        } else {
          localStorage.removeItem("pagerUser");
        }
      }
    } catch {
      localStorage.removeItem("pagerUser");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (user) localStorage.setItem("pagerUser", JSON.stringify(user));
    else localStorage.removeItem("pagerUser");
  }, [user, hydrated]);

  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}

export const useUser = () => useContext(UserContext);
