

## Ajuste: Adicionar coluna "Data" como primeira coluna

### Mudanca

No plano aprovado para reestruturar a Conferencia Diaria (visualizacao por dia, cada linha = um metodo de pagamento), adicionar a coluna **Data** como primeira coluna da tabela.

### Nova sequencia de colunas

| # | Coluna | Descricao |
|---|--------|-----------|
| 1 | **Data** | Data do dia (ex: 10/02 seg) |
| 2 | Metodo de Pagamento | Nome do metodo (Pix, Cartao Debito, etc.) |
| 3 | Status | Badge: Conferido / Pendente |
| 4 | Valor | Valor bruto formatado em R$ XXX.XXX,XX |
| 5 | Conferido | Checkbox com dupla confirmacao (modal) |
| 6 | Acoes | Botao detalhes (drill-down) + Botao agenda |

### Detalhes tecnicos

**Arquivo:** `src/pages/GestaoAdministrativa.tsx`

- A coluna "Data" exibira a data formatada (dd/MM + dia da semana abreviado) na primeira linha de metodos daquele dia, usando `rowSpan` igual ao numero de metodos de pagamento para evitar repeticao visual em cada linha.
- Alternativamente, cada linha pode repetir a data para simplificar a implementacao -- a data sera exibida em todas as linhas do mesmo dia.
- O restante do plano aprovado permanece inalterado (quadros por loja, agenda por linha, checkbox com dupla confirmacao, drill-down).

