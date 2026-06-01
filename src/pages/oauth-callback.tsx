import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function OAuthCallback() {
  const [, navigate] = useLocation();
  const { loginWithSocial } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state") || "";
    const redirectUri = window.location.origin + "/oauth-callback";

    if (!code) {
      setError("인증 코드가 없어요.");
      return;
    }

    const provider = state.startsWith("kakao") ? "kakao" : "naver";

    loginWithSocial(provider, code, state, redirectUri)
      .then(() => navigate("/"))
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-white">
        <p className="text-red-500 font-semibold text-sm mb-4">{error}</p>
        <button onClick={() => navigate("/login")} className="text-blue-500 text-sm font-semibold">
          로그인으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm text-gray-400">로그인 중...</p>
    </div>
  );
}
