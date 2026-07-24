import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useRealtimeAssets } from "@/hooks/useRealtimeAssets";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

interface AuthGateProps { children?: ReactNode }

export default function AuthGate({ children }: AuthGateProps) {
  const { ready, error, userId } = useAuthGuard();
  useRealtimeAssets(userId);
  if (!ready) {
    return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
      <div className="flex items-center gap-3 text-sm"><Loader2 className="size-4 animate-spin text-primary" />正在准备你的资产账本…</div>
    </div>;
  }
  if (error) {
    return <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-6"><b className="text-destructive">无法连接资产账本</b><p className="mt-3 text-sm text-muted-foreground">{error}</p></div>
    </div>;
  }
  return <>{children}</>;
}
