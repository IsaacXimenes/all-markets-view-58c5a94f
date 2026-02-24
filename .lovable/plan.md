
# Inteligencia de Custos e Abatimento na Nota de Entrada

## Status: ✅ Implementado

## Resumo

Ciclo completo de retorno financeiro da Assistência para a Nota de Entrada implementado, com abatimento automático no valor pendente ou geração de crédito ao fornecedor para os três fluxos de pagamento (Pós, Parcial e 100% Antecipado).

## O que foi implementado

### 1. `atualizarAbatimentoNota()` em `notaEntradaFluxoApi.ts`
- Recalcula `valorPendente` considerando abatimento conforme tipo de pagamento
- `registrarPagamento` agora considera `valorAbatimento` no cálculo

### 2. `sincronizarNotaComLote()` em `loteRevisaoApi.ts`
- Recalcula custo total dos itens concluídos
- Atualiza `nota.valorAbatimento` e `nota.valorPendente`
- Registra na timeline da nota
- Para notas 100% Antecipadas, gera crédito ao fornecedor
- Chamada automaticamente em `finalizarLoteRevisao` e `finalizarLoteComLogisticaReversa`

### 3. Sincronização individual em `OSAssistenciaDetalhes.tsx`
- Ao concluir serviço com lote vinculado, chama `sincronizarNotaComLote` para atualizar abatimento parcial

### 4. Seção "Assistência Técnica" em `NotaDetalhesContent.tsx`
- Resumo financeiro (LoteRevisaoResumo) com alerta >15%
- Tabela de itens encaminhados (marca, modelo, IMEI, motivo, status, custo)
- Card de créditos gerados (apenas para notas 100% Antecipadas)
- Indicador de abatimento no campo "Valor Pendente"

## Lógica de Abatimento

```text
Pós-Pagamento: Valor a Pagar = Valor Nota - Custo Reparos
Parcial: Saldo Devedor = Valor Nota - Valor Já Pago - Custo Reparos
100% Antecipado: Crédito Fornecedor = Custo Reparos
```
