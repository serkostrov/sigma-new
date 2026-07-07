import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ChatPage } from "@/components/chat-page";

const chatSearchSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  tab: z.enum(["vk", "avito"]).optional(),
});

export const Route = createFileRoute("/chat")({
  validateSearch: chatSearchSchema,
  component: ChatRoute,
});

function ChatRoute() {
  const { code, tab } = Route.useSearch();
  return <ChatPage oauthCode={code} initialTab={tab ?? "avito"} />;
}
