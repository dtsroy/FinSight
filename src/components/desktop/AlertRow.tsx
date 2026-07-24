import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import type { XRayAlert } from "@/types/app/analytics";

const styles: Record<XRayAlert["level"], { icon: React.ComponentType<{ className?: string }>; tone: string; badge: string }> = {
  critical: { icon: ShieldAlert, tone: "border-destructive/40 bg-destructive/5 text-destructive", badge: "text-destructive" },
  warning: { icon: AlertTriangle, tone: "border-warning/40 bg-warning/10 text-foreground", badge: "text-warning" },
  info: { icon: Info, tone: "border-info/40 bg-info/10 text-foreground", badge: "text-info" },
};

export default function AlertRow({ alert }: { alert: XRayAlert }) {
  const cfg = styles[alert.level] ?? styles.info;
  const Icon = cfg.icon;
  return (
    <div className={`flex gap-3 rounded-md border p-4 text-sm ${cfg.tone}`}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${cfg.badge}`} />
      <div>
        <b className="block">{alert.title}</b>
        <p className="mt-1 leading-6 text-muted-foreground">{alert.message}</p>
      </div>
    </div>
  );
}
