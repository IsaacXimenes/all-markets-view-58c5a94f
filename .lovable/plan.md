

## Plano: Integracao Vendas-RH para Remuneracao de Motoboys

### Objetivo
Quando uma venda com `tipoRetirada === 'Entrega'` e `motoboyId` preenchido for finalizada, registrar automaticamente uma demanda no modulo de motoboys. Alem disso, atualizar o sistema de competencias para formato bi-mensal e melhorar a rastreabilidade com `vendaId`.

---

### 1. Atualizar `src/utils/motoboyApi.ts`

**1.1 Adicionar `vendaId` a `DemandaMotoboy`:**
- Novo campo opcional: `vendaId?: string`
- Adicionar nos mocks existentes valores correspondentes (ex: `vendaId: 'VEN-2026-0003'` para entregas que correspondem a vendas)

**1.2 Criar funcao `addDemandaMotoboy`:**
```
export const addDemandaMotoboy = (demanda: Omit<DemandaMotoboy, 'id'>): DemandaMotoboy
```
- Gerar ID unico: `DEM-${Date.now()}`
- Inserir no array `demandas`
- Retornar a demanda criada

**1.3 Competencias bi-mensais em `gerarCompetencias`:**
- Formato novo: `MMM-AAAA - 1` (01-15) e `MMM-AAAA - 2` (16-fim do mes)
- Exemplo: `FEV-2026 - 1`, `FEV-2026 - 2`

**1.4 Atualizar mocks de remuneracoes:**
- Competencias existentes `JAN-2026` passam a ser `JAN-2026 - 1` e `JAN-2026 - 2`

**1.5 Atualizar `DetalheEntregaRemuneracao`:**
- Usar `vendaId` real da demanda em vez do mock `d.id.replace('DEM', 'VND')`
- Buscar dados da venda via `getVendaById` quando disponivel

**1.6 Atualizar `getDetalheEntregasRemuneracao`:**
- Importar `getVendas` de `vendasApi.ts`
- Preencher vendedor, produto e valorVenda com dados reais da venda quando `vendaId` existir

---

### 2. Atualizar `src/utils/vendasApi.ts` - Funcao `addVenda`

**Apos o bloco de integracao de pagamentos (linha ~926), adicionar:**
- Verificar se `venda.tipoRetirada === 'Entrega'` e `venda.motoboyId` esta preenchido
- Importar `addDemandaMotoboy` de `motoboyApi.ts`
- Chamar `addDemandaMotoboy` com:
  - `motoboyId`: da venda
  - `motoboyNome`: buscar do cadastro ou usar campo da venda
  - `data`: extrair apenas a data de `venda.dataHora`
  - `tipo`: `'Entrega'`
  - `descricao`: `Entrega Venda #${newId} - Cliente ${venda.clienteNome}`
  - `lojaOrigem`: `venda.lojaVenda`
  - `lojaDestino`: `venda.clienteCidade || 'Endereco Cliente'`
  - `status`: `'Concluida'`
  - `valorDemanda`: `venda.taxaEntrega`
  - `vendaId`: `newId`
- Log no console: `[VENDAS] Demanda de entrega registrada para motoboy`

---

### 3. Atualizar `src/pages/RHMotoboyRemuneracao.tsx`

**3.1 Filtro de competencias:**
- O dropdown ja consome `gerarCompetencias()`, entao ao mudar o formato da API, a tela reflete automaticamente

**3.2 Drill-down com `vendaId`:**
- Na tabela de detalhes, a coluna "ID da Venda" ja existe e exibira o `vendaId` real vindo da demanda

**3.3 Filtro de competencias com novo formato:**
- Garantir que o filtro `filters.competencia` faz match correto com os novos valores bi-mensais

---

### Resumo de Arquivos

| Arquivo | Alteracoes |
|---------|-----------|
| `src/utils/motoboyApi.ts` | `vendaId` na interface, `addDemandaMotoboy`, competencias bi-mensais, drill-down real |
| `src/utils/vendasApi.ts` | Chamada automatica a `addDemandaMotoboy` no `addVenda` |
| `src/pages/RHMotoboyRemuneracao.tsx` | Ajustes menores para exibir competencias bi-mensais corretamente |

