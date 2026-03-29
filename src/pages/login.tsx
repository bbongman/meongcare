import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(name, password);
      } else {
        await register(name, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/icons/icon-96x96.png" alt="" className="w-16 h-16 rounded-2xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">멍케어</h1>
          <p className="text-sm text-muted-foreground mt-1">반려견 건강 관리</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-muted-foreground block mb-1.5">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="사용자 이름"
              autoComplete="username"
              className="w-full h-12 px-4 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-muted-foreground block mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="4자 이상"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full h-12 px-4 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 font-medium bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || !password}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-orange-500 text-white font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-all shadow-lg shadow-primary/20"
          >
            {loading ? "..." : mode === "login" ? "로그인" : "가입하기"}
          </button>
        </form>

        <div className="text-center mt-6 space-y-2">
          {mode === "login" ? (
            <>
              <p className="text-sm text-muted-foreground">
                처음이신가요?{" "}
                <button onClick={() => { setMode("register"); setError(""); }} className="text-primary font-semibold">
                  가입하기
                </button>
              </p>
              <p className="text-xs text-muted-foreground/60">
                비밀번호를 잊으셨나요? 관리자에게 문의하세요
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              이미 계정이 있나요?{" "}
              <button onClick={() => { setMode("login"); setError(""); }} className="text-primary font-semibold">
                로그인
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
