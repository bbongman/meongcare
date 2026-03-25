import { getAuthUserId } from "@/hooks/use-auth";

export function userKey(base: string): string {
  const userId = getAuthUserId();
  return userId ? `${base}_${userId}` : base;
}
