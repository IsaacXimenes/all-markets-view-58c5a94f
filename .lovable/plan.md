

# Plano: Implementar Funções de API Pendentes para Fluxo Estoque-Financeiro

## Análise do Estado Atual

Após análise completa do código, identifiquei que **a maior parte das funcionalidades já foi implementada**:

### Já Implementado

| Função | Arquivo | Status |
|--------|---------|--------|
| `validarAparelhoNota()` | estoqueApi.ts (linhas 1153-1249) | Completa |
| `verificarConferenciaNota()` | estoqueApi.ts (linhas 1252-1276) | Completa |
| `validarAparelhosEmLote()` | estoqueApi.ts (linhas 1279-1309) | Completa |
| `criarPendenciaFinanceira()` | pendenciasFinanceiraApi.ts (linhas 58-119) | Completa |
| `atualizarPendencia()` | pendenciasFinanceiraApi.ts (linhas 122-206) | Completa |
| `finalizarPagamentoPendencia()` | pendenciasFinanceiraApi.ts (linhas 209-271) | Completa |
| `forcarFinalizacaoPendencia()` | pendenciasFinanceiraApi.ts (linhas 321-389) | Completa |
| `verificarSLAPendencias()` | pendenciasFinanceiraApi.ts (linhas 292-318) | Completa (gera alertas SLA) |
| `FinanceiroNotasPendencias.tsx` | Página completa | Com modais integrados |
| `ModalDetalhePendencia.tsx` | Componente | Com timeline visual |
| `ModalFinalizarPagamento.tsx` | Componente | Com validações de comprovante |

### Pendente de Implementação

| Função/Recurso | Arquivo | Descrição |
|----------------|---------|-----------|
| `criarNotaComPendencia()` | estoqueApi.ts | Criar nota e automaticamente criar pendência no Financeiro |
| `atualizarStatusPagamento()` | estoqueApi.ts | Atualizar status de pagamento da nota |
| Colunas extras na tabela | EstoqueNotasCompra.tsx | Valor Conferido, Status Conferência, Status Pagamento |
| Botão "Ver Progresso" | EstoqueNotasCompra.tsx | Modal com barra de progresso e timeline |
| Botão "Ver Pendência" | FinanceiroConferenciaNotas.tsx | Abrir modal de detalhes da pendência |

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/utils/estoqueApi.ts` | Modificar | Adicionar `criarNotaComPendencia()` e `atualizarStatusPagamento()` |
| `src/pages/EstoqueNotasCompra.tsx` | Modificar | Adicionar colunas e modal de progresso |
| `src/pages/FinanceiroConferenciaNotas.tsx` | Modificar | Adicionar botão "Ver Pendência" |

---

## Etapa 1: Adicionar Função `criarNotaComPendencia()`

**Arquivo**: `src/utils/estoqueApi.ts`

Criar função que combina criação de nota + criação de pendência financeira:

```typescript
import { criarPendenciaFinanceira } from './pendenciasFinanceiraApi';

// Criar nota de compra e automaticamente criar pendência no Financeiro
export const criarNotaComPendencia = (nota: Omit<NotaCompra, 'id' | 'status'>): NotaCompra => {
  // Criar a nota normalmente
  const novaNota = addNotaCompra(nota);
  
  // Inicializar valores de conferência
  novaNota.valorConferido = 0;
  novaNota.valorPendente = novaNota.valorTotal;
  novaNota.statusConferencia = 'Em Conferência';
  novaNota.statusPagamento = 'Aguardando Conferência';
  
  // Criar pendência financeira automaticamente
  criarPendenciaFinanceira(novaNota);
  
  // Marcar como enviada para financeiro
  localStorage.setItem(`nota_status_${novaNota.id}`, 'Enviado para Financeiro');
  
  return novaNota;
};
```

---

## Etapa 2: Adicionar Função `atualizarStatusPagamento()`

**Arquivo**: `src/utils/estoqueApi.ts`

```typescript
// Atualizar status de pagamento da nota
export const atualizarStatusPagamento = (
  notaId: string, 
  status: 'Aguardando Conferência' | 'Pago' | 'Parcialmente Pago'
): NotaCompra | null => {
  const nota = notasCompra.find(n => n.id === notaId);
  if (!nota) return null;
  
  nota.statusPagamento = status;
  
  // Se pago, atualizar status geral
  if (status === 'Pago') {
    nota.status = 'Concluído';
    localStorage.setItem(`nota_status_${notaId}`, 'Concluído');
  }
  
  // Adicionar entrada na timeline
  if (!nota.timeline) nota.timeline = [];
  nota.timeline.unshift({
    id: `TL-${notaId}-${String(nota.timeline.length + 1).padStart(3, '0')}`,
    data: new Date().toISOString(),
    tipo: 'pagamento',
    titulo: 'Status de Pagamento Atualizado',
    descricao: `Status alterado para: ${status}`,
    responsavel: 'Sistema'
  });
  
  return nota;
};
```

---

## Etapa 3: Melhorar Tabela EstoqueNotasCompra.tsx

**Arquivo**: `src/pages/EstoqueNotasCompra.tsx`

Adicionar colunas extras na tabela:

```typescript
// Importar componentes necessários
import { Progress } from '@/components/ui/progress';
import { Dialog } from '@/components/ui/dialog';
import { getPendenciaPorNota } from '@/utils/pendenciasFinanceiraApi';

// Novas colunas na tabela
<TableHead>Valor Conferido</TableHead>
<TableHead>Status Conf.</TableHead>
<TableHead>Status Pag.</TableHead>

// Células com dados
<TableCell>
  <div className="flex items-center gap-2">
    <Progress value={getProgressoNota(nota.id)} className="w-16 h-2" />
    <span className="text-xs">
      {formatCurrency(nota.valorConferido || 0)}
    </span>
  </div>
</TableCell>
<TableCell>
  <Badge variant="outline" className={getConferenciaBadgeClass(nota.statusConferencia)}>
    {nota.statusConferencia || 'Pendente'}
  </Badge>
</TableCell>
<TableCell>
  <Badge variant="outline" className={getPagamentoBadgeClass(nota.statusPagamento)}>
    {nota.statusPagamento || 'Aguardando'}
  </Badge>
</TableCell>
```

Adicionar botão "Ver Progresso":

```typescript
<Button 
  variant="ghost" 
  size="sm"
  onClick={() => handleVerProgresso(nota)}
>
  <BarChart className="h-4 w-4" />
</Button>

// Modal de progresso
<Dialog open={progressoModalOpen} onOpenChange={setProgressoModalOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Progresso de Conferência - {notaSelecionada?.id}</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <Progress value={progressoNota} className="h-3" />
      <p className="text-center font-medium">
        {progressoNota}% conferido
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Valor Total</Label>
          <p>{formatCurrency(notaSelecionada?.valorTotal)}</p>
        </div>
        <div>
          <Label>Valor Conferido</Label>
          <p className="text-green-600">{formatCurrency(notaSelecionada?.valorConferido)}</p>
        </div>
      </div>
      {/* Timeline de validações */}
      <div className="max-h-48 overflow-auto">
        {notaSelecionada?.timeline?.map(entry => (
          <div key={entry.id} className="border-l-2 pl-3 py-2">
            <p className="text-sm font-medium">{entry.titulo}</p>
            <p className="text-xs text-muted-foreground">{entry.descricao}</p>
          </div>
        ))}
      </div>
    </div>
  </DialogContent>
</Dialog>
```

---

## Etapa 4: Adicionar Botão "Ver Pendência" no FinanceiroConferenciaNotas.tsx

**Arquivo**: `src/pages/FinanceiroConferenciaNotas.tsx`

```typescript
// Importar componentes
import { ModalDetalhePendencia } from '@/components/estoque/ModalDetalhePendencia';
import { getPendenciaPorNota } from '@/utils/pendenciasFinanceiraApi';

// Estado para modal
const [pendenciaSelecionada, setPendenciaSelecionada] = useState(null);
const [dialogPendencia, setDialogPendencia] = useState(false);

// Função para ver pendência
const handleVerPendencia = (nota) => {
  const pendencia = getPendenciaPorNota(nota.id);
  if (pendencia) {
    setPendenciaSelecionada(pendencia);
    setDialogPendencia(true);
  } else {
    toast.info('Pendência não encontrada para esta nota');
  }
};

// Botão na tabela (ao lado do botão existente)
<Button 
  variant="ghost" 
  size="sm"
  onClick={() => handleVerPendencia(nota)}
  title="Ver Pendência"
>
  <FileSearch className="h-4 w-4" />
</Button>

// Modal no final do componente
<ModalDetalhePendencia
  pendencia={pendenciaSelecionada}
  open={dialogPendencia}
  onClose={() => setDialogPendencia(false)}
  showPaymentButton={false}
/>
```

---

## Resumo das Mudanças

### Funções Novas em estoqueApi.ts
1. `criarNotaComPendencia()` - Cria nota + pendência automaticamente
2. `atualizarStatusPagamento()` - Atualiza status de pagamento

### Melhorias em EstoqueNotasCompra.tsx
- 3 colunas extras: Valor Conferido, Status Conferência, Status Pagamento
- Botão "Ver Progresso" com modal de detalhes
- Barra de progresso visual na tabela

### Melhorias em FinanceiroConferenciaNotas.tsx
- Botão "Ver Pendência" em cada linha
- Integração com ModalDetalhePendencia

---

## Ordem de Implementação

1. Adicionar funções em estoqueApi.ts
2. Modificar EstoqueNotasCompra.tsx (colunas + modal)
3. Modificar FinanceiroConferenciaNotas.tsx (botão ver pendência)
4. Testar fluxo completo

---

## Observações Técnicas

- As funções `validarAparelhoNota`, `verificarConferenciaNota` e demais já existem e funcionam corretamente
- A sincronização entre Estoque e Financeiro via `atualizarPendencia()` já está implementada
- Os componentes `ModalDetalhePendencia` e `ModalFinalizarPagamento` já existem e podem ser reutilizados
- A página `FinanceiroNotasPendencias.tsx` já está completa com todas as funcionalidades solicitadas

