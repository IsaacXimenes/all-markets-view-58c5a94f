

## Filtros de Data no Grafico de Fluxo de Caixa

### Problema
O grafico esta exibindo datas fora de ordem ou de meses diferentes misturados (04/02, 05/02, 06/02, 01/03, 05/03, 08/03, 01/04, 05/04), pois os dados mockados possuem datas espalhadas por varios meses e o filtro por "ultimos X dias" nao resolve.

### Solucao
Substituir os botoes de periodo (1S, 2S, 3S, 1M) por dois campos de data (Data Inicio e Data Fim) no canto superior direito do grafico, permitindo controle preciso do intervalo exibido.

### Detalhes Tecnicos

**Arquivo**: `src/pages/FinanceiroExtrato.tsx`

1. **Substituir estado `periodoGrafico`** por dois estados: `graficoDataInicio` e `graficoDataFim`, inicializados com os ultimos 30 dias.

2. **Remover `diasGrafico`** (useMemo que calculava dias a partir do periodo).

3. **Atualizar `dadosGrafico`** para filtrar movimentacoes usando `isWithinInterval` com as datas do grafico, em vez de `subDays`.

4. **Substituir os botoes 1S/2S/3S/1M** no `CardHeader` por dois inputs `type="date"` compactos com labels "De" e "Ate".

5. **Manter independencia**: os filtros do grafico continuam independentes dos filtros da tabela principal.

