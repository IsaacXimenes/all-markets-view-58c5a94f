

# Plano - Graficos Comparativos no Extrato Geral

## Resumo

Adicionar 2 graficos de comparacao de periodos (Entradas e Saidas) abaixo do grafico principal "Fluxo de Caixa", com filtros independentes de Periodo A e Periodo B, botao de acao rapida "Ano Anterior" e cards de variacao percentual.

## Alteracoes

**Arquivo:** `src/pages/FinanceiroExtrato.tsx`

### 1. Novos estados para os periodos comparativos

- `periodoAInicio` / `periodoAFim` (padrao: ultimos 30 dias)
- `periodoBInicio` / `periodoBFim` (padrao: mesmo intervalo do ano anterior)

### 2. Dados dos graficos comparativos

- `dadosComparacaoEntradas`: useMemo que gera dados de entradas para Periodo A e B, alinhados por "dia do periodo" (Dia 1, Dia 2, etc.)
- `dadosComparacaoSaidas`: useMemo similar para saidas
- Reutilizar a mesma logica de `movimentacoes` ja existente, filtrando por intervalo de data

### 3. Calculo de variacao percentual

- `variacaoEntradas`: ((totalEntradasA - totalEntradasB) / totalEntradasB) * 100
- `variacaoSaidas`: ((totalSaidasA - totalSaidasB) / totalSaidasB) * 100

### 4. UI - Bloco de filtros de comparacao

Abaixo do grafico principal, adicionar um Card com:
- Titulo: "Comparativo de Periodos"
- Linha 1: Periodo A - Data Inicio + Data Fim
- Linha 2: Periodo B - Data Inicio + Data Fim
- Botao "Ano Anterior": preenche Periodo B com o mesmo intervalo de A, menos 1 ano

### 5. UI - Grafico de Entradas

- Card com titulo "Comparativo de Entradas"
- LineChart com 2 linhas:
  - "Periodo A" - verde solido (#10b981), strokeWidth 2
  - "Periodo B" - verde claro (#6ee7b7), strokeDasharray="5 5" (pontilhada)
- Eixo X: "Dia 1", "Dia 2", etc.
- Eixo Y: valores monetarios formatados em R$
- Tooltip com formatCurrency

### 6. UI - Grafico de Saidas

- Card com titulo "Comparativo de Saidas"
- LineChart com 2 linhas:
  - "Periodo A" - vermelho solido (#ef4444), strokeWidth 2
  - "Periodo B" - vermelho claro (#fca5a5), strokeDasharray="5 5"
- Mesma estrutura do grafico de entradas

### 7. UI - Cards de variacao percentual

Dois cards lado a lado abaixo dos graficos:
- Card Entradas: exibe variacao % com icone TrendingUp/Down, verde se positivo, vermelho se negativo
- Card Saidas: exibe variacao % com icone TrendingUp/Down, verde se negativo (menos gastos), vermelho se positivo (mais gastos)

### 8. Imports adicionais

- Adicionar `subYears` do date-fns para o botao "Ano Anterior"

## Detalhes Tecnicos

Estrutura dos dados comparativos:

```text
dadosComparacaoEntradas = [
  { dia: "Dia 1", periodoA: 5000, periodoB: 4200 },
  { dia: "Dia 2", periodoA: 3000, periodoB: 3500 },
  ...
]
```

A quantidade de dias sera determinada pelo maior intervalo entre Periodo A e B. Dias sem movimentacao retornam 0.

O botao "Ano Anterior" calcula:
```text
periodoBInicio = subYears(parseISO(periodoAInicio), 1)
periodoBFim = subYears(parseISO(periodoAFim), 1)
```

Todos os valores monetarios seguem a mascara R$ XXX.XXX,XX conforme padrao do sistema.

