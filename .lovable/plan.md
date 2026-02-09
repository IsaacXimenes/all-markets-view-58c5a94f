

# Plano: Coluna "Status do Aparelho" no Estoque

## Objetivo

Adicionar uma nova coluna "Status" na tabela de Aparelhos do Estoque que exibe o estado atual do dispositivo: Disponivel, Vendido, Em Movimentacao, Emprestado, Retirada de Pecas. Atualmente, quando um aparelho e vendido, a coluna "Loja" esta sendo sobrescrita para "Vendido", o que e incorreto -- a loja original deve ser preservada.

## Como funciona hoje (problema)

- Ao vender, `quantidade` vai para 0 e `statusNota` muda para "Concluido", mas nao ha campo dedicado para o status do aparelho
- Badges individuais de "Em movimentacao", "Emprestimo", "Retirada de Pecas" ja existem no campo Produto, mas ficam misturados com o nome do modelo
- Nao ha indicacao visual clara de "Vendido" ou "Disponivel"

## Alteracoes

### 1. Novo campo `statusAparelho` na interface Produto (`src/utils/estoqueApi.ts`)

Adicionar campo opcional na interface:

```text
statusAparelho?: 'Disponível' | 'Vendido' | 'Em movimentação' | 'Empréstimo - Assistência' | 'Retirada de Peças' | 'Bloqueado';
```

Este campo sera derivado/calculado, nao armazenado diretamente. Uma funcao helper determinara o status baseado nos campos existentes:

- `quantidade === 0` e `statusNota === 'Concluído'` -> "Vendido"
- `statusMovimentacao === 'Em movimentação'` -> "Em movimentacao"
- `statusEmprestimo === 'Empréstimo - Assistência'` -> "Emprestimo - Assistencia"
- `statusRetiradaPecas` presente e diferente de null/Cancelada -> "Retirada de Pecas"
- `bloqueadoEmVendaId` presente -> "Bloqueado"
- Caso contrario -> "Disponivel"

### 2. Funcao helper `getStatusAparelho` (`src/utils/estoqueApi.ts`)

```text
export const getStatusAparelho = (produto: Produto): string => {
  if (produto.quantidade === 0 && produto.statusNota === 'Concluído') return 'Vendido';
  if (produto.statusMovimentacao === 'Em movimentação') return 'Em movimentação';
  if (produto.statusEmprestimo === 'Empréstimo - Assistência') return 'Empréstimo';
  if (produto.statusRetiradaPecas && produto.statusRetiradaPecas !== 'Cancelada') return 'Retirada de Peças';
  if (produto.bloqueadoEmVendaId) return 'Bloqueado';
  return 'Disponível';
};
```

### 3. Coluna "Status" na tabela (`src/pages/EstoqueProdutos.tsx`)

- Adicionar coluna "Status" apos "Produto" e antes de "Loja"
- Exibir badge colorido conforme o status:
  - Verde: Disponivel
  - Vermelho: Vendido
  - Amarelo: Em movimentacao
  - Roxo: Emprestimo
  - Laranja: Retirada de Pecas
  - Cinza: Bloqueado
- Remover os badges de status que atualmente ficam dentro da celula "Produto" (Em movimentacao, Emprestimo, Retirada de Pecas) pois agora terao coluna propria
- A coluna "Loja" continua exibindo o nome real da loja (nunca "Vendido")

### 4. Filtro por Status (`src/pages/EstoqueProdutos.tsx`)

- Adicionar filtro Select de "Status" nos filtros existentes com opcoes: Todos, Disponivel, Vendido, Em movimentacao, Emprestimo, Retirada de Pecas, Bloqueado

## Resumo dos Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/utils/estoqueApi.ts` | Funcao `getStatusAparelho` |
| `src/pages/EstoqueProdutos.tsx` | Nova coluna Status, filtro, remover badges duplicados do campo Produto |
| `src/utils/statusColors.ts` | Adicionar mapeamentos para os novos status (Emprestimo, Bloqueado) se necessario |
