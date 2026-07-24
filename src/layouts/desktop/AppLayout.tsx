import AccountMenu from "@/components/desktop/AccountMenu";
import { useAccountIdentity } from "@/hooks/useAuthGuard";
import { Activity, FileScan, FlaskConical, ListChecks, MessageCircle, Moon, PieChart, Sun, Upload } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const navigation = [
  { to: "/dashboard", label: "资产全景", icon: PieChart },
  { to: "/assets", label: "资产账本", icon: ListChecks },
  { to: "/import", label: "导入资产", icon: Upload },
  { to: "/xray", label: "X 光穿透", icon: FileScan },
  { to: "/stress-test", label: "压力测试", icon: FlaskConical },
  { to: "/chat", label: "AI 问诊", icon: MessageCircle },
];

export default function AppLayout() {
  const identity = useAccountIdentity();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur md:flex md:h-screen md:w-64 md:flex-col md:border-b-0 md:border-r">
        <NavLink to="/" className="flex h-20 items-center gap-3 border-b border-border px-5">
          <span className="grid size-10 place-items-center rounded-lg bg-foreground text-background"><Activity /></span>
          <span className="font-bold tracking-tight text-foreground">FinSight</span>
        </NavLink>
        <nav className="flex gap-1 overflow-x-auto p-3 md:flex-1 md:flex-col md:overflow-y-auto md:p-4">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors ${isActive ? "border-primary/25 bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
              <Icon className="size-4" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden flex-col gap-2 border-t border-border p-4 md:flex">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">主题设置</span>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="h-8 w-8 text-muted-foreground hover:bg-secondary hover:text-foreground">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
          <AccountMenu email={identity.email} isAnonymous={identity.isAnonymous} userId={identity.userId} />
        </div>
      </aside>
      <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 md:p-8"><Outlet /></main>
    </div>
  );
}
