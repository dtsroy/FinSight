import ParsedAssetsReview from "@/components/desktop/import/ParsedAssetsReview";
import { Button } from "@/components/ui/button";
import { useCommitBatch, useCsvParse, useCsvUpload } from "@/hooks/useImportFlow";
import type { ParsedAssetRow } from "@/types/app/asset";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface ParsedState { rows: ParsedAssetRow[]; fileUrl: string | null; fileKey: string | null; fileName: string }

export default function CsvImportFlow() {
  const inputRef = useRef<HTMLInputElement>(null);
  const parseMutation = useCsvParse();
  const uploadMutation = useCsvUpload();
  const commit = useCommitBatch();
  const [parsed, setParsed] = useState<ParsedState | null>(null);

  const handleFile = async (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      toast.error("CSV 文件超过 4MB，请分批导入");
      return;
    }
    const text = await file.text();
    let uploadResult: { url: string; key: string } | null = null;
    try {
      uploadResult = await uploadMutation.mutateAsync(file);
    } catch {
      // 上传失败不阻断解析，只是失去原始文件的存档
      uploadResult = null;
    }
    const result = await parseMutation.mutateAsync(text);
    if (result.rows.length === 0) {
      toast.error("未从 CSV 中识别到资产，请检查表头与内容");
      return;
    }
    setParsed({ rows: result.rows, fileUrl: uploadResult?.url ?? null, fileKey: uploadResult?.key ?? null, fileName: file.name });
    toast.success(`解析完成，共 ${result.summary.total} 条`);
  };

  const handlePick = () => inputRef.current?.click();
  const handleInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await handleFile(file);
  };

  return <div className="space-y-6">
    <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm">
        <div className="flex items-center gap-2 text-primary"><FileSpreadsheet className="size-5" /><b>批量导入 CSV</b></div>
        <p className="mt-3 leading-6 text-muted-foreground">支持从蚂蚁财富、天天基金、同花顺等 App 导出的持仓 CSV 文件。表头示例：<span className="text-foreground">名称，类别，平台，金额，代码</span>。</p>
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          <li>· 首行需要是列名，中英文均可</li>
          <li>· 金额可含 ¥ 和千分位逗号，会自动清洗</li>
          <li>· 单文件不超过 4MB</li>
        </ul>
        <Button type="button" onClick={handlePick} className="mt-5 gap-2" disabled={parseMutation.isPending || uploadMutation.isPending}>
          {parseMutation.isPending || uploadMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}选择 CSV 文件
        </Button>
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleInput} />
      </div>
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        <b className="text-foreground">流程</b>
        <ol className="mt-3 space-y-2 leading-6">
          <li>1. 选择 CSV 文件后，原文件先自动存入你的私人档案柜；</li>
          <li>2. 后台解析每一行，识别类别与金额；</li>
          <li>3. 在右侧的识别结果里修改或删除有问题的行；</li>
          <li>4. 点击「确认导入」把选中行入账，随后可在账本页查看。</li>
        </ol>
      </div>
    </div>

    {parsed && <ParsedAssetsReview
      rows={parsed.rows}
      source="csv"
      fileUrl={parsed.fileUrl}
      fileKey={parsed.fileKey}
      committing={commit.isPending}
      onDiscard={() => setParsed(null)}
      onCommit={async (rows, meta) => {
        await commit.mutateAsync({ source: "csv", rows, fileUrl: meta.fileUrl ?? null, fileKey: meta.fileKey ?? null, note: meta.note ?? null });
        setParsed(null);
      }}
    />}
  </div>;
}
