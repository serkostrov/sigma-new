import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ChatPage, type ChatTab } from "@/components/chat-page";

const chatSearchSchema = z.object({
  tab: z.enum(["listings", "personal", "vk", "avito"]).optional(),
});

function normalizeChatTab(tab?: z.infer<typeof chatSearchSchema>["tab"]): ChatTab {
  if (tab === "personal" || tab === "vk") return "personal";
  if (tab === "listings" || tab === "avito") return "listings";
  return "listings";
}

export const Route = createFileRoute("/chat")({
  validateSearch: chatSearchSchema,
  component: ChatRoute,
});

function ChatRoute() {
  const { tab } = Route.useSearch();
  return <ChatPage initialTab={normalizeChatTab(tab)} />;
}
