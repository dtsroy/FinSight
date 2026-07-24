import { Button } from "@/components/ui/button";
import { useSeedDemo } from "@/hooks/useImportFlow";
import { Loader2, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function DemoLoader() {
  const seed = useSeedDemo();
  const navigate = useNavigate();

  const handleLoad = async () => {
    const result = await seed.mutateAsync();
    if (result.status === "already_loaded") {
      toast.info(`小王的 ${result.imported} 项资产已经在你的账本里`);
    } else {
      toast.success(`已载入演示用户小王的 ${result.imported} 项资产`);
    }
    navigate("/dashboard");
  };

  return <section className="relative overflow-hidden rounded-lg border border-primary/25 bg-gradient-to-br from-primary/8 via-background to-accent/5 p-6">
    <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><UserRound className="size-6" /></span>
        <div>
          <b className="text-lg">先用演示用户「小王」体验完整流程</b>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">12 项资产、5 个平台、约 50.3 万总资产，预置了 X 光穿透与压力测试。点一下就能看到完整的产品体验。</p>
        </div>
      </div>
      <Button size="lg" onClick={handleLoad} disabled={seed.isPending} className="gap-2 whitespace-nowrap">
        {seed.isPending ? <Loader2 className="size-4 animate-spin" /> : null}一键载入演示数据
      </Button>
    </div>
  </section>;
}
