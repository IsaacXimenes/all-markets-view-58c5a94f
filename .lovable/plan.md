

## Mover Recusa de "Serviços" para "Análise de Tratativas"

### O que muda

A funcionalidade de recusar registros vindos do Estoque ou Garantia sai da aba **Serviços** (onde o tecnico ja esta trabalhando) e passa para a aba **Analise de Tratativas** (onde o registro ainda esta pendente de aprovacao). Assim, a recusa acontece **antes** da criacao da OS.

### Alteracoes

**1. Remover recusa da aba Servicos (`src/pages/OSOficina.tsx`)**
- Remover os states `recusarModal`, `osParaRecusar`, `motivoRecusa`
- Remover os botoes "Recusar" das acoes de "Aguardando Analise" e "Em servico"
- Remover o Dialog/Modal de recusa inteiro
- Remover import de `XCircle` e `Textarea` (se nao usados em outro lugar)

**2. Adicionar recusa na Analise de Tratativas (`src/pages/OSAnaliseGarantia.tsx`)**
- Adicionar states: `showRecusarModal`, `registroParaRecusar`, `motivoRecusa`
- Na tabela, para registros com status "Pendente", adicionar botao vermelho "Recusar" ao lado do botao "Aprovar" existente
- Criar modal de recusa com:
  - Exibicao da observacao de origem (se houver)
  - Campo obrigatorio de motivo da recusa
  - Botao "Confirmar Recusa"
- Ao confirmar:
  - Atualizar o status do registro para "Recusada" (adicionar este status a interface)
  - Se a origem for "Estoque": reverter o `statusGeral` do produto pendente via `updateProdutoPendente`
  - Se a origem for "Garantia": atualizar a garantia correspondente
  - Exibir toast de confirmacao
  - Recarregar a listagem

**3. Atualizar interface `RegistroAnaliseGarantia` (`src/utils/garantiasApi.ts`)**
- Adicionar "Recusada" ao union type de `status`
- Adicionar campos opcionais `motivoRecusa` e `dataRecusa`
- Criar funcao `recusarAnaliseGarantia(id, motivo)` para atualizar o registro

**4. Atualizar badges e filtros (`src/pages/OSAnaliseGarantia.tsx`)**
- Adicionar badge vermelho para status "Recusada" na funcao `getStatusBadge`
- Adicionar opcao "Recusada" no filtro de status
- Atualizar contadores do dashboard (adicionar card ou incluir no existente)

### Resumo tecnico

| Arquivo | Acao |
|---|---|
| `src/pages/OSOficina.tsx` | Remover toda logica de recusa (states, botoes, modal) |
| `src/pages/OSAnaliseGarantia.tsx` | Adicionar botao recusar, modal e logica de devolucao |
| `src/utils/garantiasApi.ts` | Adicionar status "Recusada", campos e funcao de recusa |

