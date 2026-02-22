

## Reestruturacao Profunda: Unificacao Estoque-Assistencia-Financeiro

### Analise do Estado Atual vs. Solicitado

Apos analise detalhada do codigo, grande parte das funcionalidades ja esta implementada. Este plano foca exclusivamente no que falta ou precisa ser ajustado.

---

### Funcionalidades JA IMPLEMENTADAS (nenhuma acao necessaria)

- Cards de custo com "explosao de origem" (Consignado, Estoque Thiago, Retirada, Fornecedor)
- Coluna "Origem da Peca" com badges coloridos em OSAssistenciaDetalhes
- Dois botoes de acao por linha (Encaminhar Assistencia / Enviar Direto Financeiro) na tabela de Notas
- Coluna "Status de Revisao" (Pendente, Em Revisao - Lote #ID, Enviado Direto)
- Lote de Revisao agrupando aparelhos em uma unica OS
- Cronometro de produtividade (Iniciar, Pausar, Finalizar) com tempo liquido
- Unificacao da interface de selecao de pecas (Nova OS = Edicao OS)
- Dashboard com 4 cards mestres e grafico de composicao por origem
- Desvinculacao individual de nota no Financeiro
- OS Vinculada no detalhamento do Financeiro
- Consignacao com pagamentos parciais e fechamento flexivel
- DNA da Peca com 3 selos de rastreabilidade

---

### O QUE PRECISA SER IMPLEMENTADO

#### 1. Central de Decisao da Nota (Pos-Conferencia)

**Arquivo: `src/pages/EstoqueNotaConferencia.tsx`**

Apos 100% de conferencia, antes de finalizar, apresentar um "painel de decisao" com:
- Verificacao de IMEI obrigatorio: bloquear finalizacao se algum aparelho nao tiver IMEI preenchido
- Botao "Caminho Verde - Lote OK" (envia ao Financeiro, aparelhos ficam Disponivel)
- Botao "Caminho Amarelo - Lote com Defeito" (redireciona para a pagina de encaminhar assistencia)

Atualmente a conferencia finaliza sem essa tela de decisao.

#### 2. Status "Em Revisao Tecnica" nos Produtos

**Arquivo: `src/utils/estoqueApi.ts`**

Adicionar status `Em Revisao Tecnica` aos produtos quando encaminhados via Lote de Revisao. Esses produtos devem ficar invisiveis para venda (filtrados nas telas de venda e estoque disponivel).

**Arquivo: `src/pages/EstoqueEncaminharAssistencia.tsx`**

Apos criar o lote de revisao, atualizar o status de cada produto cadastrado na nota para "Em Revisao Tecnica".

#### 3. Icone de "Credito de Fornecedor" na Tabela de Notas

**Arquivo: `src/utils/notaEntradaFluxoApi.ts`**

Adicionar interface `CreditoFornecedor` e funcoes para:
- Gerar credito automaticamente quando nota com pagamento antecipado tem reparos (Vale-Credito)
- Consultar extrato de creditos por fornecedor

**Arquivo: `src/components/estoque/TabelaNotasPendencias.tsx`**

Adicionar icone de moeda ao lado do nome do fornecedor. Ao clicar, abrir modal com extrato de creditos do fornecedor.

#### 4. Matriz de Abatimento no Financeiro

**Arquivo: `src/pages/FinanceiroNotasAssistencia.tsx`**

No modal de conferencia de notas vinculadas a Lotes de Revisao:
- Exibir o custo total de reparos como abatimento automatico no saldo devedor (Pagamento Pos/Parcial)
- Para notas com Pagamento 100% Antecipado, exibir card de "Vale-Credito de Fornecedor" gerado
- Card vermelho de alerta se custo de reparo > 15% do valor da nota

#### 5. Retorno de Assistencia para Estoque (Logistica Reversa)

**Arquivo: `src/utils/loteRevisaoApi.ts`**

Ao finalizar um lote de revisao (todos os reparos concluidos):
- Aparelhos consertados: retornar para Conferencia de Estoque com tag `[Retorno de Assistencia]` - ficam Disponivel apenas apos OK do estoquista
- Aparelhos para devolucao: gerar abatimento integral no valor de compra, status `Devolvido ao Fornecedor`

**Arquivo: `src/pages/EstoqueProdutosPendentes.tsx`**

Adicionar filtro/badge para produtos com tag `[Retorno de Assistencia]` aguardando validacao do estoquista.

#### 6. Padronizacao de Unidades Tecnicas no Estoque de Assistencia

**Arquivo: `src/utils/pecasApi.ts`** (dados mockados)

Substituir referencias a lojas genericas (ex: "Loja SIA", "Loja Taguatinga") por unidades reais do tipo "Assistencia" cadastradas no sistema, utilizando `obterLojasPorTipo('Assistência')` para consistencia.

---

### Detalhes Tecnicos

#### Central de Decisao (EstoqueNotaConferencia.tsx)

```text
Fluxo apos 100% conferencia:
  1. Verificar se todos os aparelhos tem IMEI -> Se nao, bloquear com alerta
  2. Exibir painel com dois caminhos:
     - Verde: enviarDiretoAoFinanceiro() + migrar produtos
     - Amarelo: navigate('/estoque/encaminhar-assistencia?nota={id}')
```

#### Credito de Fornecedor (notaEntradaFluxoApi.ts)

```text
Interface CreditoFornecedor {
  id: string
  fornecedor: string
  valor: number
  origem: string (ID da nota)
  dataGeracao: string
  utilizado: boolean
  dataUtilizacao?: string
  notaUtilizacao?: string
}

Funcoes:
  - gerarCreditoFornecedor(fornecedor, valor, notaOrigem)
  - getCreditosByFornecedor(fornecedor): CreditoFornecedor[]
  - utilizarCredito(creditoId, notaDestino)
```

#### Abatimento Automatico (FinanceiroNotasAssistencia.tsx)

```text
No modal de conferencia:
  - Se nota tem loteRevisaoId:
    - Buscar lote e calcular custoTotalReparos
    - Se tipoPagamento = 'Pos' ou 'Parcial':
      -> valorFinal = valorNota - custoReparos (abatimento)
    - Se tipoPagamento = '100% Antecipado':
      -> Exibir card "Vale-Credito gerado: R$ {custoReparos}"
    - Se custoReparos/valorNota > 0.15:
      -> Card vermelho de alerta critico
```

### Arquivos Afetados

1. `src/pages/EstoqueNotaConferencia.tsx` - Central de Decisao pos-conferencia
2. `src/utils/estoqueApi.ts` - Status "Em Revisao Tecnica"
3. `src/pages/EstoqueEncaminharAssistencia.tsx` - Atualizar status produtos ao encaminhar
4. `src/utils/notaEntradaFluxoApi.ts` - Sistema de Credito de Fornecedor
5. `src/components/estoque/TabelaNotasPendencias.tsx` - Icone de credito
6. `src/pages/FinanceiroNotasAssistencia.tsx` - Matriz de abatimento e vale-credito
7. `src/utils/loteRevisaoApi.ts` - Logistica reversa (retorno/devolucao)
8. `src/pages/EstoqueProdutosPendentes.tsx` - Badge "Retorno de Assistencia"
9. `src/utils/pecasApi.ts` - Padronizacao de unidades tecnicas nos dados mockados

