import ParsedAssetsReview from "@/components/desktop/import/ParsedAssetsReview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCommitBatch, useOcrRecognize } from "@/hooks/useImportFlow";
import type { ParsedAssetRow } from "@/types/app/asset";
import { CheckCircle2, ImageIcon, ImagePlus, Loader2, ScanEye, Trash2, UploadCloud, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type FileStatus = "queued" | "uploading" | "recognizing" | "ok" | "empty" | "failed";

interface QueueItem {
  id: string;
  file: File;
  preview: string;
  status: FileStatus;
  error?: string;
  rows: ParsedAssetRow[];
  imageUrl?: string;
  imageKey?: string;
}

const MAX_FILES = 8;
const MAX_FILE_SIZE = 6 * 1024 * 1024;

export default function OcrImportFlow() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [platform, setPlatform] = useState("");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const ocr = useOcrRecognize();
  const commit = useCommitBatch();

  // 清理 objectURL
  useEffect(() => {
    return () => {
      items.forEach((item) => URL.revokeObjectURL(item.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const processOne = useCallback(async (item: QueueItem) => {
    try {
      updateItem(item.id, { status: "uploading", error: undefined });
      const platformHint = platform.trim() || undefined;
      updateItem(item.id, { status: "recognizing" });
      const result = await ocr.mutateAsync({ file: item.file, platformHint });
      if (!result.rows || result.rows.length === 0) {
        updateItem(item.id, { status: "empty", rows: [], imageUrl: result.imageUrl, imageKey: result.imageKey });
      } else {
        updateItem(item.id, {
          status: "ok",
          rows: result.rows,
          imageUrl: result.imageUrl,
          imageKey: result.imageKey,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "识别失败";
      updateItem(item.id, { status: "failed", error: message });
    }
  }, [ocr, platform, updateItem]);

  const enqueueFiles = useCallback(async (rawFiles: File[]) => {
    if (rawFiles.length === 0) return;
    if (items.length >= MAX_FILES) {
      toast.error(`最多同时处理 ${MAX_FILES} 张截图，请先移除一部分`);
      return;
    }

    const accepted: QueueItem[] = [];
    for (const file of rawFiles) {
      if (accepted.length + items.length >= MAX_FILES) {
        toast(`只保留前 ${MAX_FILES} 张截图`);
        break;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" 不是图片，已跳过`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" 超过 6MB，已跳过`);
        continue;
      }
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
        status: "queued",
        rows: [],
      });
    }

    if (accepted.length === 0) return;
    setItems((prev) => [...prev, ...accepted]);
    setReviewOpen(false);

    // 顺序识别，避免同时打满上游速率
    for (const it of accepted) {
      // eslint-disable-next-line no-await-in-loop
      await processOne(it);
    }

    // 汇总一次性 toast
    setItems((prev) => {
      const okCount = prev.filter((x) => accepted.find((a) => a.id === x.id) && x.status === "ok").length;
      const emptyCount = prev.filter((x) => accepted.find((a) => a.id === x.id) && x.status === "empty").length;
      const failedCount = prev.filter((x) => accepted.find((a) => a.id === x.id) && x.status === "failed").length;
      const totalRows = prev.filter((x) => accepted.find((a) => a.id === x.id)).reduce((s, x) => s + x.rows.length, 0);
      if (okCount > 0) {
        toast.success(`已识别 ${okCount} 张截图，累计 ${totalRows} 条资产可入账${emptyCount ? `；${emptyCount} 张未识别到资产` : ""}${failedCount ? `；${failedCount} 张失败` : ""}`);
      } else if (emptyCount > 0 || failedCount > 0) {
        toast.error(`未识别到资产：${emptyCount} 张空结果，${failedCount} 张失败`);
      }
      return prev;
    });
  }, [items.length, processOne]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const retryItem = useCallback((id: string) => {
    const item = items.find((x) => x.id === id);
    if (!item) return;
    processOne({ ...item, status: "queued", error: undefined, rows: [] });
  }, [items, processOne]);

  const clearAll = useCallback(() => {
    items.forEach((it) => URL.revokeObjectURL(it.preview));
    setItems([]);
    setReviewOpen(false);
  }, [items]);

  const openPicker = useCallback(() => {
    // 确保在用户手势内同步触发，避免浏览器拦截
    const el = inputRef.current;
    if (!el) return;
    el.click();
  }, []);

  const handleInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files;
    // 先把选中的文件存下来，再重置 input value —— 否则后续选相同文件不会触发 change
    const files = list ? Array.from(list) : [];
    event.target.value = "";
    if (files.length === 0) return;
    await enqueueFiles(files);
  };

  // 拖拽事件
  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.types.includes("Files")) {
      dragCounter.current += 1;
      setIsDragging(true);
    }
  };
  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  };
  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) return;
    await enqueueFiles(files);
  };

  const busy = items.some((it) => it.status === "uploading" || it.status === "recognizing") || commit.isPending;
  const okItems = items.filter((it) => it.status === "ok");
  const mergedRows: ParsedAssetRow[] = okItems.flatMap((it) => it.rows);
  const firstImage = okItems[0];
  const canReview = okItems.length > 0 && !busy;

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-4 rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm">
          <div className="flex items-center gap-2 text-primary">
            <ScanEye className="size-5" /><b>截图识别持仓</b>
          </div>
          <p className="leading-6 text-muted-foreground">
            支持一次拖入或选择多张持仓截图（最多 {MAX_FILES} 张，单张 ≤ 6MB），AI 会逐张识别，
            结果自动汇总到下方表格里，可勾选、修正后统一入账。
          </p>
          <div className="space-y-2">
            <Label htmlFor="ocr-platform">平台提示（选填，可帮助 AI 判断来源）</Label>
            <Input id="ocr-platform" value={platform} onChange={(event) => setPlatform(event.target.value)} placeholder="例如：蚂蚁财富" />
          </div>
        </div>

        {/* Drop zone + preview 区域 */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={(e) => {
            // 只有点在非按钮空白区域才弹选择器；点在"选择截图"/"清空"按钮上时交给按钮自己处理
            if (busy) return;
            const target = e.target as HTMLElement;
            if (target.closest("button") || target.tagName === "INPUT") return;
            openPicker();
          }}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
              e.preventDefault();
              openPicker();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="拖入或点击选择截图，支持一次选多张"
          className={`relative flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-sm transition-colors ${
            isDragging
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
          }`}
        >
          {/* 隐藏的 file input：用 sr-only 而不是 display:none，保证部分浏览器能可靠地用程序 click() 弹出多选对话框 */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleInput}
            className="sr-only"
            aria-label="选择截图上传（可多选）"
            tabIndex={-1}
          />
          <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            {busy ? <Loader2 className="size-6 animate-spin" /> : isDragging ? <UploadCloud className="size-7" /> : <ImagePlus className="size-7" />}
          </div>
          <p className="mt-3 text-base font-medium text-foreground">
            {isDragging ? "松开鼠标即可上传" : items.length > 0 ? "继续拖入或点击添加更多截图" : "拖入截图到这里，或点击“选择截图”一次选多张"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">支持 PNG / JPG · 一次最多 {MAX_FILES} 张（在系统选择框里按住 Ctrl / ⌘ 可多选）· 单张 6MB 以内</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                openPicker();
              }}
              className="gap-2"
              disabled={busy}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
              选择截图
            </Button>
            {items.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  clearAll();
                }}
                disabled={busy}
                className="gap-2 text-muted-foreground"
              >
                <Trash2 className="size-4" />清空
              </Button>
            )}
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <section className="rounded-lg border border-border bg-card">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
            <b className="text-sm">已加入 {items.length} 张截图 · 累计识别 {mergedRows.length} 条资产</b>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.preventDefault();
                  openPicker();
                }}
                disabled={busy || items.length >= MAX_FILES}
                className="gap-2"
              >
                <ImagePlus className="size-4" />继续添加
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setReviewOpen(true)}
                disabled={!canReview}
                className="gap-2"
              >
                汇总 {mergedRows.length} 条 → 去核对入账
              </Button>
            </div>
          </header>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-5 py-3">
                <img src={item.preview} alt={item.file.name} className="size-14 shrink-0 rounded-md border border-border object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <b className="truncate">{item.file.name}</b>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {(item.file.size / 1024).toFixed(0)} KB
                    {item.status === "ok" && ` · 识别到 ${item.rows.length} 条`}
                    {item.status === "empty" && " · 未识别出资产"}
                    {item.status === "failed" && item.error && ` · ${item.error}`}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {(item.status === "failed" || item.status === "empty") && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => retryItem(item.id)} disabled={busy}>
                      重试
                    </Button>
                  )}
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(item.id)} disabled={busy}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {reviewOpen && mergedRows.length > 0 && (
        <ParsedAssetsReview
          rows={mergedRows}
          source="ocr"
          fileUrl={firstImage?.imageUrl ?? null}
          fileKey={firstImage?.imageKey ?? null}
          committing={commit.isPending}
          onDiscard={() => setReviewOpen(false)}
          onCommit={async (rows, meta) => {
            const imageCount = okItems.length;
            await commit.mutateAsync({
              source: "ocr",
              rows,
              fileUrl: meta.fileUrl ?? null,
              fileKey: meta.fileKey ?? null,
              note: `截图 OCR：${imageCount} 张截图 · 汇总识别 ${mergedRows.length} 条 · 入账 ${rows.length} 条`,
            });
            clearAll();
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: FileStatus }) {
  const map: Record<FileStatus, { text: string; cls: string; icon?: React.ReactNode }> = {
    queued: { text: "等待中", cls: "bg-secondary text-muted-foreground border-border" },
    uploading: { text: "上传中", cls: "bg-info/15 text-info border-info/30", icon: <Loader2 className="size-3 animate-spin" /> },
    recognizing: { text: "识别中", cls: "bg-warning/15 text-warning border-warning/40", icon: <Loader2 className="size-3 animate-spin" /> },
    ok: { text: "已识别", cls: "bg-success/15 text-success border-success/30", icon: <CheckCircle2 className="size-3" /> },
    empty: { text: "无结果", cls: "bg-muted text-muted-foreground border-border" },
    failed: { text: "失败", cls: "bg-destructive/10 text-destructive border-destructive/30", icon: <XCircle className="size-3" /> },
  };
  const info = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${info.cls}`}>
      {info.icon}{info.text}
    </span>
  );
}
