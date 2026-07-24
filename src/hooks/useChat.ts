import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clearChatHistory, listChatMessages, streamChatMessage } from "@/services/chatService";
import type { ChatMessage } from "@/types/app/analytics";

export interface StreamingChat {
  question: string;
  answer: string;
  tone: "friendly" | "sharp" | null;
  finalized: boolean;
}

export function useChatHistory() {
  return useQuery({ queryKey: ["chat_history"], queryFn: () => listChatMessages(40) });
}

export function useChatStream() {
  const qc = useQueryClient();
  const [streaming, setStreaming] = useState<StreamingChat | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (message: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStreaming({ question: message, answer: "", tone: null, finalized: false });

    let doneReceived: { reply: string; tone: "friendly" | "sharp" } | null = null;

    try {
      await streamChatMessage(
        message,
        {
          onMeta: (tone) =>
            setStreaming((prev) => (prev ? { ...prev, tone } : prev)),
          onDelta: (delta) =>
            setStreaming((prev) => (prev ? { ...prev, answer: prev.answer + delta } : prev)),
          onDone: (final) => {
            doneReceived = final;
            setStreaming((prev) =>
              prev ? { ...prev, answer: final.reply, tone: final.tone, finalized: true } : prev,
            );
          },
        },
        controller.signal,
      );

      if (doneReceived) {
        // 先把这轮问答塞进 cache 本地即时可见，再清 streaming——
        // 这样即使随后 refetch 失败，问答也不会从 UI 消失。
        const now = new Date().toISOString();
        const uid = Date.now();
        const optimisticUser: ChatMessage = {
          id: `optimistic-u-${uid}`,
          role: "user",
          content: message,
          tone: null,
          metadata: null,
          created_at: now,
        };
        const optimisticAssistant: ChatMessage = {
          id: `optimistic-a-${uid}`,
          role: "assistant",
          content: doneReceived.reply,
          tone: doneReceived.tone,
          metadata: null,
          created_at: now,
        };
        qc.setQueryData<ChatMessage[]>(["chat_history"], (old) => [
          ...(old ?? []),
          optimisticUser,
          optimisticAssistant,
        ]);
      }
      setStreaming(null);
      // 异步拉真实历史；即便失败，本地 cache 已有正确内容
      qc.invalidateQueries({ queryKey: ["chat_history"] });
    } catch (err) {
      setStreaming(null);
      throw err;
    }
  }, [qc]);

  return { send, streaming, isPending: streaming !== null };
}

export function useClearChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => clearChatHistory(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat_history"] }),
  });
}
