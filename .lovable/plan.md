
# Plano Completo: Correção de Todas as Pendências de IDs no Sistema

## Status: ✅ CONCLUÍDO

Todas as pendências de IDs antigos foram corrigidas com sucesso.

---

## Correções Realizadas

### 1. ✅ osApi.ts - Produtos Pendentes (Nova Venda)
Atualizado dados mockados de `ProdutoPendente` para usar UUIDs reais:
- `Loja Centro` → `db894e7d` (Loja - JK Shopping)
- `Loja Shopping` → `3ac7e00c` (Loja - Matriz)
- `Loja Norte` → `5b9446d5` (Loja - Shopping Sul)
- `Loja Sul` → `0d06e7db` (Loja - Águas Lindas Shopping)
- `Loja Oeste` → `fcc78c1a` (Loja - Online)

### 2. ✅ calculoComissaoVenda.ts - Constante LOJA_ONLINE_ID
- Corrigido de `'LOJA-ONLINE'` para `'fcc78c1a'` (UUID real)
- Removida dependência de `cadastrosApi.ts`
- Agora recebe `getLojaById` como parâmetro opcional

### 3. ✅ feedbackApi.ts - IDs de Colaboradores
Atualizados todos os IDs de colaboradores e gestores:
- `COL-001` → `b467c728` (Anna Beatriz Borges)
- `COL-002` → `7c1231ea` (Fernanda Gabrielle Silva de Lima)
- `COL-003` → `6dcbc817` (Caua Victor Costa dos Santos)
- `COL-004` → `143ac0c2` (Antonio Sousa Silva Filho)
- `COL-005` → `428d37c2` (Bruno Alves Peres)
- Atualizado `getUsuarioLogado()` para usar UUID real

### 4. ✅ motoboyApi.ts - IDs de Motoboys
Atualizados todos os IDs de motoboys:
- `COL-018` → `a962efd4` (João Vitor Rezende Andrade de Souza)
- `COL-019` → `3b3afac0` (Samuel Silva dos Santos Nonato)

### 5. ✅ garantiasApi.ts - IDs nas Tratativas e Timeline
Atualizados todos os `usuarioId` e `usuarioNome`:
- Tratativas: 8 registros corrigidos
- Timeline: 8 registros corrigidos
- Garantias: Já estavam corretos (corrigidos anteriormente)

---

## Mapeamento Final de IDs

### Lojas (UUIDs do JSON)
| UUID | Nome | Tipo |
|------|------|------|
| `db894e7d` | Loja - JK Shopping | Loja |
| `3ac7e00c` | Loja - Matriz | Loja |
| `fcc78c1a` | Loja - Online | Loja |
| `5b9446d5` | Loja - Shopping Sul | Loja |
| `0d06e7db` | Loja - Águas Lindas Shopping | Loja |

### Colaboradores Utilizados
| UUID | Nome | Cargo |
|------|------|-------|
| `b467c728` | Anna Beatriz Borges | Gestor(a) |
| `7c1231ea` | Fernanda Gabrielle Silva de Lima | Assistente Administrativo |
| `6dcbc817` | Caua Victor Costa dos Santos | Vendedor(a) |
| `143ac0c2` | Antonio Sousa Silva Filho | Vendedor(a) |
| `428d37c2` | Bruno Alves Peres | Gestor(a) |
| `4bfe3508` | Elida Franca de Souza | Vendedor(a) |
| `b106080f` | Erick Guthemberg Ferreira da Silva | Vendedor(a) |
| `1b9137c8` | Evelyn Cordeiro de Oliveira | Vendedor(a) |
| `a962efd4` | João Vitor Rezende Andrade de Souza | Motoboy |
| `3b3afac0` | Samuel Silva dos Santos Nonato | Motoboy |

---

## Benefícios Alcançados

1. **Consistência Total** - Todas as referências usam UUIDs reais do `useCadastroStore`
2. **Eliminação de Erros** - Nomes exibidos corretamente em todas as tabelas
3. **Cálculo de Comissão** - Loja Online identificada corretamente para aplicar 6%
4. **Manutenibilidade** - Sistema pronto para integração futura com backend real
