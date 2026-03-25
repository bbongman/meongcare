import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { Trash2, KeyRound, Users } from "lucide-react";

interface UserInfo {
  id: string;
  name: string;
  gender?: string;
  phone?: string;
  role?: string;
  createdAt?: string;
}

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  async function fetchUsers() {
    const token = localStorage.getItem("meongcare_token");
    const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleReset(name: string) {
    if (!newPassword || newPassword.length < 4) { setMessage("4자 이상 입력하세요"); return; }
    const token = localStorage.getItem("meongcare_token");
    const res = await fetch("/api/admin/reset-password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ targetName: name, newPassword }),
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    setResetTarget(null);
    setNewPassword("");
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`${name} 계정을 삭제할까요?`)) return;
    const token = localStorage.getItem("meongcare_token");
    await fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchUsers();
  }

  return (
    <Layout>
      <div className="px-5 py-7 flex flex-col gap-5">
        <header className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">관리자</h1>
            <p className="text-xs text-muted-foreground">사용자 관리 및 비밀번호 초기화</p>
          </div>
        </header>

        {message && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-xs text-blue-700 font-medium">
            {message}
          </div>
        )}

        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="border border-border/50 rounded-2xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-foreground">{u.name}</p>
                  {u.role === "admin" && (
                    <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">관리자</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {u.gender === "male" ? "남성" : u.gender === "female" ? "여성" : "성별 미설정"}
                  {u.phone ? ` · ${u.phone}` : ""}
                </p>
                {u.createdAt && (
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    가입: {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {resetTarget === u.name ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="새 비밀번호"
                      className="w-24 text-xs border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => handleReset(u.name)}
                      className="text-[11px] font-bold text-white bg-primary px-2 py-1.5 rounded-lg"
                    >
                      변경
                    </button>
                    <button
                      onClick={() => { setResetTarget(null); setNewPassword(""); }}
                      className="text-[11px] font-semibold text-muted-foreground bg-secondary px-2 py-1.5 rounded-lg"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setResetTarget(u.name)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="비밀번호 초기화"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    {u.role !== "admin" && (
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="계정 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
