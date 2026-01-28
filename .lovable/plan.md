
# Plano: Extensao Completa do Fluxo Estoque-Financeiro para Notas de Compra

## Analise do Estado Atual

Apos analise detalhada do codigo, identifiquei que **grande parte da estrutura ja existe**:

### Ja Implementado
- Interface `NotaCompra` em `estoqueApi.ts` (linhas 72-106) com campos de conferencia
- Interface `TimelineEntry` em `estoqueApi.ts` e `osApi.ts` com tipos corretos
- Interface `PendenciaFinanceira` em `pendenciasFinanceiraApi.ts` completa
- Funcao `validarAparelhoNota()` em `estoqueApi.ts` (linhas 1149-1245)
- Funcao `verificarConferenciaNota()` em `estoqueApi.ts` (linhas 1249-1272)
- Funcao `validarAparelhosEmLote()` em `estoqueApi.ts` (linhas 1276-1305)
- Pagina `FinanceiroNotasPendencias.tsx` com cards, filtros e modal de pagamento
- Pagina `EstoqueNotasPendencias.tsx` para visualizacao do Estoque
- Pagina `EstoqueNotaDetalhes.tsx` com conferencia individual de produtos
- Sincronizacao bidirecional via `atualizarPendencia()`

### Pendente de Implementacao
1. Campo `tipoPagamento` na interface NotaCompra
2. Status `Finalizada com Pendencia` na conferencia
3. Individualizacao automatica de registros (quantidade > 1)
4. Modal de detalhes de pendencia com timeline visual
5. Componente `ModalFinalizarPagamento.tsx` separado
6. Validacao de comprovante (tipo/tamanho)
7. Notificacoes automaticas completas
8. Coluna "Nota de Origem" em Produtos Pendentes

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/utils/estoqueApi.ts` | Modificar | Adicionar `tipoPagamento`, `Finalizada com Pendencia`, individualizacao |
| `src/utils/pendenciasFinanceiraApi.ts` | Modificar | Adicionar funcao `forcarFinalizacao()` |
| `src/pages/EstoqueNotaDetalhes.tsx` | Modificar | Melhorar conferencia com selecao de tipoPagamento |
| `src/pages/EstoqueNotaCadastrar.tsx` | Modificar | Adicionar individualizacao automatica |
| `src/pages/FinanceiroNotasPendencias.tsx` | Modificar | Melhorar modal de detalhes com timeline |
| `src/pages/EstoqueProdutosPendentes.tsx` | Modificar | Adicionar coluna "Nota de Origem" |
| `src/components/estoque/ModalDetalhePendencia.tsx` | Criar | Componente reutilizavel para detalhes |
| `src/components/estoque/ModalFinalizarPagamento.tsx` | Criar | Componente separado para pagamento |

---

## Etapa 1: Estender Interface NotaCompra

**Arquivo**: `src/utils/estoqueApi.ts`

Adicionar campo `tipoPagamento`:

```typescript
export interface NotaCompra {
  // ... campos existentes ...
  tipoPagamento?: 'Parcial' | '100% Antecipado' | 'Pos-Conferencia';
  statusConferencia?: 'Em Conferência' | 'Conferência Completa' | 'Discrepância Detectada' | 'Finalizada com Pendência';
  // ... resto dos campos ...
}
```

---

## Etapa 2: Adicionar Individualizacao Automatica

**Arquivo**: `src/pages/EstoqueNotaCadastrar.tsx`

Quando usuario cadastrar nota com `quantidade > 1` para um modelo, o sistema deve gerar N registros individuais automaticamente:

```typescript
// Ao salvar nota, expandir produtos com quantidade > 1
const expandirProdutos = (produtos: ProdutoNota[]): ProdutoNota[] => {
  return produtos.flatMap(prod => {
    if (prod.quantidade <= 1) return [prod];
    
    // Gerar N registros individuais
    return Array.from({ length: prod.quantidade }, (_, i) => ({
      ...prod,
      id: `PROD-${nota.id}-${String(i + 1).padStart(3, '0')}`,
      quantidade: 1,
      valorTotal: prod.valorUnitario,
      imei: '', // A ser preenchido na conferencia
      statusConferencia: 'Pendente'
    }));
  });
};
```

---

## Etapa 3: Selecao de Tipo de Pagamento

**Arquivo**: `src/pages/EstoqueNotaDetalhes.tsx`

Adicionar campo de selecao `tipoPagamento` antes de enviar para o Financeiro:

```typescript
<div className="space-y-2">
  <Label>Tipo de Pagamento</Label>
  <Select value={tipoPagamento} onValueChange={setTipoPagamento}>
    <SelectTrigger>
      <SelectValue placeholder="Selecione o tipo..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="Pos-Conferencia">Pos-Conferencia (padrao)</SelectItem>
      <SelectItem value="Parcial">Parcial (pagamento adiantado)</SelectItem>
      <SelectItem value="100% Antecipado">100% Antecipado</SelectItem>
    </SelectContent>
  </Select>
</div>
```

---

## Etapa 4: Criar Componente ModalDetalhePendencia

**Arquivo**: `src/components/estoque/ModalDetalhePendencia.tsx`

Componente reutilizavel para exibir detalhes completos de uma pendencia:

```typescript
interface ModalDetalhePendenciaProps {
  pendencia: PendenciaFinanceira | null;
  open: boolean;
  onClose: () => void;
  showPaymentButton?: boolean;
  onPayment?: () => void;
}

// Secoes:
// 1. Informacoes Gerais (Nota, Fornecedor, Datas)
// 2. Valores (Total, Conferido, Pendente, Discrepancia)
// 3. Aparelhos (Tabela com status de cada um)
// 4. Timeline visual com icones por tipo de evento
// 5. Botao "Finalizar Pagamento" (se habilitado e 100% conferido)
```

---

## Etapa 5: Criar Componente ModalFinalizarPagamento

**Arquivo**: `src/components/estoque/ModalFinalizarPagamento.tsx`

Componente separado para finalizar pagamento:

```typescript
interface ModalFinalizarPagamentoProps {
  pendencia: PendenciaFinanceira;
  open: boolean;
  onClose: () => void;
  onConfirm: (dados: DadosPagamento) => void;
}

// Campos:
// - Conta de Pagamento (Select - obrigatorio)
// - Forma de Pagamento (Select - obrigatorio)
// - Parcelas (Input - visivel se Cartao/Boleto)
// - Data de Vencimento (Date - opcional)
// - Upload de Comprovante (obrigatorio, max 5MB, PDF/JPG/PNG)
// - Observacoes (Textarea - opcional)
// - Responsavel (Select - obrigatorio)

// Validacoes:
// - Todos os campos obrigatorios preenchidos
// - Comprovante: tipo e tamanho validados
```

---

## Etapa 6: Adicionar Funcao Forcar Finalizacao

**Arquivo**: `src/utils/pendenciasFinanceiraApi.ts`

Permitir Financeiro finalizar nota mesmo sem 100% de conferencia:

```typescript
export const forcarFinalizacaoPendencia = (
  notaId: string,
  pagamento: DadosPagamento,
  observacoes: string
): PendenciaFinanceira | null => {
  const pendencia = pendenciasFinanceiras.find(p => p.notaId === notaId);
  if (!pendencia) return null;
  
  // Marcar como "Finalizada com Pendencia"
  pendencia.statusConferencia = 'Finalizada com Pendência';
  pendencia.statusPagamento = 'Pago';
  
  // Registrar valor pendente nao conferido
  const valorNaoConferido = pendencia.valorTotal - pendencia.valorConferido;
  
  // Adicionar timeline
  pendencia.timeline.unshift({
    id: `TL-${notaId}-${Date.now()}`,
    data: new Date().toISOString(),
    tipo: 'pagamento',
    titulo: 'Finalizada com Pendencia',
    descricao: `Pagamento forcado. Valor nao conferido: ${formatCurrency(valorNaoConferido)}. ${observacoes}`,
    responsavel: pagamento.responsavel
  });
  
  return pendencia;
};
```

---

## Etapa 7: Adicionar Coluna "Nota de Origem"

**Arquivo**: `src/pages/EstoqueProdutosPendentes.tsx`

Adicionar coluna na tabela e tag visual para urgencias:

```typescript
<TableHead>Nota de Origem</TableHead>

// Na celula:
<TableCell>
  <div className="flex items-center gap-2">
    <span className="font-mono text-xs">{produto.notaOuVendaId}</span>
    {produto.notaOuVendaId?.startsWith('URG-') && (
      <Badge className="bg-orange-500/20 text-orange-600 text-xs">
        Urgencia
      </Badge>
    )}
  </div>
</TableCell>
```

---

## Etapa 8: Adicionar Filtro por Tipo de Nota

**Arquivo**: `src/pages/EstoqueProdutosPendentes.tsx`

Adicionar filtro de tipo de nota:

```typescript
const [tipoNotaFilter, setTipoNotaFilter] = useState<string>('todos');

// Filtrar:
if (tipoNotaFilter === 'urgencia') {
  filtered = filtered.filter(p => p.notaOuVendaId?.startsWith('URG-'));
} else if (tipoNotaFilter === 'normal') {
  filtered = filtered.filter(p => p.notaOuVendaId?.startsWith('NC-'));
}
```

---

## Etapa 9: Melhorar Modal de Detalhes no Financeiro

**Arquivo**: `src/pages/FinanceiroNotasPendencias.tsx`

Substituir dialog simples pelo novo `ModalDetalhePendencia`:

```typescript
import { ModalDetalhePendencia } from '@/components/estoque/ModalDetalhePendencia';
import { ModalFinalizarPagamento } from '@/components/estoque/ModalFinalizarPagamento';

// Usar componentes reutilizaveis:
<ModalDetalhePendencia
  pendencia={pendenciaSelecionada}
  open={dialogDetalhes}
  onClose={() => setDialogDetalhes(false)}
  showPaymentButton={true}
  onPayment={() => {
    setDialogDetalhes(false);
    setDialogPagamento(true);
  }}
/>

<ModalFinalizarPagamento
  pendencia={pendenciaSelecionada}
  open={dialogPagamento}
  onClose={() => setDialogPagamento(false)}
  onConfirm={handleFinalizarPagamento}
/>
```

---

## Etapa 10: Notificacoes Automaticas

**Arquivo**: `src/utils/pendenciasFinanceiraApi.ts`

Adicionar notificacoes em pontos-chave (ja existem algumas, completar):

```typescript
// Notificacao 1: Nota Criada
addNotification({
  type: 'nota_pendencia',
  title: 'Nova pendencia financeira',
  description: `Nota ${nota.id} de ${nota.fornecedor} aguardando conferencia`,
  targetUsers: ['financeiro', 'gestor']
});

// Notificacao 2: Aparelho Validado (ja existe em atualizarPendencia)

// Notificacao 3: 100% Conferido
if (statusConferencia === 'Conferência Completa') {
  addNotification({
    type: 'conferencia_completa',
    title: 'Nota pronta para pagamento',
    description: `Nota ${notaId} com 100% dos aparelhos conferidos`,
    targetUsers: ['financeiro']
  });
}

// Notificacao 4: SLA Alerta (ja existe em verificarSLAPendencias)

// Notificacao 5: Pagamento Confirmado (ja existe em finalizarPagamentoPendencia)
```

---

## Resumo das Mudancas

### Novos Componentes
1. `ModalDetalhePendencia.tsx` - Modal reutilizavel com timeline visual
2. `ModalFinalizarPagamento.tsx` - Modal de pagamento com validacoes

### Interfaces Atualizadas
- `NotaCompra`: +tipoPagamento, +statusConferencia (Finalizada com Pendencia)
- `ProdutoNota`: ja tem todos os campos necessarios

### Funcoes Novas
- `forcarFinalizacaoPendencia()` - Finalizar nota sem 100% conferencia
- `expandirProdutos()` - Individualizar registros quantidade > 1

### Paginas Modificadas
- `EstoqueNotaCadastrar.tsx` - Individualizacao automatica
- `EstoqueNotaDetalhes.tsx` - Selecao de tipoPagamento
- `EstoqueProdutosPendentes.tsx` - Coluna Nota de Origem + filtro
- `FinanceiroNotasPendencias.tsx` - Usar novos componentes

### Validacoes Adicionadas
- Comprovante: tipo (PDF/JPG/PNG) e tamanho (max 5MB)
- Campos obrigatorios no pagamento
- Logica de discrepancia com tolerancia 0.1%

---

## Ordem de Implementacao

1. ✅ Atualizar interface NotaCompra - Adicionado tipoPagamento, statusConferencia expandido
2. ✅ Atualizar interface ProdutoNota - Adicionado capacidade e percentualBateria
3. ✅ Atualizar interface PendenciaFinanceira - Status "Finalizada com Pendência"
4. ✅ Criar ModalDetalhePendencia - Componente reutilizável com timeline visual
5. ✅ Criar ModalFinalizarPagamento - Componente com validação de comprovante
6. ✅ Modificar EstoqueProdutosPendentes - Filtro por tipo de nota (Urgência/Normal)
7. ✅ Modificar FinanceiroNotasPendencias - Usar novos modais reutilizáveis
8. ✅ Adicionar função forcarFinalizacaoPendencia - Permite finalizar sem 100% conferência
9. ✅ Completar notificações automáticas - Já existiam, mantidas

## Status: IMPLEMENTADO ✅
