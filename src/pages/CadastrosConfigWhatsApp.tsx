import { useState, useEffect, useMemo } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Save, SendHorizonal, Eye, EyeOff, Info, MessageSquare } from 'lucide-react';
import {
  ConfigWhatsApp,
  CONFIG_PADRAO,
  MENSAGEM_PADRAO,
  getConfigWhatsApp,
  salvarConfigWhatsApp,
  formatarMensagemVenda,
  enviarMensagemTeste,
} from '@/utils/whatsappNotificacaoApi';

export default function CadastrosConfigWhatsApp() {
  const [config, setConfig] = useState<ConfigWhatsApp>(CONFIG_PADRAO);
  const [mostrarToken, setMostrarToken] = useState(false);
  const [enviandoTeste, setEnviandoTeste] = useState(false);

  useEffect(() => {
    setConfig(getConfigWhatsApp());
  }, []);

  const handleSalvar = () => {
    if (config.habilitado) {
      if (!config.apiUrl.startsWith('https://')) {
        toast({ title: 'URL inválida', description: 'A URL da API deve começar com https://', variant: 'destructive' });
        return;
      }
      if (!config.destinatario || !/^\d{10,15}$/.test(config.destinatario)) {
        toast({ title: 'Destinatário inválido', description: 'Informe um número válido (apenas dígitos, com DDD).', variant: 'destructive' });
        return;
      }
    }
    salvarConfigWhatsApp(config);
    toast({ title: 'Configurações salvas!' });
  };

  const handleTestarEnvio = async () => {
    if (!config.apiUrl.startsWith('https://')) {
      toast({ title: 'URL inválida', description: 'Configure uma URL válida antes de testar.', variant: 'destructive' });
      return;
    }
    setEnviandoTeste(true);
    // Salva config temporariamente para o teste usar
    salvarConfigWhatsApp(config);
    try {
      await enviarMensagemTeste();
      toast({ title: 'Teste enviado!', description: 'Verifique no painel da sua API WhatsApp se a mensagem foi recebida.' });
    } catch {
      toast({ title: 'Erro no teste', description: 'Verifique a URL e o token.', variant: 'destructive' });
    } finally {
      setEnviandoTeste(false);
    }
  };

  const previewMensagem = useMemo(() => {
    const modelo = config.modeloMensagem?.trim() || MENSAGEM_PADRAO;
    return formatarMensagemVenda(modelo, {
      id_venda: 'VND-001',
      loja: 'Loja Central',
      vendedor: 'João Silva',
      cliente: 'Maria Oliveira',
      valor: '2.499,90',
      forma_pagamento: 'Cartão de Crédito',
    });
  }, [config.modeloMensagem]);

  return (
    <CadastrosLayout title="Configurações WhatsApp">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Notificação de Vendas via WhatsApp</CardTitle>
            </div>
            <CardDescription>Configure a integração com sua API de WhatsApp para receber notificações automáticas a cada nova venda finalizada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Switch habilitar */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-sm font-medium">Habilitar Notificações</Label>
                <p className="text-xs text-muted-foreground">Ativa o envio automático ao finalizar vendas</p>
              </div>
              <Switch checked={config.habilitado} onCheckedChange={(v) => setConfig({ ...config, habilitado: v })} />
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="apiUrl">URL da API WhatsApp</Label>
              <Input
                id="apiUrl"
                placeholder="https://api.exemplo.com/send-message"
                value={config.apiUrl}
                onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
              />
            </div>

            {/* Token */}
            <div className="space-y-2">
              <Label htmlFor="token">Token de Autenticação</Label>
              <div className="relative">
                <Input
                  id="token"
                  type={mostrarToken ? 'text' : 'password'}
                  placeholder="Insira o token da API"
                  value={config.token}
                  onChange={(e) => setConfig({ ...config, token: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setMostrarToken(!mostrarToken)}
                >
                  {mostrarToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Destinatário */}
            <div className="space-y-2">
              <Label htmlFor="destinatario">Número / ID do Destinatário</Label>
              <Input
                id="destinatario"
                placeholder="5511999999999"
                value={config.destinatario}
                onChange={(e) => setConfig({ ...config, destinatario: e.target.value.replace(/\D/g, '') })}
              />
              <p className="text-xs text-muted-foreground">Apenas números com código do país e DDD</p>
            </div>

            {/* Modelo mensagem */}
            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo da Mensagem (opcional)</Label>
              <Textarea
                id="modelo"
                rows={6}
                placeholder={MENSAGEM_PADRAO}
                value={config.modeloMensagem}
                onChange={(e) => setConfig({ ...config, modeloMensagem: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Placeholders: {'{{id_venda}}'}, {'{{loja}}'}, {'{{vendedor}}'}, {'{{cliente}}'}, {'{{valor}}'}, {'{{forma_pagamento}}'}
              </p>
            </div>

            {/* Ações */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={handleSalvar}>
                <Save className="mr-2 h-4 w-4" /> Salvar Configurações
              </Button>
              <Button variant="outline" onClick={handleTestarEnvio} disabled={enviandoTeste}>
                <SendHorizonal className="mr-2 h-4 w-4" /> {enviandoTeste ? 'Enviando...' : 'Testar Envio'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview + Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview da Mensagem</CardTitle>
              <CardDescription>Visualização com dados fictícios</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm font-mono">{previewMensagem}</pre>
            </CardContent>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Informações Importantes</AlertTitle>
            <AlertDescription className="space-y-2 text-xs">
              <p>• A requisição é enviada com <code>mode: "no-cors"</code>. Isso significa que o sistema não consegue ler a resposta da API — verifique o recebimento diretamente no painel da sua API.</p>
              <p>• O payload enviado segue o formato <code>{`{ number, text }`}</code>. Ajuste conforme sua API (Evolution, Z-API, Twilio, etc.).</p>
              <p>• O token é armazenado no navegador (localStorage). Adequado para uso interno.</p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </CadastrosLayout>
  );
}
