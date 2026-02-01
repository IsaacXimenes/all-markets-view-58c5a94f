
# Plano de Correção: Referências de Lojas e Colaboradores no Sistema

## Diagnóstico do Problema

O sistema possui **duas fontes de dados conflitantes**:

1. **useCadastroStore (Zustand)** - Fonte única de verdade com UUIDs reais:
   - Lojas: `3ac7e00c`, `db894e7d`, `3cfbf69f`, etc.
   - Colaboradores: `b467c728`, `143ac0c2`, etc.

2. **cadastrosApi.ts + APIs mockadas** - Dados antigos com IDs sequenciais:
   - Lojas: `LOJA-001`, `LOJA-002`, etc.
   - Colaboradores: `COL-001`, `COL-005`, etc.

### Erros Identificados

| Local | Problema |
|-------|----------|
| RH > Lojas da Rede > Ver Quadro Completo | `LojaRH.tsx` usa `getLojaById()` do `cadastrosApi.ts` que não encontra UUIDs |
| RH > Adiantamentos | Dados mockados usam `LOJA-001`, `COL-005` que não existem no `useCadastroStore` |
| 14+ arquivos de APIs | Dados mockados com IDs antigos (`LOJA-00X`, `COL-00X`) |

---

## Solução: Migração Completa para useCadastroStore

### Parte 1: Corrigir LojaRH.tsx

**Arquivo:** `src/pages/LojaRH.tsx`

**Problema:** Usa `getLojaById`, `getColaboradoresByLoja`, `addColaborador`, `updateColaborador`, `deleteColaborador` do `cadastrosApi.ts`.

**Solução:** Migrar para `useCadastroStore`:

```typescript
// ANTES:
import { getLojaById, getColaboradoresByLoja, ... } from '@/utils/cadastrosApi';
const loja = getLojaById(id || '');

// DEPOIS:
import { useCadastroStore } from '@/store/cadastroStore';
const { obterLojaById, obterColaboradoresPorLoja, ... } = useCadastroStore();
const loja = obterLojaById(id || '');
```

---

### Parte 2: Corrigir adiantamentosApi.ts

**Arquivo:** `src/utils/adiantamentosApi.ts`

**Problema:** Dados mockados usam `lojaId: 'LOJA-001'`, `colaboradorId: 'COL-005'`.

**Solução:** Substituir por UUIDs reais do `dados_mockados_sistema.json`:

| ID Antigo | UUID Real | Nome |
|-----------|-----------|------|
| LOJA-001 | `db894e7d` | Loja - JK Shopping |
| LOJA-002 | `3ac7e00c` | Loja - Matriz |
| LOJA-003 | `5b9446d5` | Loja - Shopping Sul |
| COL-001 | `b467c728` | Anna Beatriz (Gestor) |
| COL-005 | `143ac0c2` | Antonio Sousa (Vendedor) |

---

### Parte 3: Corrigir valesApi.ts

**Arquivo:** `src/utils/valesApi.ts`

**Problema:** Mesmo problema - IDs antigos nos dados mockados.

**Solução:** Atualizar para UUIDs reais.

---

### Parte 4: Atualizar Demais APIs com IDs Antigos

Os seguintes arquivos também precisam de correção dos dados mockados:

| Arquivo | Campos Afetados |
|---------|-----------------|
| `conferenciaGestorApi.ts` | lojaId, vendedorId, gestorConferencia, financeiroResponsavel |
| `fiadoApi.ts` | lojaId |
| `comissaoPorLojaApi.ts` | lojaId |
| `lotesPagamentoApi.ts` | responsavelId |
| `osApi.ts` | lojaId, tecnicoId |
| `garantiasApi.ts` | lojaId, vendedorId |
| `vendasApi.ts` | lojaId, vendedorId |
| `financeApi.ts` | lojaId |
| `motoboyApi.ts` | colaboradorId |
| `salarioColaboradorApi.ts` | colaboradorId, lojaId |
| `comissoesApi.ts` | colaboradorId, lojaId |

---

## Mapeamento de IDs (Referência)

### Lojas (dados_mockados_sistema.json)

| UUID | Nome | Tipo |
|------|------|------|
| `3ac7e00c` | Loja - Matriz | Loja |
| `db894e7d` | Loja - JK Shopping | Loja |
| `fcc78c1a` | Loja - Online | Loja |
| `5b9446d5` | Loja - Shopping Sul | Loja |
| `0d06e7db` | Loja - Águas Lindas Shopping | Loja |
| `3cfbf69f` | Assistência - SIA | Assistência |
| `94dbe2b1` | Assistência - Shopping JK | Assistência |
| `ba1802b9` | Assistência - Shopping Sul | Assistência |
| `be961085` | Assistência - Águas Lindas | Assistência |
| `dcc6547f` | Estoque - SIA | Estoque |
| `4adb691a` | Estoque - Shopping JK | Estoque |
| `92bb2771` | Estoque - Shopping Sul | Estoque |
| `511db41c` | Estoque - Águas Lindas Shopping | Estoque |
| `ddc3594f` | Financeiro | Financeiro |
| `9880b788` | Acesso Geral | Administrativo |
| `b63a9380` | Marketing | Administrativo |
| `c520475b` | Motoboy | Administrativo |

### Colaboradores (primeiros do JSON)

| UUID | Nome | Cargo | Loja |
|------|------|-------|------|
| `b467c728` | Anna Beatriz Borges | Gestor(a) | Assistência - SIA |
| `143ac0c2` | Antonio Sousa Silva | Vendedor(a) | Loja - Online |
| (buscar mais no JSON conforme necessário) |

---

## Arquivos a Modificar

### Prioridade Alta (Erros Visíveis)

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/LojaRH.tsx` | Migrar de `cadastrosApi` para `useCadastroStore` |
| `src/utils/adiantamentosApi.ts` | Atualizar IDs mockados para UUIDs |
| `src/utils/valesApi.ts` | Atualizar IDs mockados para UUIDs |

### Prioridade Média (Dados Mockados)

| Arquivo | Alteração |
|---------|-----------|
| `src/utils/conferenciaGestorApi.ts` | Atualizar IDs mockados |
| `src/utils/fiadoApi.ts` | Atualizar IDs mockados |
| `src/utils/comissaoPorLojaApi.ts` | Atualizar IDs mockados |
| `src/utils/lotesPagamentoApi.ts` | Atualizar IDs mockados |

### Prioridade Baixa (Verificar Uso)

- Verificar e atualizar demais APIs conforme necessário

---

## Ordem de Implementação

1. **LojaRH.tsx** - Corrigir erro "Loja não encontrada"
2. **adiantamentosApi.ts** - Corrigir colunas de Loja e Colaborador em RH > Adiantamentos
3. **valesApi.ts** - Corrigir RH > Vales (mesmo padrão)
4. **conferenciaGestorApi.ts** - Corrigir conferência de gestor
5. **fiadoApi.ts** - Corrigir módulo financeiro
6. **comissaoPorLojaApi.ts** - Corrigir comissões
7. **lotesPagamentoApi.ts** - Corrigir lotes de pagamento

---

## Benefícios da Correção

1. **Consistência** - Todas as referências usam a mesma fonte de dados
2. **Manutenibilidade** - Alterações em lojas/colaboradores refletem em todo o sistema
3. **Eliminação de erros** - "Loja não encontrada" e IDs exibidos em vez de nomes serão corrigidos
