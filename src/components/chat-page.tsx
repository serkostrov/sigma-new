import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/app-layout";
import { AvitoChatPanel } from "@/components/avito-chat-panel";
import { ChatUnreadBadge } from "@/components/chat-unread-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VkChatPanel } from "@/components/vk-chat-panel";
import { useChatUnreadCounts } from "@/lib/chat-unread-api";
import { useAvitoChatStatus, useSyncAvitoChat } from "@/lib/avito-chat-api";
import { useSyncVkChat, useVkChatStatus } from "@/lib/vk-chat-api";

type ChatTab = "vk" | "avito";

export function ChatPage({
  oauthCode,
  initialTab = "avito",
}: {
  oauthCode?: string;
  initialTab?: ChatTab;
}) {
  const [tab, setTab] = useState<ChatTab>(initialTab);

  const { data: unread } = useChatUnreadCounts();
  const { data: avitoStatus } = useAvitoChatStatus();
  const { data: vkStatus } = useVkChatStatus();
  const avitoSync = useSyncAvitoChat();
  const vkSync = useSyncVkChat();

  const refreshActive = () => {
    if (tab === "avito" && avitoStatus?.connected) {
      avitoSync.mutate();
      return;
    }
    if (tab === "vk" && vkStatus?.connected) {
      vkSync.mutate();
    }
  };

  const refreshPending =
    tab === "avito" ? avitoSync.isPending : tab === "vk" ? vkSync.isPending : false;

  const canRefresh =
    (tab === "avito" && avitoStatus?.connected) || (tab === "vk" && vkStatus?.connected);

  useEffect(() => {
    if (!avitoStatus?.connected) return;
    avitoSync.mutate();
    const id = window.setInterval(() => avitoSync.mutate(), 20_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avitoStatus?.connected]);

  useEffect(() => {
    if (!vkStatus?.connected) return;
    vkSync.mutate();
    const id = window.setInterval(() => vkSync.mutate(), 20_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vkStatus?.connected]);

  return (
    <div>
      <PageHeader title="Чат" description="Сообщения из Авито и ВКонтакте" />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ChatTab)} className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <TabsList>
            <TabsTrigger value="avito" className="gap-2">
              Авито
              <ChatUnreadBadge count={unread?.avito ?? 0} size="xs" />
            </TabsTrigger>
            <TabsTrigger value="vk" className="gap-2">
              ВКонтакте
              <ChatUnreadBadge count={unread?.vk ?? 0} size="xs" />
            </TabsTrigger>
          </TabsList>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshActive}
            disabled={!canRefresh || refreshPending}
            className="self-end sm:self-auto"
          >
            {refreshPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Обновить
          </Button>
        </div>

        <TabsContent value="avito" className="mt-0">
          <AvitoChatPanel />
        </TabsContent>

        <TabsContent value="vk" className="mt-0">
          <VkChatPanel oauthCode={oauthCode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
