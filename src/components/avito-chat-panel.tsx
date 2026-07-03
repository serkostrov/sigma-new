import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, ShoppingBag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  useAvitoChatStatus,
  useAvitoConversations,
  useAvitoMessages,
  useSendAvitoMessage,
  useSyncAvitoChat,
  useSyncAvitoChatMessages,
  type AvitoConversation,
} from "@/lib/avito-chat-api";
import { MessageBubble, MessengerLayout } from "@/components/vk-chat-panel";
import { toast } from "sonner";

function formatMessageTime(unixSeconds: number): string {
  return format(new Date(unixSeconds * 1000), "dd MMM, HH:mm", { locale: ru });
}

function AvitoConversationItem({
  item,
  active,
  onClick,
}: {
  item: AvitoConversation;
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
        <AvatarFallback>{initials || "А"}</AvatarFallback>
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
        {item.item_title ? (
          <p className="text-[11px] text-muted-foreground truncate">{item.item_title}</p>
        ) : null}
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {item.last_message_text || "Нет сообщений"}
        </p>
      </div>
    </button>
  );
}

function AvitoConnectPanel() {
  const { isLoading } = useAvitoChatStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Проверка подключения…
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-8 p-8 bg-muted/30 border border-border rounded-xl text-center space-y-4">
      <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground" />
      <h2 className="text-lg font-semibold">Подключите Авито</h2>
      <p className="text-sm text-muted-foreground">
        Зарегистрируйте приложение в личном кабинете Авито → Настройки → API и добавьте в{" "}
        <code className="text-xs">.env</code>:
      </p>
      <pre className="text-left text-xs bg-muted p-3 rounded-lg overflow-x-auto">
        {`AVITO_CLIENT_ID=ваш_client_id
AVITO_CLIENT_SECRET=ваш_client_secret
AVITO_USER_ID=опционально`}
      </pre>
      <p className="text-xs text-muted-foreground">
        Если <code className="text-xs">AVITO_USER_ID</code> не указан, ID аккаунта определится
        автоматически. Для чтения и отправки сообщений нужна подписка «API мессенджера» на Авито.
      </p>
    </div>
  );
}

export function AvitoChatPanel() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const { data: status } = useAvitoChatStatus();
  const { data: conversations, isLoading: convLoading } = useAvitoConversations();
  const { data: messages, isLoading: msgLoading } = useAvitoMessages(selectedChat);
  const syncAll = useSyncAvitoChat();
  const syncChat = useSyncAvitoChatMessages();
  const send = useSendAvitoMessage();

  useEffect(() => {
    if (!status?.connected) return;
    syncAll.mutate();
    const id = window.setInterval(() => syncAll.mutate(), 20_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected]);

  useEffect(() => {
    if (selectedChat == null) return;
    syncChat.mutate(selectedChat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]);

  const activeConversation = conversations?.find((c) => c.chat_id === selectedChat);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || selectedChat == null) return;
    send.mutate(
      { chatId: selectedChat, text },
      {
        onSuccess: () => setDraft(""),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Не удалось отправить"),
      },
    );
  };

  if (!status?.connected) {
    return <AvitoConnectPanel />;
  }

  return (
    <MessengerLayout
      conversationsLoading={convLoading}
      conversationsEmpty={(conversations?.length ?? 0) === 0}
      selectedId={selectedChat}
      onBack={() => setSelectedChat(null)}
      onRefresh={() => syncAll.mutate()}
      refreshPending={syncAll.isPending}
      conversationList={
        conversations?.map((c) => (
          <AvitoConversationItem
            key={c.chat_id}
            item={c}
            active={selectedChat === c.chat_id}
            onClick={() => setSelectedChat(c.chat_id)}
          />
        )) ?? null
      }
      threadTitle={activeConversation?.title ?? (selectedChat != null ? "Диалог" : "")}
      messagesLoading={msgLoading}
      messages={
        messages?.map((m) => (
          <MessageBubble
            key={m.message_id}
            text={m.text}
            isOutgoing={m.is_outgoing}
            time={formatMessageTime(m.avito_created)}
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
