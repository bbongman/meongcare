import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getAuthToken } from "@/hooks/use-auth";

interface UserSettings {
  tabOrder: string[];
  theme: string;
}

export function useUserSettings() {
  const queryClient = useQueryClient();
  const isLoggedIn = !!getAuthToken();

  const { data } = useQuery<UserSettings>({
    queryKey: ["user-settings"],
    queryFn: () => apiFetch<UserSettings>("/api/settings"),
    enabled: isLoggedIn,
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    mutationFn: (settings: Partial<UserSettings>) =>
      apiFetch<UserSettings>("/api/settings", { method: "POST", body: JSON.stringify(settings) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["user-settings"], updated);
    },
  });

  return {
    tabOrder: data?.tabOrder ?? [],
    theme: data?.theme ?? "system",
    saveSettings: (settings: Partial<UserSettings>) => mutation.mutate(settings),
  };
}
