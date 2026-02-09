

# Plano: Correcao do Checkbox e Remocao do Filtro de Competencia

## 1. Bug do Checkbox nao ficando marcado (`gestaoAdministrativaApi.ts`)

**Causa raiz:** Quando nenhuma loja e selecionada, o `lojaId` passado para `toggleConferencia` e `'todas'`. O dado e salvo no localStorage com a chave `gestao_conferencia_2026-02_todas`. Porem, na funcao `consolidarVendasPorDia` (linha 143), ha uma condicao que **ignora** conferencias salvas quando `lojaId === 'todas'`:

```
const storedConferencias = lojaId && lojaId !== 'todas' 
  ? getStoredConferencias(competencia, lojaId)
  : {};  // <-- nunca le os dados salvos com 'todas'
```

**Correcao:** Remover a condicao que impede a leitura quando `lojaId === 'todas'`. Sempre ler as conferencias e ajustes salvos, independente do filtro de loja. Mesma correcao para `storedAjustes`.

## 2. Validacao: Produto retirado do estoque ao cadastrar venda

A baixa de estoque JA esta implementada corretamente em `vendasApi.ts` (linhas 853-876). Ao chamar `addVenda`, o sistema:
- Marca o produto com `quantidade: 0` e `statusNota: 'Concluido'`
- Registra uma movimentacao de saida com destino `'Vendido'`
- Para acessorios, chama `subtrairEstoqueAcessorio`

Nenhuma alteracao necessaria. O estoque ja e abatido automaticamente.

## 3. Remover filtro de Competencia de todas as abas de Gestao Administrativa

Remover o `<Select>` de competencia e a logica associada dos seguintes arquivos:

### `GestaoAdministrativa.tsx` (Conferencia Diaria)
- Remover o Select de competencia (linhas 290-304)
- Manter os DatePickers de periodo como filtro primario
- A competencia passa a ser derivada automaticamente das datas selecionadas (ex: se Data Inicio = 01/02/2026, competencia = '2026-02')
- Se nenhuma data for selecionada, usar o mes atual como padrao

### `GestaoAdministrativaLogs.tsx` (Logs de Auditoria)
- Remover o Select de competencia (linhas 93-107)
- Substituir o Select de Loja por `AutocompleteLoja`
- Adicionar DatePickers de periodo (Data Inicio / Data Fim) para filtrar logs por `log.dataHora`
- Filtrar localmente pelo intervalo de datas

### `GestaoAdmStoriesLotes.tsx` (Lotes de Stories)
- Remover o Select de competencia (linhas 137-147)
- A competencia sera derivada das datas selecionadas
- Manter os DatePickers ja existentes como filtro principal

### `GestaoAdmStoriesIndicadores.tsx` (Indicadores Stories)
- Remover o Select de competencia (linhas 64-74)
- Adicionar DatePickers de periodo (Data Inicio / Data Fim)
- Substituir Select de Loja por `AutocompleteLoja`
- Derivar competencia das datas selecionadas para a API de indicadores

## Resumo dos Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/utils/gestaoAdministrativaApi.ts` | Corrigir leitura de conferencias quando lojaId='todas' |
| `src/pages/GestaoAdministrativa.tsx` | Remover Select competencia, derivar de datas |
| `src/pages/GestaoAdministrativaLogs.tsx` | Remover Select competencia, adicionar DatePickers e AutocompleteLoja |
| `src/pages/GestaoAdmStoriesLotes.tsx` | Remover Select competencia, derivar de datas |
| `src/pages/GestaoAdmStoriesIndicadores.tsx` | Remover Select competencia, adicionar DatePickers, AutocompleteLoja |

## Detalhes Tecnicos

- A competencia sera derivada com `format(dataInicio, 'yyyy-MM')` usando a data inicio selecionada
- Valor padrao: mes atual (`new Date()`) com `startOfMonth` e `endOfMonth`
- A API `consolidarVendasPorDia` continua recebendo competencia como parametro (derivada), sem alteracoes na assinatura
- Para Logs, o filtro por datas usa `isWithinInterval` no campo `log.dataHora`

