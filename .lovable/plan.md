

## Rastreabilidade de Fornecedores na Aba de Acessorios

### Resumo

Adicionar o campo `fornecedorId` na interface `Acessorio`, exibir a coluna "Fornecedor" na tabela, e criar um filtro de busca por fornecedor -- tudo sem alterar as colunas existentes.

---

### 1. Modelo de Dados - `src/utils/acessoriosApi.ts`

- Adicionar campo opcional `fornecedorId?: string` na interface `Acessorio`
- Atualizar os mocks existentes para incluir `fornecedorId` apontando para IDs de fornecedores do `cadastrosApi` (ex: `'FORN-001'`, `'FORN-002'`, etc.)
- Atualizar `addAcessorio` e `getOrCreateAcessorio` para aceitar e propagar `fornecedorId`
- Incluir "Fornecedor" no CSV de exportacao

### 2. Tabela e Filtro - `src/pages/EstoqueAcessorios.tsx`

**Coluna "Fornecedor":**
- Inserir coluna "Fornecedor" entre "Categoria" e "ID" no cabecalho
- No agrupamento (`acessoriosAgrupados`), incluir `fornecedorId` no objeto agrupado
- Na renderizacao, buscar o nome do fornecedor via `getFornecedores()` pelo ID
- Atualizar `colSpan` da mensagem vazia de 9 para 10

**Filtro por Fornecedor:**
- Adicionar estado `filtroFornecedor`
- Adicionar componente `AutocompleteFornecedor` na area de filtros (apos Loja)
- No `useMemo` de `acessoriosFiltrados`, filtrar por `fornecedorId` quando selecionado
- Atualizar "Limpar filtros" para resetar `filtroFornecedor`
- Atualizar `ResponsiveFilterGrid` de `cols={4}` para `cols={5}`

### 3. Colunas Existentes

Todas as colunas atuais (Descricao, Loja, Categoria, ID, Estoque Disponivel, Valor Custo, Valor Recomendado, Lucro Unit., Acoes) permanecem intactas e na mesma posicao relativa. A nova coluna e inserida entre Categoria e ID.

---

### Detalhes Tecnicos

| Arquivo | Alteracao |
|---------|-----------|
| `src/utils/acessoriosApi.ts` | Campo `fornecedorId` na interface + mocks + funcoes de criacao + CSV |
| `src/pages/EstoqueAcessorios.tsx` | Coluna Fornecedor na tabela + filtro AutocompleteFornecedor + agrupamento |

Nenhum arquivo novo sera criado. Usa o componente `AutocompleteFornecedor` ja existente e a funcao `getFornecedores` do `cadastrosApi`.
