

## Correções: Layout do Modal de Conferência e Status de Desvinculação

### 1. Layout do Modal - Cards Empilhados

**Arquivo: `src/pages/FinanceiroNotasAssistencia.tsx`**

No modal de conferência (Dialog), os campos "ID da Nota / Data" e "Lote / Fornecedor" usam `grid grid-cols-2 gap-4` (lado a lado). A correção troca para layout vertical (`space-y-4`), colocando cada campo um abaixo do outro.

Linhas afetadas: ~430 e ~441 -- trocar `grid grid-cols-2 gap-4` por `space-y-4` ou `grid grid-cols-1 gap-4`.

### 2. Status de Desvinculação: "Recusada pelo Financeiro"

**Arquivo: `src/utils/solicitacaoPecasApi.ts`**

Na interface `SolicitacaoPeca`, adicionar o status `'Recusada pelo Financeiro'` ao union type de `status`.

Na função `desvincularNotaDeLote` (linha 759), trocar:
```
solicitacoes[solIdx] = { ...sol, status: 'Aprovada' };
```
por:
```
solicitacoes[solIdx] = { ...sol, status: 'Recusada pelo Financeiro' };
```

**Arquivo: `src/pages/OSSolicitacoesPecas.tsx`**

Na função `getStatusBadge`, adicionar um novo case para exibir o badge:
```
case 'Recusada pelo Financeiro':
  return <Badge className="bg-red-600 hover:bg-red-700">Recusada pelo Financeiro</Badge>;
```

**Arquivo: `src/pages/FinanceiroNotasAssistencia.tsx`**

Atualizar o texto do dialog de desvinculação (linha 767) para refletir o novo status: "...retornará para a assistência com status 'Recusada pelo Financeiro'."

### Arquivos Afetados

- `src/utils/solicitacaoPecasApi.ts` (interface + função desvincularNotaDeLote)
- `src/pages/FinanceiroNotasAssistencia.tsx` (layout modal + texto dialog)
- `src/pages/OSSolicitacoesPecas.tsx` (badge do novo status)

