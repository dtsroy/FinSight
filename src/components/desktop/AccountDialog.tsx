import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { humanizeAuthError, signInWithEmail, signUpWithEmail } from "@/services/authService";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Mode = "signin" | "signup";

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 当前是否处于匿名状态：影响 signUp 的引导文案与实际行为（升级 vs 全新账户）。 */
  isAnonymous: boolean;
  defaultMode?: Mode;
}

export default function AccountDialog({ open, onOpenChange, isAnonymous, defaultMode = "signin" }: AccountDialogProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setEmail("");
      setPassword("");
      setConfirm("");
    }
  }, [open, defaultMode]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("请把邮箱和密码填完整");
      return;
    }
    if (mode === "signup") {
      if (password.length < 8) {
        toast.error("密码至少 8 位");
        return;
      }
      if (password !== confirm) {
        toast.error("两次输入的密码不一致");
        return;
      }
    }
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email.trim(), password);
        toast.success("已登录，正在拉取你的账本…");
      } else {
        const identity = await signUpWithEmail(email.trim(), password);
        if (identity.email) {
          toast.success(isAnonymous ? "账户创建完成，之前录入的资产已归到这个邮箱下" : "账户已创建，可以开始使用了");
        } else {
          toast.info("已发送确认邮件，请查收后再次登录。");
        }
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(humanizeAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono tracking-[.18em] text-primary">
            {mode === "signin" ? "登入你的账户" : isAnonymous ? "保存到你的邮箱账户" : "注册财务 X 光"}
          </DialogTitle>
          <DialogDescription className="text-xs leading-6 text-muted-foreground">
            {mode === "signup" && isAnonymous
              ? "把当前设备上录入的资产、报告与对话历史绑定到邮箱账户，之后换设备登录也能看到同一份账本。"
              : "只保留你的资产和诊断记录，绝不向任何第三方外泄；随时可以退出登录切换账户。"}
          </DialogDescription>
        </DialogHeader>
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin" className="gap-1.5"><LogIn className="size-3.5" />登录</TabsTrigger>
            <TabsTrigger value="signup" className="gap-1.5"><UserPlus className="size-3.5" />{isAnonymous ? "升级为邮箱账户" : "注册"}</TabsTrigger>
          </TabsList>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="account-email" className="text-xs">邮箱</Label>
              <Input id="account-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-password" className="text-xs">密码</Label>
              <Input id="account-password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "至少 8 位，建议字母 + 数字组合" : "输入你的密码"} />
            </div>
            <TabsContent value="signup" className="m-0 space-y-1.5">
              <Label htmlFor="account-confirm" className="text-xs">再次输入密码</Label>
              <Input id="account-confirm" type="password" autoComplete="new-password" required={mode === "signup"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="确认密码" />
            </TabsContent>
            <Button type="submit" className="mt-2 w-full gap-2" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : mode === "signin" ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
              {mode === "signin" ? "登录" : isAnonymous ? "创建账户并保存资产" : "创建账户"}
            </Button>
            <p className="pt-1 text-[11px] leading-5 text-muted-foreground">
              {mode === "signin"
                ? "还没有账户？点上方「" + (isAnonymous ? "升级为邮箱账户" : "注册") + "」新建一个。"
                : "已有账户？点上方「登录」直接进入。"}
            </p>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
