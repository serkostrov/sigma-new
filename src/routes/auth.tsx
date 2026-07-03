import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName || email },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.toLowerCase().includes("invalid login")) setError("Неверный email или пароль");
      else if (msg.toLowerCase().includes("already registered")) setError("Пользователь уже зарегистрирован");
      else setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
            СК
          </div>
          <div>
            <div className="font-semibold text-lg leading-tight">СК СИГМА</div>
            <div className="text-xs text-muted-foreground">Внутренняя система</div>
          </div>
        </div>

        <h1 className="text-xl font-semibold mb-1">
          {mode === "login" ? "Вход в систему" : "Регистрация"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "login"
            ? "Введите email и пароль для входа"
            : "Создайте учётную запись сотрудника"}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">ФИО</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ivanov@sk-sigma.ru"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Пароль</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Подождите…" : mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              Нет учётной записи?{" "}
              <button
                onClick={() => { setError(null); setMode("signup"); }}
                className="text-primary font-medium hover:underline"
              >
                Зарегистрироваться
              </button>
            </>
          ) : (
            <>
              Уже есть учётная запись?{" "}
              <button
                onClick={() => { setError(null); setMode("login"); }}
                className="text-primary font-medium hover:underline"
              >
                Войти
              </button>
            </>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-border text-xs text-muted-foreground flex items-start gap-2">
          <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Первый зарегистрированный пользователь автоматически получает роль «Руководитель». Остальные регистрируются как «Мастер» — роль изменяет Руководитель.
          </span>
        </div>
      </div>
    </div>
  );
}