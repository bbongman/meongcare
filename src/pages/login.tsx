import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

function handleKakaoLogin() {
  const key = import.meta.env.VITE_KAKAO_REST_API_KEY;
  if (!key) { alert("카카오 로그인 설정이 필요합니다."); return; }
  const redirectUri = `${window.location.origin}/oauth-callback`;
  const url = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${key}&redirect_uri=${encodeURIComponent(redirectUri)}&state=kakao`;
  window.location.href = url;
}

function handleNaverLogin() {
  const clientId = import.meta.env.VITE_NAVER_CLIENT_ID;
  if (!clientId) { alert("네이버 로그인 설정이 필요합니다."); return; }
  const redirectUri = `${window.location.origin}/oauth-callback`;
  const state = `naver_${Math.random().toString(36).slice(2)}`;
  const url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  window.location.href = url;
}

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
    <div className="min-h-dvh bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl font-black">노크</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">노크에 오신 걸 환영해요</h1>
          <p className="text-sm text-gray-400 mt-1">우리 동네 강아지 커뮤니티</p>
        </div>

        {/* 소셜 로그인 */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleKakaoLogin}
            className="w-full h-12 rounded-xl bg-[#FEE500] text-[#3C1E1E] font-semibold text-sm flex items-center justify-center gap-2.5 hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M9 0.9C4.5 0.9 0.9 3.78 0.9 7.29C0.9 9.45 2.22 11.34 4.32 12.51L3.51 15.57C3.42 15.84 3.69 16.08 3.96 15.93L7.56 13.68C8.01 13.74 8.49 13.77 9 13.77C13.5 13.77 17.1 10.89 17.1 7.29C17.1 3.78 13.5 0.9 9 0.9Z" fill="#3C1E1E"/>
            </svg>
            카카오로 계속하기
          </button>
          <button
            onClick={handleNaverLogin}
            className="w-full h-12 rounded-xl bg-[#03C75A] text-white font-semibold text-sm flex items-center justify-center gap-2.5 hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <span className="font-black text-base leading-none">N</span>
            네이버로 계속하기
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 font-medium">또는</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="사용자 이름"
            autoComplete="username"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:border-blue-400 transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (4자 이상)"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-gray-900 text-sm focus:outline-none focus:border-blue-400 transition-colors"
          />

          {error && (
            <p className="text-sm text-red-500 font-medium bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || !password}
            className="w-full h-12 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 disabled:opacity-40 transition-all"
          >
            {loading ? "..." : mode === "login" ? "로그인" : "가입하기"}
          </button>
        </form>

        <div className="text-center mt-5">
          {mode === "login" ? (
            <p className="text-sm text-gray-400">
              처음이신가요?{" "}
              <button onClick={() => { setMode("register"); setError(""); }} className="text-blue-500 font-semibold">
                가입하기
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              이미 계정이 있나요?{" "}
              <button onClick={() => { setMode("login"); setError(""); }} className="text-blue-500 font-semibold">
                로그인
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
