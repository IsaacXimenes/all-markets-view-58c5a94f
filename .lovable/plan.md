

# Plano: Ajustes no Fluxo de Notas de Entrada

## 1. Botao para Recolher Explosao (Conferencia)

### Arquivo: `src/pages/EstoqueNotaConferencia.tsx`

Adicionar uma funcao `recolherItens` que faz o inverso da explosao: identifica itens individuais que compartilham o mesmo prefixo de ID (ex: `PROD-NE-2026-00001-001-U001`, `-U002`, etc.) e os reagrupa em uma unica linha com a quantidade total original.

- Adicionar botao com icone (ex: `Undo2` ou `Shrink`) ao lado dos itens explodidos
- O botao so aparece para itens que foram explodidos (IDs com sufixo `-UXXX`)
- Ao recolher, itens ja conferidos individualmente nao podem ser recolhidos (validacao)

### Arquivo: `src/utils/notaEntradaFluxoApi.ts`

Adicionar funcao `recolherProdutoNota(notaId, prefixoProdutoId, usuario)`:
- Encontra todos os produtos com IDs que iniciam com o prefixo original
- Valida que nenhum deles esteja com status "Conferido"
- Remove as linhas individuais e recria a linha consolidada (quantidade = soma)
- Registra na timeline

---

## 2. Correcao do Bug de Pagamento Parcial

### Problema identificado

No modal de pagamento (`ModalFinalizarPagamento.tsx`), o campo de valor editavel so aparece quando `isParcial` (tipo = "Pagamento Parcial"). Para os outros tipos (Antecipado, Pos), o `valorPagamento` fica `undefined`, e o sistema usa `notaSelecionada.valorPendente` (valor total pendente) como fallback.

Porem, o bug real pode estar no campo `valorPagamento` do modal: o `useEffect` na linha 95-103 define `valorPagamento: isParcial ? saldoDevedor : undefined`. Se o usuario abre o modal, o campo pre-preenche com o saldo devedor (R$200). Se o usuario digita R$100, precisa garantir que a mascara de moeda esta atualizando o estado corretamente.

### Correcao no `ModalFinalizarPagamento.tsx`

- Garantir que o campo de valor editavel tambem apareca para Pagamento 100% Antecipado (se necessario) ou pelo menos funcione corretamente para Parcial
- Verificar que a atualizacao do `valorPagamento` no estado do form esta correta
- Garantir que o valor default para Parcial seja o saldo devedor, e que a edicao funcione

### Correcao no `FinanceiroNotasPendencias.tsx`

- Assegurar que `dados.valorPagamento` e passado corretamente (nao `undefined`)
- Para tipo Parcial, sempre usar `dados.valorPagamento` em vez de `notaSelecionada.valorPendente`

---

## 3. Alerta de Conferencia Incompleta Apenas para Pagamento Pos

### Arquivo: `src/components/estoque/ModalFinalizarPagamento.tsx`

A logica atual (linhas 106-109) verifica `pendencia.percentualConferencia < 100` para TODOS os tipos de pagamento. Isso bloqueia pagamentos Antecipados e Parciais que, por definicao, ocorrem ANTES da conferencia.

**Correcao:** O alerta de conferencia incompleta e o checkbox de "forcar finalizacao" so devem aparecer quando `tipoPagamento === 'Pagamento Pos'`. Para Antecipado e Parcial, o pagamento ocorre antes da conferencia, entao esse alerta nao faz sentido.

```typescript
const conferenciaIncompleta = useMemo(() => {
  if (!pendencia) return false;
  // Alerta so para Pagamento Pos (paga apos conferencia)
  if (pendencia.tipoPagamento !== 'Pagamento Pos') return false;
  return pendencia.percentualConferencia < 100;
}, [pendencia]);
```

---

## 4. Reordenar Quadros no Lancamento

### Arquivo: `src/pages/EstoqueNotaCadastrar.tsx`

Atualmente a ordem e:
1. Informacoes da Nota (linha ~289)
2. Produtos (linha ~352)
3. Pagamento (linha ~538)
4. Buffer de Anexos (linha ~671)

Nova ordem:
1. Informacoes da Nota
2. **Pagamento** (mover para cima)
3. **Produtos** (mover para baixo)
4. Buffer de Anexos

Basta trocar a posicao dos blocos JSX no return.

---

## 5. Data de Entrada Automatica e Remover Valor Total

### Arquivo: `src/pages/EstoqueNotaCadastrar.tsx`

**Data de Entrada automatica:**
- Inicializar `dataEntrada` com a data de hoje: `new Date().toISOString().split('T')[0]`
- Remover o campo de validacao manual (ja nao precisa validar futuro pois sera hoje)
- Manter o campo visivel mas pre-preenchido (somente leitura ou editavel, conforme preferencia)

**Remover campo Valor Total da Nota:**
- Remover o campo `InputComMascara` de Valor Total manual (linhas ~325-334)
- Remover o estado `valorTotal` e a funcao `handleValorTotalChange`
- O valor total da nota sera sempre a soma dos produtos (`valorTotalProdutos`)
- No `handleSalvar`, usar `valorTotalProdutos` diretamente em vez do fallback `valorTotal`

---

## Resumo de Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/EstoqueNotaConferencia.tsx` | Botao "Recolher" itens explodidos |
| `src/utils/notaEntradaFluxoApi.ts` | Nova funcao `recolherProdutoNota` |
| `src/components/estoque/ModalFinalizarPagamento.tsx` | Alerta conferencia so para Pag. Pos + revisao valor parcial |
| `src/pages/FinanceiroNotasPendencias.tsx` | Revisao do handler de pagamento parcial |
| `src/pages/EstoqueNotaCadastrar.tsx` | Reordenar quadros + data automatica + remover Valor Total |

