
# Plano: Reformulação Completa do Fluxo de Notas de Entrada de Produtos

## Resumo Executivo

Este plano reformula o sistema de Notas de Entrada para seguir rigorosamente um novo fluxo baseado em **STATUS + TIPO DE PAGAMENTO + ATUAÇÃO ATUAL** como regras mestras. O layout visual existente sera mantido, mas a logica de comportamento dos campos, transicoes de status e integracao entre modulos sera completamente reestruturada.

---

## ✅ IMPLEMENTADO: Conceito de Lançamento Inicial

### Regras Implementadas:
1. **Lançamento Inicial**: Cadastro da nota SEM produtos - apenas registra existência e define fluxo
2. **Quadro de Produtos**: Bloqueado (read-only) no lançamento inicial
3. **Tipo de Pagamento**: Campo obrigatório que governa todo o fluxo
4. **Atuação Atual**: Campo controlado pelo sistema, indica qual área tem ação pendente

### Tipos de Pagamento (novos nomes):
- `Pagamento Pos` - 100% após conferência
- `Pagamento Parcial` - Adiantamento + restante após conferência  
- `Pagamento 100% Antecipado` - Pagamento total antes da conferência

### Atuação Inicial Automática:
| Tipo de Pagamento | Atuação Inicial |
|-------------------|-----------------|
| Pagamento Pós | Estoque |
| Pagamento Parcial | Financeiro |
| Pagamento 100% Antecipado | Financeiro |

---

## 1. Status da Nota (10 obrigatórios)

| Status | Descrição | Próximo Status Possível |
|--------|-----------|-------------------------|
| `Criada` | Nota recém cadastrada | Aguardando Pagamento Inicial, Aguardando Conferencia |
| `Aguardando Pagamento Inicial` | Nota esperando pagamento (Antecipado/Parcial) | Pagamento Parcial Realizado, Pagamento Concluido |
| `Pagamento Parcial Realizado` | Primeiro pagamento feito (Parcial) | Aguardando Conferencia |
| `Pagamento Concluido` | 100% pago (antes de conferir) | Aguardando Conferencia |
| `Aguardando Conferencia` | Produtos a conferir | Conferencia Parcial |
| `Conferencia Parcial` | Parte dos aparelhos conferida | Conferencia Concluida, Com Divergencia |
| `Conferencia Concluida` | 100% conferido | Aguardando Pagamento Final, Finalizada |
| `Aguardando Pagamento Final` | Conferência ok, falta pagar (Parcial/Pós) | Finalizada |
| `Com Divergencia` | Discrepância detectada | Aguardando Pagamento Final (após resolução) |
| `Finalizada` | Nota encerrada (somente leitura) | - |

---

## 2. Interface NotaEntrada Atualizada

```typescript
export interface NotaEntrada {
  id: string;
  numeroNota: string;
  data: string;
  fornecedor: string;
  
  // Sistema de status
  status: NotaEntradaStatus;
  
  // ✅ NOVO: Atuação Atual - controlado pelo sistema
  atuacaoAtual: 'Estoque' | 'Financeiro' | 'Encerrado';
  
  // Tipo de pagamento (novos nomes)
  tipoPagamento: 'Pagamento Pos' | 'Pagamento Parcial' | 'Pagamento 100% Antecipado';
  tipoPagamentoBloqueado: boolean;
  
  // Quantidades
  qtdInformada: number;
  qtdCadastrada: number;
  qtdConferida: number;
  
  // Valores
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
  valorConferido: number;
  
  // Produtos
  produtos: ProdutoNotaEntrada[];
  
  // Timeline imutável
  timeline: TimelineNotaEntrada[];
  
  // Alertas
  alertas: AlertaNota[];
  
  // Pagamentos registrados
  pagamentos: Pagamento[];
  
  // Metadados
  dataCriacao: string;
  dataFinalizacao?: string;
  responsavelCriacao: string;
  formaPagamento?: 'Dinheiro' | 'Pix';
  observacoes?: string;
}
```

---

## 3. Arquivos Modificados/Criados

### ✅ 3.1 notaEntradaFluxoApi.ts (ATUALIZADO)
- Interface `NotaEntrada` com campo `atuacaoAtual`
- Novos tipos de pagamento: `Pagamento Pos`, `Pagamento Parcial`, `Pagamento 100% Antecipado`
- Função `definirAtuacaoInicial()` - define atuação baseada no tipo de pagamento
- Função `alterarAtuacao()` - altera atuação com registro na timeline
- Função `podeEditarNota()` - verifica permissão baseada na atuação
- Alterações automáticas de atuação após eventos (pagamento, conferência)

### ✅ 3.2 EstoqueNotaCadastrar.tsx (REFORMULADO)
- Conceito de **Lançamento Inicial** implementado
- Quadro de produtos **bloqueado** visualmente
- Campo "Tipo de Pagamento" obrigatório
- Campo "Atuação Atual" somente leitura (calculado automaticamente)
- Alerta informativo explicando o fluxo
- Descrição dinâmica do fluxo baseada no tipo selecionado

### ✅ 3.3 EstoqueNotasPendencias.tsx (ATUALIZADO)
- Nova coluna "Atuação Atual" com badges visuais
- Badges de tipo de pagamento atualizados
- Verificação de permissão via `podeEditarNota()`
- Botões de ação condicionais (só aparecem se Atuação = Estoque)
- Indicador visual de bloqueio quando Atuação ≠ Estoque

### ✅ 3.4 EstoqueNotaCadastrarProdutos.tsx (JÁ CRIADO)
- Rota: `/estoque/nota/:id/cadastrar-produtos`
- Campos: Tipo Produto, Marca, Modelo, Qtd, Custo Unitário

### ✅ 3.5 EstoqueNotaConferencia.tsx (JÁ CRIADO)
- Rota: `/estoque/nota/:id/conferencia`
- Campos habilitados: IMEI, Cor, Categoria
- Barra de progresso: Qtd Conferida / Qtd Cadastrada

---

## 4. Fluxos por Tipo de Pagamento

### 4.1 Pagamento Pós (100% após conferência)
```
Lançamento Inicial → Atuação = Estoque
  ↓
Estoque cadastra produtos
  ↓
Estoque realiza conferência
  ↓
100% conferido → Atuação = Financeiro
  ↓
Financeiro paga 100%
  ↓
Atuação = Encerrado
```

### 4.2 Pagamento Parcial
```
Lançamento Inicial → Atuação = Financeiro
  ↓
Financeiro paga adiantamento → Atuação = Estoque
  ↓
Estoque cadastra produtos e confere
  ↓
100% conferido → Atuação = Financeiro
  ↓
Financeiro paga restante
  ↓
Atuação = Encerrado
```

### 4.3 Pagamento 100% Antecipado
```
Lançamento Inicial → Atuação = Financeiro
  ↓
Financeiro paga 100% → Atuação = Estoque
  ↓
Estoque cadastra produtos e confere
  ↓
100% conferido → Atuação = Encerrado (automático)
```

---

## 5. Regras de Permissão por Tela

| Tela | Atuação Atual | Permissão |
|------|---------------|-----------|
| Estoque > Notas Pendências | Estoque | Edição liberada |
| Estoque > Notas Pendências | Financeiro | Somente leitura |
| Financeiro > Conferência de Notas | Financeiro | Edição liberada |
| Financeiro > Conferência de Notas | Estoque | Somente leitura |

---

## 6. Timeline Obrigatória

Eventos registrados automaticamente:
- ✅ Lançamento inicial da nota
- ✅ Definição do tipo de pagamento
- ✅ Alterações de Atuação Atual
- ✅ Pagamentos (parcial e total)
- ✅ Início e fim da conferência
- ✅ Alertas de divergência
- ✅ Encerramento da nota

---

## 7. Próximos Passos (PENDENTE)

### 7.1 FinanceiroNotasPendencias.tsx
- [ ] Adaptar para novos status e tipos de pagamento
- [ ] Implementar verificação de atuação
- [ ] Bloquear pagamento Pós antes de conferência
- [ ] Mostrar Valor Nota, Valor Pago, Valor Pendente

### 7.2 EstoqueNotaDetalhes.tsx  
- [ ] Unificar visualização com timeline visível
- [ ] Seção de alertas em destaque
- [ ] Bloqueio total quando Finalizada

### 7.3 pendenciasFinanceiraApi.ts
- [ ] Adaptar interface para novos status
- [ ] Validar regras de pagamento por tipo

---

## 8. Resumo Visual do Fluxo com Atuação

```text
                    LANÇAMENTO INICIAL
                           |
         +-----------------+-----------------+
         |                 |                 |
    [Pag. Pós]       [Pag. Parcial]   [100% Antecipado]
    Atuação:         Atuação:          Atuação:
    ESTOQUE          FINANCEIRO        FINANCEIRO
         |                 |                 |
         |            Paga Inicial      Paga 100%
         |                 |                 |
         |            Atuação:          Atuação:
         |            ESTOQUE           ESTOQUE
         |                 |                 |
         +--------+--------+--------+--------+
                  |
           CADASTRA PRODUTOS
           CONFERE 100%
                  |
    +-------------+-------------+
    |             |             |
[Pós]        [Parcial]     [Antecipado]
Atuação:     Atuação:      Atuação:
FINANCEIRO   FINANCEIRO    ENCERRADO
    |             |        (automático)
Paga 100%    Paga Rest
    |             |
Atuação:     Atuação:
ENCERRADO    ENCERRADO
```
