import { useEffect, useRef, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, MessageCircle, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useConnectVk,
  useSendVkMessage,
  useSyncVkChat,
  useVkAuthUrl,
  useVkChatStatus,
  useVkConversations,
  useVkMessages,
  type VkConversation,
} from "@/lib/vk-chat-api";

function formatMessageTime(unixSeconds: number): string {
  return format(new Date(unixSeconds * 1000), "dd MMM, HH:mm", { locale: ru });
}

function ConversationItem({
  item,
  active,
  onClick,
}: {
  item: VkConversation;
  active: boolean;
  onClick: () => void;
}) {
  const initials = item.title
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-3 py-3 text-left rounded-lg transition-colors",
        active ? "bg-primary/10" : "hover:bg-muted/60",
      )}
    >
      <Avatar className="h-10 w-10">
        {item.photo_url ? <AvatarImage src={item.photo_url} alt={item.title} /> : null}
        <AvatarFallback>{initials || "?"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">{item.title}</span>
          {item.unread_count > 0 ? (
            <span className="shrink-0 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
              {item.unread_count}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {item.last_message_text || "Нет сообщений"}
        </p>
      </div>
    </button>
  );
}

function VkConnectPanel() {
  const { data: status, isLoading } = useVkChatStatus();
  const authUrl = useVkAuthUrl();
  const connect = useConnectVk();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Проверка подключения…
      </div>
    );
  }

  if (status?.connected) return null;

  const handleOAuth = async () => {
    try {
      const { url } = await authUrl.mutateAsync();
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось открыть авторизацию VK");
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-8 p-8 bg-muted/30 border border-border rounded-xl text-center space-y-4">
      <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground" />
      <h2 className="text-lg font-semibold">Подключите ВКонтакте</h2>
      <p className="text-sm text-muted-foreground">
        Подключите аккаунт через OAuth или укажите{" "}
        <code className="text-xs">VK_ACCESS_TOKEN</code> в .env сервера.
      </p>
      {status?.oauthAvailable ? (
        <Button onClick={handleOAuth} disabled={authUrl.isPending}>
          {authUrl.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Войти через ВКонтакте
        </Button>
      ) : (
        <p className="text-xs text-amber-600">
          Для OAuth задайте VK_APP_ID, VK_APP_SECRET и VK_REDIRECT_URI в .env
        </p>
      )}
      {connect.isPending ? (
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Синхронизация сообщений…
        </p>
      ) : null}
    </div>
  );
}

export function VkChatPanel({ oauthCode }: { oauthCode?: string }) {
  const [selectedPeer, setSelectedPeer] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const oauthHandled = useRef(false);

  const { data: status } = useVkChatStatus();
  const { data: conversations, isLoading: convLoading } = useVkConversations();
  const {
    data: messages,
    isLoading: msgLoading,
    isError: msgError,
    error: msgErrorDetail,
  } = useVkMessages(selectedPeer);
  const syncAll = useSyncVkChat();
  const send = useSendVkMessage();
  const connect = useConnectVk();

  useEffect(() => {
    if (!oauthCode || oauthHandled.current) return;
    oauthHandled.current = true;
    connect.mutate(oauthCode, {
      onSuccess: () => {
        toast.success("ВКонтакте подключён");
        syncAll.mutate();
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка подключения VK"),
    });
  }, [oauthCode, connect, syncAll]);

  useEffect(() => {
    if (!status?.connected) return;
    syncAll.mutate();
    const id = window.setInterval(() => syncAll.mutate(), 20_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected]);

  const activeConversation = conversations?.find((c) => c.peer_id === selectedPeer);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || selectedPeer == null) return;
    send.mutate(
      { peerId: selectedPeer, text },
      {
        onSuccess: () => setDraft(""),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Не удалось отправить"),
      },
    );
  };

  if (!status?.connected && !connect.isSuccess) {
    return <VkConnectPanel />;
  }

  return (
    <MessengerLayout
      conversationsLoading={convLoading}
      conversationsEmpty={(conversations?.length ?? 0) === 0}
      selectedId={selectedPeer}
      onBack={() => setSelectedPeer(null)}
      onRefresh={() => syncAll.mutate()}
      refreshPending={syncAll.isPending}
      conversationList={
        conversations?.map((c) => (
          <ConversationItem
            key={c.peer_id}
            item={c}
            active={selectedPeer === c.peer_id}
            onClick={() => setSelectedPeer(Number(c.peer_id))}
          />
        )) ?? null
      }
      threadTitle={activeConversation?.title ?? (selectedPeer != null ? `Диалог ${selectedPeer}` : "")}
      threadNotice={null}
      messagesLoading={msgLoading}
      messagesError={msgError ? (msgErrorDetail instanceof Error ? msgErrorDetail.message : "Не удалось загрузить сообщения") : null}
      messagesEmpty={(messages?.length ?? 0) === 0}
      messages={
        messages?.map((m) => (
          <MessageBubble
            key={m.vk_message_id}
            text={m.text}
            isOutgoing={m.is_outgoing}
            time={formatMessageTime(m.vk_date)}
          />
        )) ?? null
      }
      draft={draft}
      onDraftChange={setDraft}
      onSend={handleSend}
      sendPending={send.isPending}
    />
  );
}

export function MessageBubble({
  text,
  isOutgoing,
  time,
}: {
  text: string;
  isOutgoing: boolean;
  time: string;
}) {
  return (
    <div className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
          isOutgoing ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{text || "—"}</p>
        <p
          className={cn(
            "text-[10px] mt-1 opacity-70",
            isOutgoing ? "text-right" : "text-left",
          )}
        >
          {time}
        </p>
      </div>
    </div>
  );
}

export function MessengerLayout({
  conversationsLoading,
  conversationsEmpty,
  conversationList,
  selectedId,
  onBack,
  threadTitle,
  threadNotice,
  messagesLoading,
  messagesError,
  messagesEmpty,
  messages,
  draft,
  onDraftChange,
  onSend,
  sendPending,
  onRefresh,
  refreshPending,
}: {
  conversationsLoading: boolean;
  conversationsEmpty: boolean;
  conversationList: ReactNode;
  selectedId: string | number | null;
  onBack: () => void;
  threadTitle: string;
  threadNotice?: string | null;
  messagesLoading: boolean;
  messagesError: string | null;
  messagesEmpty: boolean;
  messages: ReactNode;
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  sendPending: boolean;
  onRefresh: () => void;
  refreshPending: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshPending}>
          {refreshPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1" />
          )}
          Обновить
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden h-[calc(100vh-14rem)] flex flex-col md:flex-row">
        <aside
          className={cn(
            "w-full md:w-80 border-r border-border flex flex-col shrink-0",
            selectedId != null ? "hidden md:flex" : "flex",
          )}
        >
          <div className="p-3 border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
            Диалоги
          </div>
          <ScrollArea className="flex-1">
            {conversationsLoading ? (
              <div className="p-6 text-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </div>
            ) : conversationsEmpty ? (
              <p className="p-6 text-sm text-muted-foreground text-center">
                Диалогов пока нет. Нажмите «Обновить».
              </p>
            ) : (
              <div className="p-2 space-y-1">{conversationList}</div>
            )}
          </ScrollArea>
        </aside>

        <section
          className={cn(
            "flex-1 flex flex-col min-w-0",
            selectedId == null ? "hidden md:flex" : "flex",
          )}
        >
          {selectedId == null ? (
            <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
              Выберите диалог слева
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border font-medium truncate flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden shrink-0"
                  onClick={onBack}
                >
                  ←
                </Button>
                <span className="truncate">{threadTitle}</span>
              </div>
              {threadNotice ? (
                <p className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900">
                  {threadNotice}
                </p>
              ) : null}
              <ScrollArea className="flex-1 min-h-0 p-4">
                {messagesLoading ? (
                  <div className="text-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  </div>
                ) : messagesError ? (
                  <p className="text-sm text-destructive text-center">{messagesError}</p>
                ) : messagesEmpty ? (
                  <p className="text-sm text-muted-foreground text-center">
                    Сообщений пока нет
                  </p>
                ) : (
                  <div className="space-y-3">{messages}</div>
                )}
              </ScrollArea>
              <div className="p-3 border-t border-border flex gap-2">
                <Input
                  placeholder="Написать сообщение…"
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                  disabled={sendPending}
                />
                <Button onClick={onSend} disabled={sendPending || !draft.trim()}>
                  {sendPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
