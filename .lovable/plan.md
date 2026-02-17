

## Filtrar Contas de Destino para Assistencia no Quadro de Pagamento

### Contexto

No modulo de Assistencia (Nova OS, Detalhes OS, Editar OS), o componente `PagamentoQuadro` ja filtra as contas de destino pelo `lojaVendaId` (ID da loja de assistencia). Porem, e necessario garantir que apenas contas vinculadas a assistencia aparecam (Bradesco Assistencia + Dinheiro Assistencia), e nao contas de lojas regulares.

### O que sera feito

Adicionar uma prop `apenasContasAssistencia` ao componente `PagamentoQuadro` para filtrar explicitamente apenas contas de assistencia (Bradesco Assistencia e Dinheiro Assistencia) no dropdown de Conta de Destino.

**Exemplo pratico:**
- OS na Assistencia - Shopping JK: dropdown mostra apenas:
  - "Assistencia - Shopping JK - Bradesco Assistencia" (CTA-012)
  - "Assistencia - Shopping JK - Dinheiro - Assistencia JK Shopping" (CTA-022)

### Detalhes Tecnicos

**Arquivo 1: `src/components/vendas/PagamentoQuadro.tsx`**
- Adicionar prop `apenasContasAssistencia?: boolean` na interface `PagamentoQuadroProps`
- No filtro do Select de "Conta de Destino" (linha ~845), quando `apenasContasAssistencia` for true, filtrar apenas contas cujo nome contenha "Assistencia" ou "Assistência" (abrange tanto "Bradesco Assistencia" quanto "Dinheiro - Assistencia...")
- Isso garante que contas de loja regular (Santander, Bradesco Thiago, etc.) nao aparecam

**Arquivo 2: `src/pages/OSAssistenciaNova.tsx`**
- Passar `apenasContasAssistencia={true}` no componente `PagamentoQuadro` (linha ~1490)

**Arquivo 3: `src/pages/OSAssistenciaDetalhes.tsx`**
- Passar `apenasContasAssistencia={true}` nas duas instancias de `PagamentoQuadro` (linhas ~1113 e ~1167)

**Arquivo 4: `src/pages/OSAssistenciaEditar.tsx`** (se usar PagamentoQuadro)
- Passar `apenasContasAssistencia={true}` tambem

### Logica do filtro

```text
contasFinanceiras
  .filter(c => c.status === 'Ativo')
  .filter(c => !lojaVendaId || c.lojaVinculada === lojaVendaId)
  .filter(c => !apenasContasAssistencia || 
    c.nome.toLowerCase().includes('assistência') || 
    c.nome.toLowerCase().includes('assistencia'))
```

Isso garante que mesmo que futuras contas sejam adicionadas a uma loja de assistencia, apenas as que contenham "Assistencia" no nome serao exibidas no contexto de OS.
