import AccountMenu from "@/components/desktop/AccountMenu";
import { useAccountIdentity } from "@/hooks/useAuthGuard";
import { Activity, FileScan, FlaskConical, ListChecks, MessageCircle, PieChart, Upload } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

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

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur md:flex md:h-screen md:w-64 md:flex-col md:border-b-0 md:border-r">
        <NavLink to="/" className="flex h-20 items-center gap-3 border-b border-border px-5">
          <span className="grid size-10 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary"><Activity /></span>
          <span><b className="block tracking-[.18em]">财务 X 光</b><small className="font-mono text-[10px] text-muted-foreground">FINANCIAL XRAY</small></span>
        </NavLink>
        <nav className="flex gap-1 overflow-x-auto p-3 md:flex-1 md:flex-col md:overflow-y-auto md:p-4">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors ${isActive ? "border-primary/25 bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
              <Icon className="size-4" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block">
          <AccountMenu email={identity.email} isAnonymous={identity.isAnonymous} userId={identity.userId} />
        </div>
      </aside>
      <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 md:p-8"><Outlet /></main>
    </div>
  );
}
