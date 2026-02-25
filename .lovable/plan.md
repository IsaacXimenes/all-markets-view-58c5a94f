

## Plano: Adicionar Metas Mockadas + Exibir PainelMetasLoja na pagina CadastrosMetas

### Problema Atual

O `PainelMetasLoja` aparece apenas em `VendasConferenciaLancamento.tsx` (linha 559), mas como o `metasApi.ts` inicializa com array vazio `[]`, ele sempre mostra "Meta nao cadastrada". Alem disso, a pagina `CadastrosMetas.tsx` nao tem o painel visual de metas.

### Alteracoes

**1. Adicionar dados mockados em `src/utils/metasApi.ts`**

Inserir metas de exemplo para o mes atual (fevereiro/2026) para as lojas existentes (LOJA-001, LOJA-002, LOJA-ONLINE) como `defaultData` do localStorage. Exemplos:

- LOJA-001 (Centro): Faturamento R$ 150.000, Acessorios 80 un., Garantia R$ 12.000
- LOJA-002 (Norte): Faturamento R$ 120.000, Acessorios 60 un., Garantia R$ 8.000
- LOJA-ONLINE (Digital): Faturamento R$ 200.000, Acessorios 100 un., Garantia R$ 15.000

O counter sera ajustado para iniciar apos os IDs mockados.

**2. Adicionar PainelMetasLoja na pagina `src/pages/CadastrosMetas.tsx`**

Apos a tabela de metas cadastradas, renderizar um `PainelMetasLoja` para cada loja que tenha meta cadastrada no mes/ano selecionado no filtro. Isso dara uma visualizacao grafica direta na pagina de cadastro, permitindo ver as barras de progresso de cada loja.

### Arquivos Afetados

| Arquivo | Alteracao |
|---------|-----------|
| `src/utils/metasApi.ts` | Adicionar array de metas mockadas como defaultData |
| `src/pages/CadastrosMetas.tsx` | Importar e renderizar PainelMetasLoja para lojas com metas no periodo filtrado |

