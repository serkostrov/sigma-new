import { PageHeader } from "@/components/app-layout";
import { AvitoChatPanel } from "@/components/avito-chat-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VkChatPanel } from "@/components/vk-chat-panel";

type ChatTab = "vk" | "avito";

export function ChatPage({
  oauthCode,
  initialTab = "vk",
}: {
  oauthCode?: string;
  initialTab?: ChatTab;
}) {
  return (
    <div>
      <PageHeader
        title="Чат"
        description="Сообщения из ВКонтакте и Авито"
      />

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList>
          <TabsTrigger value="vk">ВКонтакте</TabsTrigger>
          <TabsTrigger value="avito">Авито</TabsTrigger>
        </TabsList>

        <TabsContent value="vk" className="mt-4">
          <VkChatPanel oauthCode={oauthCode} />
        </TabsContent>

        <TabsContent value="avito" className="mt-4">
          <AvitoChatPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
