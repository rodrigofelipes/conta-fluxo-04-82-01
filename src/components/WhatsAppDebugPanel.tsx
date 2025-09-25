import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bug, 
  Phone, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Send,
  Settings,
  MessageSquare,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DebugResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export const WhatsAppDebugPanel: React.FC = () => {
  const [testNumber, setTestNumber] = useState('');
  const [testMessage, setTestMessage] = useState('Mensagem de teste');
  const [debugResults, setDebugResults] = useState<DebugResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Executar verificação de configuração
  const runConfigCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-debug');
      
      const result: DebugResult = {
        success: !error,
        data,
        error: error?.message,
        timestamp: new Date().toISOString()
      };
      
      setDebugResults(prev => [result, ...prev]);
      
      if (result.success) {
        toast({
          title: "✅ Configuração verificada",
          description: "Tokens e configurações estão válidos",
        });
      } else {
        toast({
          title: "❌ Problema na configuração", 
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const result: DebugResult = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      setDebugResults(prev => [result, ...prev]);
      
      toast({
        title: "❌ Erro no debug",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Teste de envio para número específico
  const runSendTest = async () => {
    if (!testNumber.trim()) {
      toast({
        title: "Número obrigatório",
        description: "Por favor, insira um número para teste",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-test-send', {
        body: {
          to: testNumber,
          message: testMessage
        }
      });
      
      const result: DebugResult = {
        success: !error && data?.summary?.successful > 0,
        data,
        error: error?.message,
        timestamp: new Date().toISOString()
      };
      
      setDebugResults(prev => [result, ...prev]);
      
      if (result.success) {
        const successfulFormat = data.results.find((r: any) => r.success)?.number;
        toast({
          title: "✅ Teste bem-sucedido",
          description: `Mensagem enviada com formato: ${successfulFormat}`,
        });
      } else {
        toast({
          title: "❌ Teste falhou",
          description: "Verifique os logs para mais detalhes",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const result: DebugResult = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      setDebugResults(prev => [result, ...prev]);
      
      toast({
        title: "❌ Erro no teste",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Teste com múltiplos formatos de número
  const runMultiFormatTest = async () => {
    if (!testNumber.trim()) return;

    setLoading(true);
    
    // Gerar diferentes formatos do número
    const cleanNumber = testNumber.replace(/[^\d]/g, '');
    const formats = [
      cleanNumber,
      cleanNumber.startsWith('55') ? cleanNumber.substring(2) : '55' + cleanNumber,
      testNumber, // formato original
    ];

    for (const format of formats) {
      try {
        const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            to: format,
            message: `Teste formato ${format}: ${new Date().toLocaleTimeString()}`
          }
        });

        const result: DebugResult = {
          success: !error && data?.success,
          data: { format, ...data },
          error: error?.message,
          timestamp: new Date().toISOString()
        };
        
        setDebugResults(prev => [result, ...prev]);
        
        // Pequena pausa entre testes
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        const result: DebugResult = {
          success: false,
          data: { format },
          error: error.message,
          timestamp: new Date().toISOString()
        };
        setDebugResults(prev => [result, ...prev]);
      }
    }
    
    setLoading(false);
    toast({
      title: "Testes concluídos",
      description: "Verifique os resultados abaixo",
    });
  };

  // Análise de entrega avançada
  const runDeliveryAnalysis = async () => {
    if (!testNumber.trim()) {
      toast({
        title: "Número obrigatório",
        description: "Por favor, insira um número para análise",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Buscar conversa relacionada ao número
      const cleanTestNumber = testNumber.replace(/[^\d]/g, '');
      const { data: conversations } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .or(`phone_number.eq.${testNumber},normalized_phone.eq.${cleanTestNumber}`)
        .limit(1);

      let conversationId = null;
      if (conversations && conversations.length > 0) {
        conversationId = conversations[0].id;
      }

      console.log('=== Chamando whatsapp-delivery-check ===');
      console.log('Parâmetros:', { conversationId, testNumber });

      const { data, error } = await supabase.functions.invoke('whatsapp-delivery-check', {
        body: {
          messageId: null, // Para análise geral
          conversationId,
          phoneNumber: testNumber
        }
      });
      
      console.log('Resposta da função:', { data, error });
      
      const result: DebugResult = {
        success: !error,
        data,
        error: error?.message,
        timestamp: new Date().toISOString()
      };
      
      setDebugResults(prev => [result, ...prev]);
      
      if (result.success) {
        const indicators = data.analysis?.deliveryIndicators || [];
        toast({
          title: "✅ Análise concluída",
          description: indicators.length > 0 ? indicators[0] : "Dados analisados",
        });
      } else {
        toast({
          title: "❌ Erro na análise",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const result: DebugResult = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      setDebugResults(prev => [result, ...prev]);
      
      toast({
        title: "❌ Erro na análise",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setDebugResults([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Painel de Diagnóstico WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="config" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="config">Configuração</TabsTrigger>
              <TabsTrigger value="test">Teste de Envio</TabsTrigger>
              <TabsTrigger value="results">Resultados</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-4">
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Verificar se os tokens do WhatsApp Business API estão configurados corretamente e funcionando.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button 
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('whatsapp-health-check');
                      
                      const result: DebugResult = {
                        success: !error && data?.status === 'HEALTHY',
                        data,
                        error: error?.message,
                        timestamp: new Date().toISOString()
                      };
                      
                      setDebugResults(prev => [result, ...prev]);
                      
                      if (result.success) {
                        toast({
                          title: "✅ Sistema saudável",
                          description: "Todas as configurações estão OK",
                        });
                      } else {
                        const recommendations = data?.recommendations || [];
                        toast({
                          title: "⚠️ Problemas encontrados",
                          description: `${recommendations.length} recomendações geradas`,
                          variant: "destructive",
                        });
                      }
                    } catch (error: any) {
                      toast({
                        title: "❌ Erro no health check",
                        description: error.message,
                        variant: "destructive",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading} 
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {loading ? 'Verificando...' : 'Health Check'}
                </Button>

                <Button 
                  onClick={runConfigCheck} 
                  disabled={loading} 
                  variant="outline"
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {loading ? 'Verificando...' : 'Config Básica'}
                </Button>

                <Button 
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('whatsapp-monitor');
                      
                      const result: DebugResult = {
                        success: !error,
                        data,
                        error: error?.message,
                        timestamp: new Date().toISOString()
                      };
                      
                      setDebugResults(prev => [result, ...prev]);
                      
                      if (result.success) {
                        const alertsCount = data.alerts?.length || 0;
                        toast({
                          title: `📊 Monitoramento concluído`,
                          description: `${alertsCount} alertas encontrados`,
                        });
                      }
                    } catch (error: any) {
                      toast({
                        title: "❌ Erro no monitoramento",
                        description: error.message,
                        variant: "destructive",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  variant="secondary"
                  className="w-full"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {loading ? 'Monitorando...' : 'Monitor 24h'}
                </Button>
              </div>
              
              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  <strong>Health Check:</strong> Verifica tokens, configurações e conectividade completa.<br/>
                  <strong>Config Básica:</strong> Testa apenas tokens e conectividade básica.<br/>
                  <strong>Monitor 24h:</strong> Analisa padrões de entrega das últimas 24 horas.
                </AlertDescription>
              </Alert>
            
              {/* Seção adicional para verificação rápida */}
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">📋 Checklist Rápido</h4>
                <div className="text-sm space-y-1">
                  <div>• Tokens configurados no Supabase</div>
                  <div>• Número WhatsApp Business verificado</div>
                  <div>• Webhook funcionando corretamente</div>
                  <div>• Qualidade da conta em verde</div>
                  <div>• Taxa de resposta adequada</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Número para teste</label>
                  <Input
                    placeholder="Ex: 5531987654321 ou 31987654321"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Mensagem de teste</label>
                  <Textarea
                    placeholder="Digite a mensagem de teste..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button 
                    onClick={runSendTest} 
                    disabled={loading || !testNumber.trim()}
                    variant="default"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Teste Rápido
                  </Button>
                  
                  <Button 
                    onClick={runMultiFormatTest} 
                    disabled={loading || !testNumber.trim()}
                    variant="outline"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Teste Múltiplos Formatos
                  </Button>

                  <Button 
                    onClick={runDeliveryAnalysis} 
                    disabled={loading || !testNumber.trim()}
                    variant="secondary"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Análise Entrega
                  </Button>
                </div>

                <Alert>
                  <MessageSquare className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Teste Rápido:</strong> Testa diferentes formatos automaticamente.<br/>
                    <strong>Múltiplos Formatos:</strong> Envia mensagens reais para cada formato.<br/>
                    <strong>Análise Entrega:</strong> Analisa padrões de entrega baseado no histórico.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Histórico de Testes</h3>
                <Button onClick={clearResults} variant="outline" size="sm">
                  Limpar Histórico
                </Button>
              </div>

              <ScrollArea className="h-96 w-full border rounded-md p-4">
                {debugResults.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum teste executado ainda
                  </div>
                ) : (
                  <div className="space-y-4">
                    {debugResults.map((result, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium">
                              {result.success ? 'Sucesso' : 'Falha'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        
                        {result.error && (
                          <div className="mb-2">
                            <Badge variant="destructive">{result.error}</Badge>
                          </div>
                        )}
                        
                        {result.data && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Ver detalhes
                            </summary>
                            <div className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-96">
                              {/* Renderizar dados estruturados para health check */}
                              {result.data.status && (
                                <div className="mb-4">
                                  <h4 className="font-semibold mb-2">
                                    {result.data.status === 'HEALTHY' ? '✅' : '❌'} Status: {result.data.status}
                                  </h4>
                                  
                                  {result.data.environment && (
                                    <div className="mb-3">
                                      <h5 className="font-medium text-xs mb-1">🌍 Ambiente</h5>
                                      <div className="text-xs grid grid-cols-2 gap-1">
                                        <div>Token: {result.data.environment.hasAccessToken ? '✅' : '❌'}</div>
                                        <div>Phone ID: {result.data.environment.hasPhoneNumberId ? '✅' : '❌'}</div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {result.data.tokenValidation && (
                                    <div className="mb-3">
                                      <h5 className="font-medium text-xs mb-1">🔑 Token</h5>
                                      <div className="text-xs">
                                        Status: {result.data.tokenValidation.valid ? '✅ Válido' : '❌ Inválido'}
                                        {result.data.tokenValidation.account?.name && (
                                          <div>Conta: {result.data.tokenValidation.account.name}</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {result.data.phoneNumberConfig && (
                                    <div className="mb-3">
                                      <h5 className="font-medium text-xs mb-1">📱 Número</h5>
                                      <div className="text-xs">
                                        {result.data.phoneNumberConfig.config?.display_phone_number && (
                                          <div>Número: {result.data.phoneNumberConfig.config.display_phone_number}</div>
                                        )}
                                        {result.data.phoneNumberConfig.config?.code_verification_status && (
                                          <div>Verificação: {result.data.phoneNumberConfig.config.code_verification_status}</div>
                                        )}
                                        {result.data.phoneNumberConfig.config?.quality_rating && (
                                          <div>Qualidade: {result.data.phoneNumberConfig.config.quality_rating}</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {result.data.recentActivity?.last24Hours && (
                                    <div className="mb-3">
                                      <h5 className="font-medium text-xs mb-1">📊 Últimas 24h</h5>
                                      <div className="text-xs grid grid-cols-2 gap-1">
                                        <div>Enviadas: {result.data.recentActivity.last24Hours.outbound}</div>
                                        <div>Recebidas: {result.data.recentActivity.last24Hours.inbound}</div>
                                        <div className="col-span-2">Taxa: {(result.data.recentActivity.last24Hours.responseRate * 100).toFixed(1)}%</div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {result.data.recommendations && result.data.recommendations.length > 0 && (
                                    <div className="mb-3">
                                      <h5 className="font-medium text-xs mb-1">💡 Recomendações</h5>
                                      {result.data.recommendations.map((rec: string, idx: number) => (
                                        <div key={idx} className="text-xs p-1 mb-1 bg-yellow-100 text-yellow-800 rounded">
                                          {rec}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Renderizar dados estruturados para monitoramento */}
                              {result.data.overallStats && (
                                <div className="mb-4">
                                  <h4 className="font-semibold mb-2">📊 Estatísticas Gerais</h4>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>Conversas: {result.data.overallStats.totalConversations}</div>
                                    <div>Enviadas: {result.data.overallStats.totalOutbound}</div>
                                    <div>Recebidas: {result.data.overallStats.totalInbound}</div>
                                    <div>Taxa Resposta: {(result.data.overallStats.averageResponseRate * 100).toFixed(1)}%</div>
                                  </div>
                                </div>
                              )}
                              
                              {result.data.alerts && result.data.alerts.length > 0 && (
                                <div className="mb-4">
                                  <h4 className="font-semibold mb-2">⚠️ Alertas</h4>
                                  {result.data.alerts.map((alert: any, idx: number) => (
                                    <div key={idx} className={`p-2 rounded mb-2 ${
                                      alert.severity === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      <div className="font-medium">{alert.phone}</div>
                                      <div className="text-xs">{alert.message}</div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {result.data.recommendations && result.data.recommendations.length > 0 && (
                                <div className="mb-4">
                                  <h4 className="font-semibold mb-2">💡 Recomendações</h4>
                                  {result.data.recommendations.map((rec: string, idx: number) => (
                                    <div key={idx} className="p-2 bg-blue-100 text-blue-800 rounded mb-1 text-xs">
                                      {rec}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </div>
                          </details>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};