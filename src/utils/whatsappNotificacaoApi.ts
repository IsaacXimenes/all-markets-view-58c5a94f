// WhatsApp Notification API - Configuração e disparo de notificações de vendas

export interface ConfigWhatsApp {
  habilitado: boolean;
  apiUrl: string;
  token: string;
  destinatario: string;
  modeloMensagem: string;
}

export interface DadosVendaNotificacao {
  id_venda: string;
  loja: string;
  vendedor: string;
  cliente: string;
  valor: string;
  forma_pagamento: string;
}

const STORAGE_KEY = 'config_whatsapp_notificacao';

export const MENSAGEM_PADRAO = `🚀 Nova Venda Registrada!
💰 Valor: R$ {{valor}}
📍 Loja: {{loja}}
👤 Vendedor: {{vendedor}}
🤝 Cliente: {{cliente}}
💳 Pagamento: {{forma_pagamento}}
🔖 ID da Venda: #{{id_venda}}`;

export const CONFIG_PADRAO: ConfigWhatsApp = {
  habilitado: false,
  apiUrl: '',
  token: '',
  destinatario: '',
  modeloMensagem: '',
};

export const getConfigWhatsApp = (): ConfigWhatsApp => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...CONFIG_PADRAO };
    return JSON.parse(raw);
  } catch {
    return { ...CONFIG_PADRAO };
  }
};

export const salvarConfigWhatsApp = (config: ConfigWhatsApp): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const formatarMensagemVenda = (modelo: string, dados: DadosVendaNotificacao): string => {
  return modelo
    .replace(/\{\{id_venda\}\}/g, dados.id_venda)
    .replace(/\{\{loja\}\}/g, dados.loja)
    .replace(/\{\{vendedor\}\}/g, dados.vendedor)
    .replace(/\{\{cliente\}\}/g, dados.cliente)
    .replace(/\{\{valor\}\}/g, dados.valor)
    .replace(/\{\{forma_pagamento\}\}/g, dados.forma_pagamento);
};

export const enviarNotificacaoVenda = async (dadosVenda: DadosVendaNotificacao): Promise<void> => {
  try {
    const config = getConfigWhatsApp();

    if (!config.habilitado) {
      console.log('[WhatsApp] Notificações desabilitadas.');
      return;
    }

    if (!config.apiUrl || !config.destinatario) {
      console.warn('[WhatsApp] Configuração incompleta (URL ou destinatário ausente).');
      return;
    }

    const modelo = config.modeloMensagem?.trim() || MENSAGEM_PADRAO;
    const mensagem = formatarMensagemVenda(modelo, dadosVenda);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.token?.trim()) {
      headers['Authorization'] = `Bearer ${config.token.trim()}`;
    }

    await fetch(config.apiUrl, {
      method: 'POST',
      headers,
      mode: 'no-cors',
      body: JSON.stringify({
        number: config.destinatario,
        text: mensagem,
      }),
    });

    console.log('[WhatsApp] Notificação enviada com sucesso (modo no-cors, resposta opaca).');
  } catch (error) {
    console.error('[WhatsApp] Erro ao enviar notificação:', error);
  }
};

export const enviarMensagemTeste = async (): Promise<void> => {
  const dadosTeste: DadosVendaNotificacao = {
    id_venda: 'TESTE-001',
    loja: 'Loja Central',
    vendedor: 'João Silva',
    cliente: 'Maria Oliveira',
    valor: '2.499,90',
    forma_pagamento: 'Cartão de Crédito',
  };

  await enviarNotificacaoVenda(dadosTeste);
};
