import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, ShoppingBag } from "lucide-react";
import { MessengerConversationItem } from "@/components/messenger-conversation-item";
import { MessageBubble, MessengerLayout } from "@/components/vk-chat-panel";
import {
  AVITO_ATTACHMENT_ACCEPT,
  avitoAttachmentHint,
  useAvitoChatStatus,
  useAvitoConversations,
  useAvitoMessages,
  useMarkAvitoChatRead,
  useSendAvitoAttachment,
  useSendAvitoMessage,
  useSyncAvitoChatMessages,
  type AvitoConversation,
} from "@/lib/avito-chat-api";
import { toast } from "sonner";

function formatMessageTime(unixSeconds: number): string {
  return format(new Date(unixSeconds * 1000), "dd MMM, HH:mm", { locale: ru });
}

function conversationInitials(title: string): string {
  return title
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
  const {
    data: messages,
    isLoading: msgLoading,
    isError: msgError,
    error: msgErrorDetail,
  } = useAvitoMessages(selectedChat, status?.messengerApiAvailable);
  const syncChat = useSyncAvitoChatMessages();
  const send = useSendAvitoMessage();
  const sendAttachment = useSendAvitoAttachment();
  const markRead = useMarkAvitoChatRead();

  useEffect(() => {
    if (selectedChat == null) return;
    syncChat.mutate(selectedChat);
    markRead.mutate(selectedChat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]);

  const activeConversation = conversations?.find((c) => c.chat_id === selectedChat);
  const previewOnly = status?.messengerApiAvailable === false;
  const threadNotice = previewOnly
    ? "Полная история недоступна без подписки «API мессенджера» на Авито. Показано последнее сообщение из списка чатов."
    : null;

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

  const handleAttachFiles = async (files: File[]) => {
    if (selectedChat == null || files.length === 0) return;

    for (const file of files) {
      const hint = avitoAttachmentHint(file);
      if (hint) toast.info(hint);

      try {
        const result = await sendAttachment.mutateAsync({ chatId: selectedChat, file });
        if (result.delivery === "image") {
          toast.success(`Фото «${file.name}» отправлено`);
        } else {
          toast.success(`Файл «${file.name}» отправлен ссылкой`);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Не удалось отправить «${file.name}»`);
      }
    }
  };

  const sendPending = send.isPending || sendAttachment.isPending;

  if (!status?.connected) {
    return <AvitoConnectPanel />;
  }

  return (
    <MessengerLayout
      conversationsLoading={convLoading}
      conversationsEmpty={(conversations?.length ?? 0) === 0}
      selectedId={selectedChat}
      onBack={() => setSelectedChat(null)}
      conversationList={
        conversations?.map((c: AvitoConversation) => (
          <MessengerConversationItem
            key={c.chat_id}
            title={c.title}
            subtitle={c.item_title}
            preview={c.last_message_text}
            photoUrl={c.photo_url}
            initials={conversationInitials(c.title) || "А"}
            unreadCount={c.unread_count}
            active={selectedChat === c.chat_id}
            onClick={() => setSelectedChat(c.chat_id)}
          />
        )) ?? null
      }
      threadTitle={activeConversation?.title ?? (selectedChat != null ? "Диалог" : "")}
      threadNotice={threadNotice}
      messagesLoading={msgLoading}
      messagesError={
        msgError
          ? msgErrorDetail instanceof Error
            ? msgErrorDetail.message
            : "Не удалось загрузить сообщения"
          : null
      }
      messagesEmpty={(messages?.length ?? 0) === 0}
      messagesScrollDep={selectedChat != null ? `${selectedChat}-${messages?.length ?? 0}` : null}
      messages={
        messages?.map((m) => (
          <MessageBubble
            key={m.message_id}
            text={m.text}
            imageUrl={m.image_url}
            linkUrl={m.link_url}
            linkTitle={m.link_title}
            messageType={m.message_type}
            isOutgoing={m.is_outgoing}
            time={formatMessageTime(m.avito_created)}
          />
        )) ?? null
      }
      draft={draft}
      onDraftChange={setDraft}
      onSend={handleSend}
      sendPending={sendPending}
      enableAttach
      attachAccept={AVITO_ATTACHMENT_ACCEPT}
      onAttachFiles={handleAttachFiles}
    />
  );
}
