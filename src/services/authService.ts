import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export interface AccountIdentity {
  userId: string;
  email: string | null;
  isAnonymous: boolean;
}

function toIdentity(user: User | null | undefined): AccountIdentity | null {
  if (!user) return null;
  const email = user.email && user.email.length > 0 ? user.email : null;
  // Supabase 匿名用户没有 email 且带 is_anonymous 标记
  const isAnonymous = (user as unknown as { is_anonymous?: boolean }).is_anonymous ?? !email;
  return { userId: user.id, email, isAnonymous };
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function getCurrentIdentity(): Promise<AccountIdentity | null> {
  const { data } = await supabase.auth.getSession();
  return toIdentity(data.session?.user ?? null);
}

/** 首次进入或未登录时用；已有任意会话直接返回。 */
export async function ensureAnonymousSession(): Promise<AccountIdentity> {
  const { data: existing } = await supabase.auth.getSession();
  const existingIdentity = toIdentity(existing.session?.user ?? null);
  if (existingIdentity) return existingIdentity;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  const identity = toIdentity(data.session?.user ?? null);
  if (!identity) throw new Error("anonymous_session_missing");
  return identity;
}

/** 邮箱 + 密码注册；若当前是匿名会话则升级到该邮箱账户（保留原有数据）。 */
export async function signUpWithEmail(email: string, password: string): Promise<AccountIdentity> {
  const { data: existing } = await supabase.auth.getSession();
  const existingIdentity = toIdentity(existing.session?.user ?? null);
  if (existingIdentity?.isAnonymous) {
    // 匿名升级：给现有 UID 挂上邮箱和密码，原来账本里的资产、报告、对话保持归属
    const { data, error } = await supabase.auth.updateUser({ email, password });
    if (error) throw error;
    const identity = toIdentity(data.user);
    if (!identity) throw new Error("upgrade_missing_user");
    return identity;
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  const identity = toIdentity(data.user);
  if (!identity) throw new Error("signup_missing_user");
  return identity;
}

/** 邮箱 + 密码登录；成功后旧会话（含匿名）自动被覆盖。 */
export async function signInWithEmail(email: string, password: string): Promise<AccountIdentity> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const identity = toIdentity(data.user);
  if (!identity) throw new Error("signin_missing_user");
  return identity;
}

/** 退出登录后立即回到匿名状态，保持应用可用。 */
export async function signOutAndReanonymize(): Promise<AccountIdentity> {
  await supabase.auth.signOut();
  return ensureAnonymousSession();
}

export function subscribeAuth(
  callback: (identity: AccountIdentity | null, session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    // 在回调里 setTimeout(0) 再触发上层业务，避免 Supabase 客户端锁重入
    setTimeout(() => callback(toIdentity(session?.user ?? null), session), 0);
  });
  return () => data.subscription.unsubscribe();
}

/** 把 Supabase 抛出的错误翻译成用户能看懂的中文提示。 */
export function humanizeAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const lower = raw.toLowerCase();
  if (lower.includes("invalid login credentials") || lower.includes("invalid_grant")) {
    return "邮箱或密码不正确，检查后再试一次。";
  }
  if (lower.includes("user already registered") || lower.includes("already been registered") || lower.includes("email_exists")) {
    return "该邮箱已经注册过，直接登录即可。";
  }
  if (lower.includes("weak password") || lower.includes("password should be")) {
    return "密码强度不够，请使用 8 位以上、包含字母和数字的组合。";
  }
  if (lower.includes("email") && lower.includes("invalid")) {
    return "邮箱格式不正确，请检查后再试。";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "尝试过于频繁，请等一会儿再试。";
  }
  return raw || "登录失败，请稍后再试。";
}
