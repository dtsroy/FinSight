import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 只订阅 INSERT / UPDATE：Postgres Changes 对 DELETE 不套 RLS，
// 也无法按 user_id 过滤 DELETE 事件；删除动作靠本地 mutation.onSuccess 刷新。
export function useRealtimeAssets(userId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`assets:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "assets", filter: `user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["assets"] });
          qc.invalidateQueries({ queryKey: ["imports"] });
          toast.success("检测到新增资产，账本已同步", { id: "assets-realtime" });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "assets", filter: `user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["assets"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
