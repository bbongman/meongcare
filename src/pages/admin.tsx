import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { apiFetch } from "@/lib/api";
import { Trash2, KeyRound, Users, Dog, Brain, Hospital, RefreshCw } from "lucide-react";

interface UserActivity {
  id: string;
  name: string;
  createdAt: string;
  dogs: number;
  aiLogs: number;
  vetVisits: number;
}

interface AdminStats {
  totalUsers: number;
  newUsersThisWeek: number;
  totalDogs: number;
  totalAiLogs: number;
  aiByType: Record<string, number>;
  totalVetVisits: number;
  totalVaccines: number;
  userActivity: UserActivity[];
}

interface UserInfo {
  id: string;
  name: string;
  gender?: string;
  phone?: string;
  role?: string;
  createdAt?: string;
}

function StatCard({ label, value, sub, icon }: { label: string; value: number | string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-primary font-semibold mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: () => apiFetch<AdminStats>("/api/admin/stats"),
    staleTime: 1000 * 60,
  });

  const { data: usersData } = useQuery<{ users: UserInfo[] }>({
    queryKey: ["admin-users"],
    queryFn: () => apiFetch<{ users: UserInfo[] }>("/api/admin/users"),
  });

  const users = usersData?.users ?? [];

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
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  }

  const aiTypeLabel: Record<string, string> = {
    consultation: "AI 문진",
    translation: "번역기",
    product: "제품 분석",
    food: "음식 체크",
    behavior: "행동 & 훈련",
  };

  return (
    <Layout>
      <div className="px-5 py-7 flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">관리자</h1>
              <p className="text-xs text-muted-foreground">서비스 현황 및 사용자 관리</p>
            </div>
          </div>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
              queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            }}
            className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </header>

        {message && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-xs text-blue-700 font-medium">
            {message}
          </div>
        )}

        {/* 통계 카드 */}
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-secondary animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : stats && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="전체 사용자"
                value={stats.totalUsers}
                sub={`이번 주 +${stats.newUsersThisWeek}명`}
                icon={<Users className="w-5 h-5 text-blue-500" />}
              />
              <StatCard
                label="등록 반려견"
                value={stats.totalDogs}
                icon={<Dog className="w-5 h-5 text-amber-500" />}
              />
              <StatCard
                label="AI 사용 횟수"
                value={stats.totalAiLogs}
                icon={<Brain className="w-5 h-5 text-purple-500" />}
              />
              <StatCard
                label="검진 기록"
                value={stats.totalVetVisits}
                icon={<Hospital className="w-5 h-5 text-green-500" />}
              />
            </div>

            {/* AI 유형별 */}
            {Object.keys(stats.aiByType).length > 0 && (
              <div className="bg-card border border-border/50 rounded-2xl p-4">
                <p className="text-xs font-bold text-foreground mb-3">AI 기능별 사용량</p>
                <div className="space-y-2">
                  {Object.entries(stats.aiByType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => {
                      const max = Math.max(...Object.values(stats.aiByType));
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-20 shrink-0">{aiTypeLabel[type] ?? type}</span>
                          <div className="flex-1 bg-secondary rounded-full h-2">
                            <div
                              className="bg-primary rounded-full h-2 transition-all"
                              style={{ width: `${(count / max) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-foreground w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 사용자 활동 */}
            {stats.userActivity.length > 0 && (
              <div>
                <p className="text-xs font-bold text-foreground mb-2">사용자 활동 순위</p>
                <div className="space-y-2">
                  {stats.userActivity.map((u, i) => (
                    <div key={u.id} className="bg-card border border-border/50 rounded-xl p-3 flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          가입 {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      <div className="flex gap-3 text-[10px] text-muted-foreground shrink-0">
                        <span>강아지 {u.dogs}</span>
                        <span>AI {u.aiLogs}</span>
                        <span>검진 {u.vetVisits}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* 사용자 관리 */}
        <div>
          <p className="text-xs font-bold text-foreground mb-2">계정 관리</p>
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
      </div>
    </Layout>
  );
}
