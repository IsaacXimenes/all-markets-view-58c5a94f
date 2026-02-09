

# Plano: Comprovantes nas Conferencias, Coluna Loja e Stories

## 1. Comprovante visivel nas telas de Conferencia e Detalhes da Venda

Os comprovantes ja sao salvos corretamente no objeto `Pagamento` (campos `comprovante` e `comprovanteNome`). O problema e que algumas telas nao exibem essa informacao.

### Conferencia - Lancamento (`VendasConferenciaLancamento.tsx`)
- A tabela principal nao tem coluna de comprovante (o modal de aprovacao ja exibe)
- A conferencia de lancamento e uma listagem de vendas, nao de pagamentos individuais - portanto o comprovante ja esta visivel ao clicar em "Conferir" (modal de aprovacao, linhas 728-749)
- **Nenhuma alteracao necessaria** nesta tela, pois o fluxo correto e: clicar em Conferir > ver comprovantes no modal

### Conferencia - Gestor (`VendasConferenciaGestorDetalhes.tsx`)
- Ja exibe comprovantes na tabela de pagamentos (linhas 159-173)
- **Nenhuma alteracao necessaria**

### Conferencia - Financeiro (`FinanceiroConferencia.tsx`)
- Ja exibe badge "Contem Anexo" na tabela e comprovante no detalhamento lateral
- **Nenhuma alteracao necessaria**

### Detalhes da Venda (`VendaDetalhes.tsx`)
- **NAO exibe comprovantes** na tabela de pagamentos (linhas 360-378)
- Adicionar coluna "Comprovante" na tabela de pagamentos usando o componente `ComprovantePreview`
- Importar `ComprovantePreview` e `ComprovanteBadgeSemAnexo`

## 2. Coluna de Loja na Conferencia Diaria (`GestaoAdministrativa.tsx`)

A tabela de Conferencia Diaria atualmente nao exibe a loja, pois os dados sao consolidados por dia sem informacao de loja individual.

**Problema na API**: A funcao `consolidarVendasPorDia` agrupa vendas por data, mas nao por loja. Quando o filtro e "todas", todas as lojas sao misturadas em um unico registro por dia.

**Solucao**: Alterar a consolidacao para agrupar por **dia + loja**, gerando linhas separadas para cada loja em cada dia. Adicionar coluna "Loja" na tabela.

### Alteracoes em `gestaoAdministrativaApi.ts`:
- Modificar `consolidarVendasPorDia` para agrupar por `data + lojaId` quando `lojaId === 'todas'`
- Adicionar campo `lojaNome` na interface `ConferenciaDiaria`
- Cada linha da tabela representara um dia de uma loja especifica

### Alteracoes em `GestaoAdministrativa.tsx`:
- Adicionar coluna "Loja" na tabela entre "Data" e "Status"
- Exibir o nome da loja em cada linha

## 3. Vendas novas nao aparecem nos Lotes de Stories

**Causa raiz**: A funcao `gerarLotesDiarios` (linha 110 de `storiesMonitoramentoApi.ts`) faz `if (existentes.length > 0) return existentes` - uma vez gerados os lotes para uma competencia, **nunca mais sao atualizados** com novas vendas.

**Solucao**: Ao inves de retornar cedo, comparar as vendas atuais com as existentes e adicionar novas vendas aos lotes ja existentes.

### Alteracoes em `storiesMonitoramentoApi.ts`:
- Modificar `gerarLotesDiarios` para:
  1. Carregar lotes existentes do localStorage
  2. Para cada dia/loja, verificar se ha vendas novas (comparando IDs de vendas)
  3. Adicionar vendas novas aos lotes existentes
  4. Criar novos lotes para combinacoes dia/loja que ainda nao existem
  5. Atualizar contadores (totalVendas, percentualStories)
  6. Salvar lotes atualizados

## Resumo dos Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/VendaDetalhes.tsx` | Adicionar coluna Comprovante na tabela de pagamentos |
| `src/utils/gestaoAdministrativaApi.ts` | Agrupar consolidacao por dia+loja, adicionar lojaNome |
| `src/pages/GestaoAdministrativa.tsx` | Adicionar coluna Loja na tabela de conferencia |
| `src/utils/storiesMonitoramentoApi.ts` | Atualizar lotes existentes com novas vendas |

## Detalhes Tecnicos

### VendaDetalhes - Comprovante
```text
// Adicionar na tabela de pagamentos:
<TableHead>Comprovante</TableHead>
// E na celula:
<TableCell>
  {pag.comprovante 
    ? <ComprovantePreview comprovante={pag.comprovante} comprovanteNome={pag.comprovanteNome} />
    : <ComprovanteBadgeSemAnexo />
  }
</TableCell>
```

### Conferencia Diaria - Agrupamento por Loja
A chave de persistencia do localStorage passara a incluir o lojaId real de cada linha (nao mais 'todas'), garantindo que checkboxes funcionem corretamente por loja.

### Stories - Sincronizacao de Vendas
```text
// Logica atualizada:
1. Carregar lotes existentes
2. Para cada dia/loja com vendas atuais:
   - Se lote existe: comparar vendaIds, adicionar novos
   - Se lote nao existe: criar novo lote
3. Atualizar totalVendas de cada lote
4. Salvar no localStorage
```

