
# Correcao dos Filtros de Data na Gestao Administrativa

## Problema

Os filtros "Data Inicio" e "Data Fim" sao inicializados com `new Date()`, que inclui o horario atual (ex: `2026-02-23T14:30:00`). Porem, as datas das conferencias sao comparadas via `parseISO(conf.data)` que retorna meia-noite (`2026-02-23T00:00:00`).

Resultado: `00:00:00 < 14:30:00` faz com que os registros de hoje sejam filtrados. Ao selecionar manualmente a mesma data no calendario, o componente Calendar retorna a data com horario zerado, e os registros aparecem.

## Solucao

Normalizar as datas iniciais para inicio e fim do dia, e tambem normalizar as comparacoes no filtro.

## Detalhes Tecnicos

### Arquivo: `src/pages/GestaoAdministrativa.tsx`

1. **Importar `startOfDay` e `endOfDay`** de `date-fns` (linha 25)

2. **Inicializar estados com horario normalizado** (linhas 58-59):
   - `dataInicio`: usar `startOfDay(new Date())` em vez de `new Date()`
   - `dataFim`: usar `endOfDay(new Date())` em vez de `new Date()`

3. **Normalizar comparacoes no filtro** (linhas 103-111):
   - Ao comparar `dataInicio`, usar `startOfDay(dataInicio)` 
   - Ao comparar `dataFim`, usar `endOfDay(dataFim)`
   - Isso garante que mesmo que o usuario selecione uma data pelo calendario (que pode vir com horario variado), a filtragem funcione corretamente

4. **Normalizar `handleDataInicioChange`** (linha 137):
   - Aplicar `startOfDay` ao definir a data inicio
