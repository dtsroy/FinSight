import Logo from "@/components/desktop/Logo";
import AccountMenu from "@/components/desktop/AccountMenu";
import SiteLogo from "@/components/SiteLogo";
import { useAccountIdentity } from "@/hooks/useAuthGuard";
import { FileScan, FlaskConical, ListChecks, MessageCircle, Moon, PieChart, Sun, Upload } from "lucide-react";
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
        <NavLink to="/" className="flex h-20 items-center border-b border-border px-5">
          <SiteLogo />
        </NavLink>
        <nav className="flex gap-1 overflow-x-auto p-3 md:flex-1 md:flex-col md:overflow-y-auto md:p-4">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors ${isActive ? "border-primary/25 bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
              <Icon className="size-4" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden flex-col gap-2 border-t border-border p-4 md:flex">
          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex w-full items-center gap-3 rounded-md border border-transparent px-4 py-3 text-sm transition-colors text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {theme === "dark" ? "切换为浅色模式" : "切换为深色模式"}
          </button>
          <AccountMenu email={identity.email} isAnonymous={identity.isAnonymous} userId={identity.userId} />
        </div>
      </aside>
      <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 md:p-8"><Outlet /></main>
    </div>
  );
}
