
# Plano: Exibir Pendências Financeiras no Módulo Estoque (com Edição e Sincronização Automática)

## Visão Geral

Este plano adiciona visibilidade das pendências financeiras no módulo de Estoque, permitindo que a equipe de estoque acompanhe o status de conferência e pagamento das notas, edite notas pendentes, e tenha **sincronização automática bidirecional** com o Financeiro.

---

## Arquitetura de Sincronização

A sincronização entre Estoque e Financeiro já está implementada na codebase:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE SINCRONIZAÇÃO                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ESTOQUE                              FINANCEIRO                            │
│  ┌──────────────────┐                 ┌──────────────────┐                 │
│  │ Valida aparelho  │ ───────────────>│ Atualiza pendência│                │
│  │ (50% → 60%)      │  automatico     │ (valorConferido)  │                │
│  └──────────────────┘                 └──────────────────┘                 │
│           │                                    │                            │
│           ▼                                    ▼                            │
│  ┌──────────────────┐                 ┌──────────────────┐                 │
│  │ estoqueApi.ts    │                 │ pendenciasFinan- │                 │
│  │ validarAparelho  │ ───────────────>│ ceiraApi.ts      │                 │
│  │ NotaEmLote()     │                 │ atualizarPend()  │                 │
│  └──────────────────┘                 └──────────────────┘                 │
│           │                                    │                            │
│           └──────── Ambos módulos veem ────────┘                           │
│                     os mesmos dados                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

A sincronização acontece através de:
1. `validarAparelhoNota()` - Valida um aparelho e chama `atualizarPendencia()`
2. `validarAparelhosEmLote()` - Valida múltiplos aparelhos de uma vez
3. `getPendencias()` / `getPendenciaPorNota()` - Ambos os módulos leem a mesma fonte

---

## O que será implementado

### 1. Nova Aba no Estoque Layout

**Arquivo:** `src/components/layout/EstoqueLayout.tsx`

Adicionar nova aba entre "Notas de Compra" e "Notas Urgência":

```text
Tabs do Estoque:
┌──────────┬───────────┬───────────┬───────────────────┬──────────────────┬───────────────┬─────────────────┬───────────────────┐
│Dashboard │ Aparelhos │ Acessórios│ Aparelhos Pend.   │ Notas de Compra  │ Notas - Pend. │ Notas Urgência  │ Movimentações...  │
└──────────┴───────────┴───────────┴───────────────────┴──────────────────┴───────────────┴─────────────────┴───────────────────┘
                                                                          ▲
                                                                    NOVA ABA
```

**Detalhes:**
- Nome: "Notas - Pendências"
- Icone: `Wallet`
- Rota: `/estoque/notas-pendencias`

---

### 2. Nova Página: EstoqueNotasPendencias.tsx

**Arquivo:** `src/pages/EstoqueNotasPendencias.tsx`

Layout da página:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ESTOQUE > NOTAS - PENDÊNCIAS                                               │
├───────────────┬───────────────┬───────────────┬─────────────────────────────┤
│ Em Conferência│ Valor Pend.   │ Valor Conferido│ Alertas SLA               │
│ [8]           │ [R$ 45.000]   │ [R$ 32.000]   │ [2 críticos]               │
├───────────────┴───────────────┴───────────────┴─────────────────────────────┤
│  FILTROS                                                                    │
│  [Data Início] [Data Fim] [Fornecedor ▼] [Status Conferência ▼] [Limpar]   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Nº Nota │ Fornec. │ Valor │ Conferido │ % Conf │ Conf │ Pgto │ SLA │ Ações │
│  NC-0008 │ iStore  │ 19.2k │ ████░░ 8k │  42%   │ EmCf │ Agrd │ ⚠3  │ ✏️ 👁 │
│  NC-0007 │ FastCel │ 5.0k  │ █████ 5k  │ 100%   │ Cmpl │ Agrd │ ✓2  │ ✏️ 👁 │
│  URG-023 │ TechSup │ 3.2k  │ ██░░░ 1k  │  31%   │ EmCf │ Pago │ ✓1  │ ✏️ 👁 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Coluna de Ações: Editar e Visualizar

| Ícone | Ação | Descrição |
|-------|------|-----------|
| ✏️ (Pencil) | Editar | Navega para `/estoque/nota/:id` para edição completa |
| 👁️ (Eye) | Ver Detalhes | Abre modal somente leitura com progresso e timeline |

**Lógica do botão Editar:**
- Visível para notas com `statusPagamento !== 'Pago'`
- Permite editar a nota e validar aparelhos

---

### 4. Sincronização Automática

Quando o Estoque edita uma nota e valida aparelhos:

1. **Estoque valida +10% dos aparelhos**
   - Chama `validarAparelhoNota()` ou `validarAparelhosEmLote()`
   - Atualiza `valorConferido` na nota

2. **Sistema sincroniza automaticamente**
   - `atualizarPendencia()` é chamada internamente
   - Atualiza `percentualConferencia`, `valorConferido`, `valorPendente`
   - Registra na timeline compartilhada

3. **Financeiro vê a alteração**
   - Ao acessar a tela de pendências, vê o novo percentual
   - Timeline mostra: "Aparelho X validado por [Responsável do Estoque]"
   - Notificação automática para o Financeiro

**Exemplo de fluxo:**

```text
ANTES:
┌─────────────────────────────────────────┐
│ NC-2025-0008                            │
│ Conferidos: 2/5 (40%)                   │
│ Valor Conferido: R$ 8.000               │
│ Valor Pendente: R$ 12.000               │
└─────────────────────────────────────────┘

ESTOQUE VALIDA MAIS 1 APARELHO (R$ 4.000)

DEPOIS (reflete em ambos os módulos):
┌─────────────────────────────────────────┐
│ NC-2025-0008                            │
│ Conferidos: 3/5 (60%)                   │
│ Valor Conferido: R$ 12.000              │
│ Valor Pendente: R$ 8.000                │
└─────────────────────────────────────────┘
```

---

### 5. Modal de Detalhes (Somente Leitura)

```text
┌─────────────────────────────────────────────────────────────────┐
│  DETALHES - NOTA NC-2025-0008                                  │
├─────────────────────────────────────────────────────────────────┤
│  INFORMAÇÕES GERAIS                                             │
│  ┌──────────────┬──────────────┬──────────────┐                │
│  │ Fornecedor   │ Data Entrada │ Dias         │                │
│  │ iStore       │ 25/01/2026   │ 3 dias       │                │
│  └──────────────┴──────────────┴──────────────┘                │
├─────────────────────────────────────────────────────────────────┤
│  PROGRESSO DE CONFERÊNCIA                                       │
│  ████████░░░░░░░░░░░░ 60%                                       │
│  3/5 aparelhos conferidos                                       │
├─────────────────────────────────────────────────────────────────┤
│  VALORES                                                        │
│  ┌────────────────┬────────────────┬────────────────┐          │
│  │ Total          │ Conferido      │ Pendente       │          │
│  │ R$ 20.000,00   │ R$ 12.000,00   │ R$ 8.000,00    │          │
│  └────────────────┴────────────────┴────────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│  STATUS FINANCEIRO                                              │
│  Pagamento: [Aguardando Conferência]                           │
│  Data Pagamento: —                                              │
├─────────────────────────────────────────────────────────────────┤
│  APARELHOS                                                      │
│  ┌──────────────┬────────────┬─────────┬─────────────┐         │
│  │ IMEI         │ Modelo     │ Valor   │ Status      │         │
│  │ 352...012    │ iPhone 15  │ R$ 4.0k │ ✓ Conferido │         │
│  │ 352...013    │ iPhone 15  │ R$ 4.0k │ ✓ Conferido │         │
│  │ 352...014    │ iPhone 14  │ R$ 4.0k │ ✓ Conferido │         │
│  │ 352...015    │ iPhone 14  │ R$ 4.0k │ ⏳ Pendente │         │
│  │ 352...016    │ iPhone 13  │ R$ 4.0k │ ⏳ Pendente │         │
│  └──────────────┴────────────┴─────────┴─────────────┘         │
├─────────────────────────────────────────────────────────────────┤
│  TIMELINE (compartilhada com Financeiro)                        │
│  ● 27/01 10:30 - iPhone 352...014 validado (Ana Costa)          │
│  ● 26/01 14:30 - iPhone 352...012 validado (Pedro Lima)         │
│  ● 26/01 10:15 - iPhone 352...013 validado (Pedro Lima)         │
│  ● 25/01 09:00 - Nota recebida no sistema                       │
├─────────────────────────────────────────────────────────────────┤
│                              [Editar Nota] [Fechar]             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/EstoqueNotasPendencias.tsx` | **Criar** | Nova página de pendências para o Estoque |
| `src/components/layout/EstoqueLayout.tsx` | Modificar | Adicionar nova aba "Notas - Pendências" |
| `src/App.tsx` | Modificar | Adicionar rota `/estoque/notas-pendencias` |

---

## Funcionalidades da Nova Página

### Cards de Resumo
1. **Em Conferência** - Quantidade de notas em processo de conferência
2. **Valor Pendente de Conferência** - Soma dos valores ainda não conferidos
3. **Valor Conferido** - Soma dos valores já validados
4. **Alertas SLA** - Notas com mais de 3 dias sem progresso

### Filtros
- Data Início / Data Fim
- Fornecedor (Select)
- Status Conferência (Em Conferência / Completa / Discrepância)
- Botão Limpar Filtros

### Tabela
| Coluna | Descrição |
|--------|-----------|
| Nº Nota | ID da nota (NC-XXXX ou URG-XXXX) |
| Fornecedor | Nome do fornecedor |
| Valor Total | Valor total da nota |
| Valor Conferido | Com barra de progresso visual |
| % Conferência | Percentual de aparelhos conferidos |
| Status Conferência | Badge (Em Conf. / Completa / Discrepância) |
| Status Pagamento | Badge (Aguardando / Pago) - somente visualização |
| SLA | Indicador de dias (verde/amarelo/vermelho) |
| Ações | Botões Editar (caneta) + Ver Detalhes (olho) |

---

## Comparativo: Estoque vs Financeiro

| Aspecto | Financeiro | Estoque |
|---------|------------|---------|
| Botão "Finalizar Pagamento" | Sim | Não |
| Botão "Editar Nota" | Não | Sim (caneta) |
| Botão "Ver Detalhes" | Sim | Sim |
| Validar aparelhos | Não | Sim (via página de edição) |
| Timeline de eventos | Sim | Sim (mesma fonte) |
| Foco dos filtros | Status Pagamento | Status Conferência |
| Card de destaque | Valor Pendente Pgto | Em Conferência |

---

## Detalhes Técnicos

### Fonte de Dados Única
Ambos os módulos consomem `getPendencias()` de `pendenciasFinanceiraApi.ts`, garantindo que vejam os mesmos dados.

### Sincronização em Tempo Real
A sincronização acontece automaticamente quando:
1. Estoque valida um aparelho via `validarAparelhoNota()`
2. Estoque valida em lote via `validarAparelhosEmLote()`
3. Financeiro finaliza pagamento via `finalizarPagamentoPendencia()`

### Notificações Automáticas
Ao atingir marcos importantes, o sistema dispara notificações:
- 50% conferido: Notifica Financeiro
- 100% conferido: Notifica Financeiro (pronto para pagamento)
- Discrepância detectada: Notifica Financeiro + Gestor
- Pagamento finalizado: Notifica Estoque

---

## Benefícios

1. **Visibilidade Cross-Module** - Estoque acompanha status financeiro sem trocar de módulo
2. **Edição Rápida** - Botão de caneta leva direto para edição da nota
3. **Sincronização Automática** - Alterações no Estoque refletem instantaneamente no Financeiro
4. **Timeline Unificada** - Histórico completo de todas as tratativas em um único lugar
5. **SLA Compartilhado** - Ambos os times veem alertas de notas atrasadas
