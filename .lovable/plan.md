

## Campos de Pagamento nos Modais de Encaminhamento e Agrupamento

### Resumo

Adicionar campos de pagamento (Forma de Pagamento, Conta Bancaria, Nome do Recebedor, Chave Pix, Observacao obrigatoria) nos modais de "Encaminhar para Financeiro" (1 item) e "Agrupar para Pagamento" (2+ itens). Os dados preenchidos serao salvos na nota e exibidos no quadro de conferencia do Financeiro.

---

### 1. Novos campos na `NotaAssistencia` (`src/utils/solicitacaoPecasApi.ts`)

Adicionar campos opcionais na interface `NotaAssistencia`:
- `formaPagamentoEncaminhamento?: string` (Pix ou Dinheiro)
- `contaBancariaEncaminhamento?: string`
- `nomeRecebedor?: string`
- `chavePixEncaminhamento?: string`
- `observacaoEncaminhamento?: string`

Atualizar `encaminharParaFinanceiro` e `agruparParaPagamento` para aceitar e propagar um objeto `dadosPagamento` com esses campos para as notas criadas.

### 2. Campos nos Modais (`src/pages/OSSolicitacoesPecas.tsx`)

**Novos estados:**
- `encFormaPagamento`, `encContaBancaria`, `encNomeRecebedor`, `encChavePix`, `encObservacao`
- Reset ao abrir/fechar qualquer modal

**Modal "Confirmar Encaminhamento" (1 item) - linhas 748-782:**
Adicionar apos o resumo de valores:
- Select: Forma de Pagamento (Pix / Dinheiro) - obrigatorio
- Se Pix: Input Conta Bancaria, Input Nome do Recebedor, Input Chave Pix
- Textarea: Observacao (obrigatoria)
- Botao desabilitado ate preencher forma de pagamento + observacao

**Modal "Agrupar para Pagamento" (2+ itens) - linhas 784-837:**
Mesmos campos adicionados apos o detalhamento das pecas:
- Select Forma de Pagamento, campos condicionais Pix, Textarea Observacao
- Botao desabilitado ate preencher forma de pagamento + observacao

**Handlers:**
- `handleConfirmarEncaminhamento`: validar e passar `dadosPagamento`
- `handleConfirmarAgrupamento`: validar e passar `dadosPagamento`

### 3. Exibicao no Financeiro (`src/pages/FinanceiroNotasAssistencia.tsx`)

No modal de conferencia (linhas 396-605), adicionar um bloco de "Dados de Pagamento Informados" acima da secao de pagamento do financeiro:
- Card informativo (estilo azul, similar ao existente para dados Pix) exibindo:
  - Forma de Pagamento informada
  - Conta Bancaria (se Pix)
  - Nome do Recebedor (se Pix)
  - Chave Pix (se Pix)
  - Observacao
- Visivel tanto para notas pendentes quanto concluidas
- Esse bloco e somente leitura - sao os dados informados pela gestao no encaminhamento

---

### Detalhes Tecnicos

| Arquivo | Alteracao |
|---------|-----------|
| `src/utils/solicitacaoPecasApi.ts` | 5 novos campos opcionais em `NotaAssistencia`, parametro `dadosPagamento` em `encaminharParaFinanceiro` e `agruparParaPagamento` |
| `src/pages/OSSolicitacoesPecas.tsx` | 5 novos estados, formulario de pagamento em ambos os modais, validacao nos handlers |
| `src/pages/FinanceiroNotasAssistencia.tsx` | Bloco informativo "Dados de Pagamento" no modal de conferencia, exibindo os dados informados no encaminhamento |

Nenhum arquivo novo sera criado. O fluxo existente de conferencia do financeiro (conta, forma, comprovante) permanece inalterado - os novos dados sao informativos para o financeiro consultar durante a conferencia.

