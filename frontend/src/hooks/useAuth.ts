import { useContext } from "react";
import { AuthContext } from "@/providers/AuthContext";
import type { AuthContextValue } from "@/providers/AuthProvider";

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
