import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Role = "manager" | "foreman" | "tools";

export const ROLE_LABELS: Record<Role, string> = {
  manager: "Руководитель",
  foreman: "Мастер",
  tools: "Ответственный за инструмент",
};

interface RoleCtx {
  role: Role;
  setRole: (r: Role) => void;
}

const Ctx = createContext<RoleCtx>({ role: "manager", setRole: () => {} });

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("manager");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("sigma-role") : null;
    if (saved === "manager" || saved === "foreman" || saved === "tools") setRoleState(saved);
  }, []);
  const setRole = (r: Role) => {
    setRoleState(r);
    if (typeof window !== "undefined") localStorage.setItem("sigma-role", r);
  };
  return <Ctx.Provider value={{ role, setRole }}>{children}</Ctx.Provider>;
}

export const useRole = () => useContext(Ctx);
