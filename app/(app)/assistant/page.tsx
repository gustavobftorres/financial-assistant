import { AIChatPanel } from "@/components/ai-chat-panel";

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Assistente</h1>
      <AIChatPanel />
    </div>
  );
}
