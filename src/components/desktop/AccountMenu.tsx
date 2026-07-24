import AccountDialog from "@/components/desktop/AccountDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAndReanonymize } from "@/services/authService";
import { CircleUser, KeyRound, LogOut, ShieldCheck, UserCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AccountMenuProps {
  email: string | null;
  isAnonymous: boolean;
  userId: string | null;
}

export default function AccountMenu({ email, isAnonymous, userId }: AccountMenuProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"signin" | "signup">("signin");
  const [signingOut, setSigningOut] = useState(false);

  function openDialog(mode: "signin" | "signup") {
    setDialogMode(mode);
    setDialogOpen(true);
  }

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOutAndReanonymize();
      toast.success("已退出登录，切回游客模式");
    } catch (err) {
      const message = err instanceof Error ? err.message : "退出登录失败";
      toast.error(message);
    } finally {
      setSigningOut(false);
    }
  }

  const shortId = userId ? userId.slice(0, 6) : "----";

  function formatEmail(email: string | null) {
    if (!email) return "";
    const parts = email.split("@");
    const name = parts[0];
    if (name.length <= 4) return name;
    return `${name.slice(0, 2)}***${name.slice(-2)}`;
  }

  const displayEmail = email ? formatEmail(email) : null;
  const displayName = displayEmail ?? "游客账户";

  return (
    <>
      <div className="pt-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-md border border-transparent px-2 py-2 text-left transition-colors hover:border-border hover:bg-secondary/50">
              <span className={`grid size-9 shrink-0 place-items-center rounded-full ${isAnonymous ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                {isAnonymous ? <CircleUser className="size-5" /> : <ShieldCheck className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-sm break-all">{displayName}</b>
                <small className="font-mono text-[10px] text-muted-foreground">
                  {isAnonymous ? `本设备 · ${shortId}` : `已登录 · ${shortId}`}
                </small>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-64">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {isAnonymous ? "尚未绑定账户，数据仅存在本设备的会话中" : `已用邮箱登录：${email}`}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isAnonymous ? (
              <>
                <DropdownMenuItem onSelect={() => openDialog("signup")} className="gap-2">
                  <UserCog className="size-4 text-primary" />
                  <span>把当前账本升级为邮箱账户</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openDialog("signin")} className="gap-2">
                  <KeyRound className="size-4" />
                  <span>已有账户？直接登录</span>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={onSignOut} disabled={signingOut} className="gap-2 text-destructive focus:text-destructive">
                <LogOut className="size-4" />
                <span>{signingOut ? "正在退出…" : "退出登录"}</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {isAnonymous && (
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="secondary" className="h-8 flex-1 text-xs" onClick={() => openDialog("signin")}>
              登录
            </Button>
            <Button size="sm" className="h-8 flex-1 text-xs" onClick={() => openDialog("signup")}>
              保存到邮箱
            </Button>
          </div>
        )}
      </div>

      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} isAnonymous={isAnonymous} defaultMode={dialogMode} />
    </>
  );
}
