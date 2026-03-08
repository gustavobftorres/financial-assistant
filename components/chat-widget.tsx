"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  "Como posso reduzir meus gastos?",
  "Onde estou gastando mais?",
  "Estou no caminho da minha meta de economia?",
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setHistory((h) => [...h, { role: "assistant", content: data.response }]);
    },
    onError: (e) => {
      setHistory((h) => [
        ...h,
        { role: "assistant", content: `Erro: ${e.message}` },
      ]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || chatMutation.isPending) return;
    const userMsg = message.trim();
    setMessage("");
    setHistory((h) => [...h, { role: "user", content: userMsg }]);
    chatMutation.mutate({
      message: userMsg,
      history: history.map((m) => ({ role: m.role, content: m.content })),
    });
  }

  function handleQuickPrompt(prompt: string) {
    setHistory((h) => [...h, { role: "user", content: prompt }]);
    chatMutation.mutate({
      message: prompt,
      history: history.map((m) => ({ role: m.role, content: m.content })),
    });
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-xl border bg-card shadow-lg transition-all duration-200",
          open
            ? "h-[520px] w-[380px] opacity-100 scale-100"
            : "h-0 w-0 opacity-0 scale-95 pointer-events-none"
        )}
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-semibold">Assistente financeiro</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOpen(false)}
              aria-label="Fechar chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 flex flex-col min-h-0 p-4">
            <p className="text-xs text-muted-foreground mb-2">
              Perguntas rápidas:
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPrompt(prompt)}
                  disabled={chatMutation.isPending}
                >
                  {prompt}
                </Button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              {history.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Faça uma pergunta sobre suas finanças ou use um dos prompts
                  acima.
                </p>
              )}
              {history.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2 text-sm">
                    Pensando...
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Sua pergunta..."
                disabled={chatMutation.isPending}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={chatMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fechar chat" : "Abrir chat"}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageSquare className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
}
