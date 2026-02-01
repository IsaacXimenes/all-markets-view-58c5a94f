
# Plano de Correção: Referências de Lojas e Colaboradores no Sistema

## ✅ STATUS: CONCLUÍDO

Todas as correções foram aplicadas para sincronizar as referências de lojas e colaboradores com o `useCadastroStore` (fonte única de verdade).

---

## Correções Implementadas

### ✅ Parte 1: LojaRH.tsx
- Migrado de `cadastrosApi` para `useCadastroStore`
- Agora usa `obterLojaById`, `obterColaboradoresPorLoja`, `adicionarColaborador`, `atualizarColaborador`, `deletarColaborador`
- Tipo `ColaboradorMockado` substituindo o antigo `Colaborador`

### ✅ Parte 2: adiantamentosApi.ts
- IDs antigos substituídos por UUIDs reais:
  - `LOJA-001` → `db894e7d` (JK Shopping)
  - `COL-001` → `b467c728` (Anna Beatriz)
  - `COL-005` → `143ac0c2` (Antonio Sousa)

### ✅ Parte 3: valesApi.ts
- IDs atualizados para UUIDs reais

### ✅ Parte 4: comissaoPorLojaApi.ts
- `LOJA-001` → `db894e7d`
- `LOJA-002` → `3ac7e00c`

### ✅ Parte 5: fiadoApi.ts
- Todas as referências de loja atualizadas para UUIDs

### ✅ Parte 6: lotesPagamentoApi.ts
- `COL-001` → `b467c728` (Anna Beatriz)

### ✅ Parte 7: conferenciaGestorApi.ts
- Todas as 10 vendas mockadas atualizadas com UUIDs reais de lojas, vendedores, gestores e financeiros

---

## Mapeamento de IDs Utilizados

### Lojas
| UUID | Nome |
|------|------|
| `db894e7d` | Loja - JK Shopping |
| `3ac7e00c` | Loja - Matriz |
| `5b9446d5` | Loja - Shopping Sul |
| `fcc78c1a` | Loja - Online |
| `0d06e7db` | Loja - Águas Lindas Shopping |

### Colaboradores
| UUID | Nome | Cargo |
|------|------|-------|
| `b467c728` | Anna Beatriz Borges | Gestor(a) |
| `143ac0c2` | Antonio Sousa Silva | Vendedor(a) |
| `428d37c2` | Bruno Alves Peres | Gestor(a) |
| `6dcbc817` | Caua Victor Costa dos Santos | Vendedor(a) |
| `9812948d` | Gustavo de Souza dos Santos | Vendedor(a) |
| `b106080f` | Erick Guthemberg | Vendedor(a) |
| `7c1231ea` | Fernanda Gabrielle | Assistente Administrativo (Financeiro) |

---

## Benefícios Alcançados

1. ✅ **Consistência** - Todas as referências usam a mesma fonte de dados
2. ✅ **Manutenibilidade** - Alterações em lojas/colaboradores refletem em todo o sistema
3. ✅ **Eliminação de erros** - "Loja não encontrada" e IDs exibidos em vez de nomes corrigidos
