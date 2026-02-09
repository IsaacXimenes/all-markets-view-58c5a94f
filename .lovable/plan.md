

# Plano: Notificacao Automatica via WhatsApp para Novas Vendas

## Resumo

Implementar um sistema de notificacao via WhatsApp que dispara automaticamente ao finalizar uma venda no Financeiro. Inclui uma tela de configuracao no modulo de Cadastros para o gestor definir URL da API, token, destinatario e modelo de mensagem.

## Arquitetura

Como o sistema e 100% frontend (sem backend/Supabase), a chamada HTTP para a API de WhatsApp sera feita diretamente do navegador usando `fetch` com `mode: "no-cors"` (mesmo padrao usado em webhooks Zapier). As configuracoes serao persistidas em localStorage.

**Importante**: Como nao ha backend, o token da API ficara armazenado no localStorage do navegador. Isso e aceitavel para o contexto atual (sistema interno), mas nao seria recomendado para producao publica.

## Estrutura de Dados

### Configuracao WhatsApp (em `src/utils/whatsappNotificacaoApi.ts`)

```text
ConfigWhatsApp
  - habilitado: boolean
  - apiUrl: string (URL do endpoint da API WhatsApp)
  - token: string (Token de autenticacao)
  - destinatario: string (Numero ou ID do grupo)
  - modeloMensagem: string (Texto com placeholders)
```

### Placeholders disponiveis no modelo de mensagem

```text
{{id_venda}}
{{loja}}
{{vendedor}}
{{cliente}}
{{valor}}
{{forma_pagamento}}
```

### Mensagem padrao (quando modelo nao configurado)

```text
Nova Venda Registrada!
Valor: R$ {{valor}}
Loja: {{loja}}
Vendedor: {{vendedor}}
Cliente: {{cliente}}
Pagamento: {{forma_pagamento}}
ID da Venda: #{{id_venda}}
```

## Arquivos a Criar

### 1. `src/utils/whatsappNotificacaoApi.ts`

API de configuracao e disparo com:
- Interface `ConfigWhatsApp`
- `getConfigWhatsApp()` - buscar config do localStorage
- `salvarConfigWhatsApp(config)` - salvar config no localStorage
- `enviarNotificacaoVenda(venda)` - montar payload e disparar fetch POST
- `formatarMensagemVenda(modelo, dadosVenda)` - substituir placeholders
- `MENSAGEM_PADRAO` - template default com emojis
- Log de erros no console para monitoramento

### 2. `src/pages/CadastrosConfigWhatsApp.tsx`

Tela de configuracao com:
- Switch "Habilitar Notificacoes de Vendas"
- Campo URL da API WhatsApp (com validacao de URL)
- Campo Token de Autenticacao (tipo password, com toggle de visibilidade)
- Campo Numero/ID do Destinatario
- Campo Modelo da Mensagem (textarea multilinha com instrucoes dos placeholders)
- Botao "Testar Envio" para validar a integracao
- Botao "Salvar Configuracoes"
- Preview da mensagem formatada em tempo real

## Arquivos a Modificar

### 1. `src/utils/fluxoVendasApi.ts`

Na funcao `finalizarVenda` (linha ~435, apos salvar e migrar trade-ins):
- Importar `enviarNotificacaoVenda` de `whatsappNotificacaoApi`
- Chamar `enviarNotificacaoVenda(venda)` apos a finalizacao bem-sucedida
- Envolver em try/catch para nao impactar o fluxo principal em caso de erro

Tambem na funcao `finalizarVendaDowngrade` (se existir logica similar):
- Adicionar o mesmo disparo de notificacao

### 2. `src/components/layout/CadastrosLayout.tsx`

- Adicionar nova aba "Config. WhatsApp" no array de tabs
- Rota: `/cadastros/config-whatsapp`
- Icone: `MessageSquare` do lucide-react

### 3. `src/App.tsx`

- Importar `CadastrosConfigWhatsApp`
- Adicionar rota `/cadastros/config-whatsapp`

## Fluxo Tecnico

```text
1. Financeiro finaliza venda (finalizarVenda ou finalizarVendaFinanceiro)
   |
   v
2. Sistema verifica se notificacao WhatsApp esta habilitada (localStorage)
   |-- Nao habilitada -> encerra silenciosamente
   |
   v
3. Monta payload com dados da venda:
   - ID, loja, vendedor, cliente, valor, forma de pagamento principal
   |
   v
4. Formata mensagem usando modelo configurado (ou padrao)
   |
   v
5. Envia POST para a URL da API configurada:
   - Headers: Authorization: Bearer {token}, Content-Type: application/json
   - Body: { number: destinatario, text: mensagemFormatada }
   - mode: "no-cors" (para evitar bloqueio CORS no navegador)
   |
   v
6. Resultado logado no console (sucesso ou erro)
   - Falhas NAO bloqueiam a finalizacao da venda
```

## Detalhes de Implementacao

### Chamada HTTP

```text
fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token  (se token configurado)
  },
  mode: 'no-cors',
  body: JSON.stringify({
    number: destinatario,
    text: mensagemFormatada
  })
})
```

Nota: Com `mode: "no-cors"`, a resposta nao sera legivel (opaque response). O sistema exibira mensagem informativa de que a requisicao foi enviada e o usuario deve verificar no painel da API WhatsApp.

### Validacao de Campos

- URL: verificar se comeca com `https://`
- Destinatario: aceitar formato `5511999999999` (apenas numeros, com DDD)
- Token: campo obrigatorio se a API exigir
- Modelo: opcional (usa padrao se vazio)

### Botao "Testar Envio"

Envia uma mensagem de teste com dados ficticios para validar que a integracao esta funcionando antes de ativar em producao.

## Pontos de Atencao

1. **Sem backend**: A chamada e feita direto do navegador. Algumas APIs de WhatsApp podem bloquear requisicoes de origens desconhecidas (CORS). O `no-cors` mitiga isso mas impede leitura da resposta.

2. **Seguranca**: O token fica no localStorage. Aceitavel para sistema interno, mas deve ser documentado.

3. **Formato do payload**: O corpo da requisicao segue um formato generico (`number` + `text`). O usuario pode precisar ajustar conforme a API especifica (Evolution API, Z-API, Twilio, etc.).

4. **Nao bloqueante**: Erros no envio da notificacao nunca impedem a finalizacao da venda.

