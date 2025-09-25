import { PageHeader } from "@/components/ui/page-header";
import { WhatsAppConversations } from '@/components/WhatsAppConversations';
import { WhatsAppDebugPanel } from '@/components/WhatsAppDebugPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Support() {
  return (
    <main className="h-screen flex flex-col">
      <PageHeader 
        title="Suporte WhatsApp" 
        subtitle="Sistema de comunicação via WhatsApp"
        className="border-b border-primary/20 flex-shrink-0"
      />

      <div className="flex-1 min-h-0 p-4">
        <Tabs defaultValue="conversations" className="h-full">
          <TabsList className="mb-4">
            <TabsTrigger value="conversations">Conversas</TabsTrigger>
            <TabsTrigger value="debug">Diagnóstico</TabsTrigger>
          </TabsList>
          
          <TabsContent value="conversations" className="h-full">
            <WhatsAppConversations />
          </TabsContent>
          
          <TabsContent value="debug" className="h-full">
            <WhatsAppDebugPanel />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}