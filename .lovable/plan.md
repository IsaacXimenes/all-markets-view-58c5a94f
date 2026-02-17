

## Centralizar Contas de Assistencia e Atualizar Dados Mockados

### Resumo

1. Remover 8 contas financeiras segregadas por loja de assistencia
2. Criar nova conta centralizada "Dinheiro - Assistencia"
3. Simplificar o filtro de contas no PagamentoQuadro
4. Atualizar status e atuacao dos dados mockados da Assistencia conforme fluxo atual

---

### Parte 1: Contas Financeiras

**Remover** (em `src/utils/cadastrosApi.ts`):
- CTA-011: Bradesco Assistencia (SIA)
- CTA-012: Bradesco Assistencia (JK Shopping)
- CTA-013: Bradesco Assistencia (Shopping Sul)
- CTA-014: Bradesco Assistencia (Aguas Lindas)
- CTA-022: Dinheiro - Assistencia JK Shopping
- CTA-023: Dinheiro - Assistencia Shopping Sul
- CTA-024: Dinheiro - Assistencia Aguas Lindas
- CTA-025: Dinheiro - Assistencia Online

**Criar** nova CTA-022:
- Nome: "Dinheiro - Assistencia"
- Tipo: "Dinheiro"
- Loja vinculada: `geral-assistencia`
- CNPJ: 53.295.194/0001-66
- Status: Ativo, Propria, notaFiscal: true

**Resultado final**: Apenas 2 contas de assistencia:
- CTA-021: Bradesco Assistencia (geral-assistencia)
- CTA-022: Dinheiro - Assistencia (geral-assistencia)

---

### Parte 2: Filtro do PagamentoQuadro

**Arquivo: `src/components/vendas/PagamentoQuadro.tsx`**

- Remover o `useMemo` de `lojaAssistenciaId` e referencias a `obterLojaById`, `lojas`
- Simplificar filtro para:

```text
if (apenasContasAssistencia) {
  return c.lojaVinculada === 'geral-assistencia';
}
return !lojaVendaId || c.lojaVinculada === lojaVendaId;
```

---

### Parte 3: FinanceiroExtratoContas

**Arquivo: `src/pages/FinanceiroExtratoContas.tsx`**

- `CONTAS_ASSISTENCIA_SEGREGADAS`: remover conteudo (array vazio `[]`)
- `CONTAS_DINHEIRO_SEGREGADAS`: remover CTA-022 a CTA-025, manter apenas CTA-015 a CTA-019
- Atualizar array de ordenacao `ordemSegregadas` removendo as contas excluidas

---

### Parte 4: Dados Mockados da Assistencia

**Arquivo: `src/utils/assistenciaApi.ts`**

Corrigir status e proximaAtuacao conforme o fluxo atual do sistema:

| OS | Status Atual | Status Correto | Atuacao Atual | Atuacao Correta |
|---|---|---|---|---|
| OS-0001 | Aguardando Analise | (sem mudanca) | Tecnico: Avaliar/Executar | (sem mudanca) |
| OS-0002 | Em servico | (sem mudanca) | Tecnico | (sem mudanca) |
| OS-0003 | Solicitacao Enviada | Solicitacao de Peca | Gestor (Suprimentos) | (sem mudanca) |
| OS-0004 | Aguardando Peca | (sem mudanca) | Logistica: Enviar Peca | (sem mudanca) |
| OS-0005 | Peca Recebida | (sem mudanca) | Tecnico (Recebimento) | (sem mudanca) |
| OS-0006 | Finalizado | Servico concluido | Gestor/Vendedor | Atendente |
| OS-0007 | Servico concluido | Conferencia do Gestor | Gestor (Conferencia) | Gestor (Conferencia) |
| OS-0008 | Concluido | Liquidado | - | (sem mudanca) |

