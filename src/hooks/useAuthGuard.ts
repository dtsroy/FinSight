import { supabase } from "@/integrations/supabase/client";
import { ensureAnonymousSession, subscribeAuth, type AccountIdentity } from "@/services/authService";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

export interface AuthGuardState {
  userId: string | null;
  email: string | null;
  isAnonymous: boolean;
  ready: boolean;
  error: string | null;
}

const EMPTY_STATE: AuthGuardState = {
  userId: null,
  email: null,
  isAnonymous: true,
  ready: false,
  error: null,
};

/**
 * 应用最顶层调用：负责 bootstrap 一个可用会话（首次进入自动匿名登录），并把会话状态实时同步到 React 树。
 * 只应该被最外层的 AuthGate 使用一次；其它组件想读会话身份走 useAccountIdentity（纯观察，不再 bootstrap）。
 */
export function useAuthGuard(): AuthGuardState {
  const qc = useQueryClient();
  const [state, setState] = useState<AuthGuardState>(EMPTY_STATE);
  const prevUidRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const apply = (identity: AccountIdentity | null, ready: boolean, error: string | null) => {
      if (cancelled) return;
      const nextUid = identity?.userId ?? null;
      if (prevUidRef.current && nextUid && prevUidRef.current !== nextUid) {
        // 身份切换（匿名 → 实名、账号 A → 账号 B、退出后回退为匿名）时把旧账户缓存清掉
        qc.clear();
      }
      prevUidRef.current = nextUid;
      setState({
        userId: identity?.userId ?? null,
        email: identity?.email ?? null,
        isAnonymous: identity?.isAnonymous ?? true,
        ready,
        error,
      });
    };

    (async () => {
      try {
        const identity = await ensureAnonymousSession();
        apply(identity, true, null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "登录失败";
        apply(null, true, message);
      }
    })();

    const unsub = subscribeAuth((identity) => {
      apply(identity, true, null);
    });

    return () => {
      cancelled = true;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

/**
 * 组件内轻量读取当前会话身份，不做 bootstrap；依赖上层 AuthGate 已经登好。
 */
export interface ObservableIdentity {
  userId: string | null;
  email: string | null;
  isAnonymous: boolean;
}

export function useAccountIdentity(): ObservableIdentity {
  const [state, setState] = useState<ObservableIdentity>({ userId: null, email: null, isAnonymous: true });

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const user = data.session?.user;
      if (!user) return;
      setState({
        userId: user.id,
        email: user.email ?? null,
        isAnonymous: (user as unknown as { is_anonymous?: boolean }).is_anonymous ?? !user.email,
      });
    });
    const unsub = subscribeAuth((identity) => {
      if (cancelled) return;
      if (identity) setState(identity);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return state;
}
