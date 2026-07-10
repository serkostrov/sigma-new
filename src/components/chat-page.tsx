import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/app-layout";
import { AvitoChatPanel } from "@/components/avito-chat-panel";
import { ChatUnreadBadge } from "@/components/chat-unread-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChatUnreadCounts } from "@/lib/chat-unread-api";
import { useAvitoChatStatus, useSyncAvitoChat } from "@/lib/avito-chat-api";

export type ChatTab = "listings" | "personal";

export function ChatPage({ initialTab = "listings" }: { initialTab?: ChatTab }) {
  const [tab, setTab] = useState<ChatTab>(initialTab);

  const { data: unread } = useChatUnreadCounts();
  const { data: avitoStatus } = useAvitoChatStatus();
  const avitoSync = useSyncAvitoChat();

  const refreshActive = () => {
    if (avitoStatus?.connected) avitoSync.mutate();
  };

  const refreshPending = avitoSync.isPending;
  const canRefresh = Boolean(avitoStatus?.connected);

  useEffect(() => {
    if (!avitoStatus?.connected) return;
    avitoSync.mutate();
    const id = window.setInterval(() => avitoSync.mutate(), 20_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avitoStatus?.connected]);

  return (
    <div>
      <PageHeader
        title="Чат"
        description="Сообщения Авито по объявлениям и в личке"
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ChatTab)} className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <TabsList>
            <TabsTrigger value="listings" className="gap-2">
              Объявления
              <ChatUnreadBadge count={unread?.listings ?? 0} size="xs" />
            </TabsTrigger>
            <TabsTrigger value="personal" className="gap-2">
              Личные сообщения
              <ChatUnreadBadge count={unread?.personal ?? 0} size="xs" />
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

        <TabsContent value="listings" className="mt-0">
          <AvitoChatPanel kind="u2i" />
        </TabsContent>

        <TabsContent value="personal" className="mt-0">
          <AvitoChatPanel kind="u2u" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
