
# Plano: Melhorias na Validação de Produtos Pendentes

## Visão Geral

Este plano implementa três melhorias críticas para o fluxo de validação de produtos:

1. **Barra de progresso visual** na coluna "Nota de Origem" da tabela de Produtos Pendentes
2. **Validação em lote** para múltiplos aparelhos da mesma nota
3. **Upload real de comprovantes** substituindo campos de URL por upload de arquivos

---

## Fase 1: Barra de Progresso na Coluna "Nota de Origem"

### Arquivo: `src/pages/EstoqueProdutosPendentes.tsx`

**Modificações:**

1. **Importar componente Progress e função de pendências:**
```typescript
import { Progress } from '@/components/ui/progress';
import { getPendenciaPorNota } from '@/utils/pendenciasFinanceiraApi';
```

2. **Criar função para obter progresso da nota:**
```typescript
const getNotaProgresso = (notaOrigemId: string) => {
  if (!notaOrigemId) return null;
  const pendencia = getPendenciaPorNota(notaOrigemId);
  if (!pendencia) return null;
  return {
    percentual: pendencia.percentualConferencia,
    conferidos: pendencia.aparelhosConferidos,
    total: pendencia.aparelhosTotal
  };
};
```

3. **Modificar coluna "Nota de Origem" (linhas 483-494):**

| Antes | Depois |
|-------|--------|
| Badge simples ou texto NC-XXXX | Badge + barra de progresso + texto X/Y |

**Novo layout da célula:**
```text
┌─────────────────────────────────────┐
│ [Urgência] ou NC-2025-0008          │
│ ████████░░░░ 42%                    │
│ 2/3 conferidos                      │
└─────────────────────────────────────┘
```

**Código da célula atualizada:**
```typescript
<TableCell>
  {(produto as any).notaOrigemId ? (
    <div className="space-y-1">
      {/* Badge ou ID */}
      {(produto as any).notaOrigemId.startsWith('URG') ? (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
          Urgência
        </Badge>
      ) : (
        <span className="font-mono text-xs">{(produto as any).notaOrigemId}</span>
      )}
      {/* Barra de progresso */}
      {(() => {
        const progresso = getNotaProgresso((produto as any).notaOrigemId);
        if (progresso) {
          return (
            <div className="space-y-1">
              <Progress value={progresso.percentual} className="h-1.5" />
              <span className="text-xs text-muted-foreground">
                {progresso.conferidos}/{progresso.total} conferidos
              </span>
            </div>
          );
        }
        return null;
      })()}
    </div>
  ) : (
    <span className="text-muted-foreground">—</span>
  )}
</TableCell>
```

---

## Fase 2: Validação em Lote

### Arquivo: `src/pages/EstoqueProdutosPendentes.tsx`

**Adicionar funcionalidades:**

1. **Estado para seleção múltipla:**
```typescript
const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
const [dialogValidacaoLote, setDialogValidacaoLote] = useState(false);
```

2. **Checkbox na tabela para seleção:**
- Nova coluna com checkbox no header e em cada linha
- Checkbox master para selecionar/deselecionar todos da mesma nota

3. **Botão "Validar Selecionados" no header da tabela:**
```text
┌─────────────────────────────────────────────────────────────────┐
│  Produtos Pendentes de Conferência    [Validar X Selecionados]  │
└─────────────────────────────────────────────────────────────────┘
```

4. **Funções de validação em lote:**
```typescript
const handleSelectProduct = (productId: string) => { ... };
const handleSelectAllFromNota = (notaId: string) => { ... };
const handleValidarLote = () => { ... };
```

### Arquivo: `src/utils/estoqueApi.ts`

**Nova função para validação em lote:**
```typescript
export const validarAparelhosEmLote = (
  notaId: string, 
  aparelhoImeis: string[], 
  responsavel: string
): { sucesso: boolean; validados: number; erros: string[] }
```

### Modal de Validação em Lote

**Campos:**
- Lista de produtos selecionados (resumo)
- Responsável pela conferência (Select obrigatório)
- Observações gerais (Textarea opcional)
- Botão "Confirmar Validação"

**Layout:**
```text
┌─────────────────────────────────────────────────────────────────┐
│  ✅ VALIDAR PRODUTOS EM LOTE                                   │
├─────────────────────────────────────────────────────────────────┤
│  Nota: NC-2025-0008                                             │
│  Produtos selecionados: 3                                       │
│  ┌───────────────────────────────────────┐                     │
│  │ • iPhone 15 Pro (IMEI: 352...024)     │                     │
│  │ • iPhone 15 Pro Max (IMEI: 352...025) │                     │
│  │ • iPhone 14 Pro (IMEI: 352...026)     │                     │
│  └───────────────────────────────────────┘                     │
│                                                                 │
│  Responsável Conferência *                                      │
│  [Ana Costa ▼]                                                  │
│                                                                 │
│  Observações                                                    │
│  ┌───────────────────────────────────────┐                     │
│  │ Todos os aparelhos conferidos OK      │                     │
│  └───────────────────────────────────────┘                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    [Cancelar] [Confirmar Validação]             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fase 3: Upload Real de Comprovantes

### Arquivos a Modificar

1. **`src/pages/FinanceiroNotasPendencias.tsx`** - Modal de pagamento
2. **`src/pages/EstoqueNotasCompra.tsx`** - Modal de urgência (foto obrigatória)

### Componente de Upload

**Criar área de drag-and-drop com preview:**

```text
┌─────────────────────────────────────────────────────────────────┐
│  Comprovante *                                                  │
│  ┌───────────────────────────────────────┐                     │
│  │  📎 Arraste ou clique para upload     │                     │
│  │     PDF, JPG ou PNG (máx 5MB)         │                     │
│  └───────────────────────────────────────┘                     │
│                                                                 │
│  OU ─────────────────────────────────────                      │
│                                                                 │
│  [🔗 Colar URL do comprovante]                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Preview do arquivo selecionado:**
```text
┌─────────────────────────────────────────────────────────────────┐
│  ┌────────┐                                                     │
│  │ 📄     │  comprovante_nc0008.pdf                            │
│  │        │  156 KB                                             │
│  └────────┘  [❌ Remover]                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Implementação do Upload

**Estado do formulário atualizado:**
```typescript
const [pagamentoForm, setPagamentoForm] = useState({
  // ... outros campos
  comprovante: '',           // URL ou base64
  comprovanteFile: null,     // File object
  comprovanteNome: '',       // Nome do arquivo
  comprovantePreview: ''     // URL de preview (para imagens)
});
```

**Handler de upload:**
```typescript
const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  // Validar tipo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    toast.error('Formato não suportado. Use JPG, PNG, WebP ou PDF.');
    return;
  }
  
  // Validar tamanho (5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.error('Arquivo muito grande. Máximo 5MB.');
    return;
  }
  
  // Converter para base64 para armazenamento mockado
  const reader = new FileReader();
  reader.onload = () => {
    setPagamentoForm(prev => ({
      ...prev,
      comprovante: reader.result as string,
      comprovanteFile: file,
      comprovanteNome: file.name,
      comprovantePreview: file.type.startsWith('image/') ? reader.result as string : ''
    }));
  };
  reader.readAsDataURL(file);
};
```

---

## Fase 4: Dados Mockados para Pendências

### Arquivo: `src/utils/estoqueApi.ts`

**Atualizar notas mockadas para incluir campos de conferência:**

```typescript
// NC-2025-0006 - 1 produto, 0% conferido
{
  id: 'NC-2025-0006',
  // ... campos existentes
  origem: 'Normal',
  valorConferido: 0,
  valorPendente: 6400.00,
  statusPagamento: 'Aguardando Conferência',
  statusConferencia: 'Em Conferência',
  produtos: [
    { 
      id: 'PROD-NC6-001',
      marca: 'Apple', 
      modelo: 'iPhone 15 Pro', 
      // ... outros campos
      statusConferencia: 'Pendente'
    }
  ],
  timeline: [
    {
      id: 'TL-NC6-001',
      data: '2024-11-23T09:00:00Z',
      tipo: 'entrada',
      titulo: 'Nota Cadastrada',
      descricao: 'Nota de entrada cadastrada no sistema',
      responsavel: 'Sistema'
    }
  ]
}

// NC-2025-0007 - 2 produtos, 50% conferido (1/2)
{
  id: 'NC-2025-0007',
  // ... campos existentes
  origem: 'Normal',
  valorConferido: 3400.00,
  valorPendente: 1600.00,
  statusPagamento: 'Aguardando Conferência',
  statusConferencia: 'Em Conferência',
  produtos: [
    { 
      id: 'PROD-NC7-001',
      // iPhone 14 Vermelho
      statusConferencia: 'Conferido',
      dataConferencia: '2024-11-25T14:30:00Z',
      responsavelConferencia: 'Ana Costa'
    },
    { 
      id: 'PROD-NC7-002',
      // iPhone 11 Preto
      statusConferencia: 'Pendente'
    }
  ],
  timeline: [
    {
      id: 'TL-NC7-002',
      data: '2024-11-25T14:30:00Z',
      tipo: 'validacao',
      titulo: 'Aparelho Validado',
      descricao: 'iPhone 14 Vermelho conferido - R$ 3.400,00',
      responsavel: 'Ana Costa'
    },
    {
      id: 'TL-NC7-001',
      data: '2024-11-24T09:00:00Z',
      tipo: 'entrada',
      titulo: 'Nota Cadastrada',
      descricao: 'Nota de entrada cadastrada',
      responsavel: 'Sistema'
    }
  ]
}

// NC-2025-0008 - 3 produtos, 66% conferido (2/3)
{
  id: 'NC-2025-0008',
  // ... campos existentes
  origem: 'Normal',
  valorConferido: 12000.00,
  valorPendente: 7200.00,
  statusPagamento: 'Aguardando Conferência',
  statusConferencia: 'Em Conferência',
  produtos: [
    { 
      id: 'PROD-NC8-001',
      // iPhone 15 Pro Max #1
      statusConferencia: 'Conferido',
      dataConferencia: '2024-11-26T10:15:00Z',
      responsavelConferencia: 'Pedro Lima'
    },
    { 
      id: 'PROD-NC8-002',
      // iPhone 15 Pro Max #2
      statusConferencia: 'Pendente'
    },
    { 
      id: 'PROD-NC8-003',
      // iPhone 14 Pro
      statusConferencia: 'Conferido',
      dataConferencia: '2024-11-26T14:30:00Z',
      responsavelConferencia: 'Ana Costa'
    }
  ],
  timeline: [...]
}
```

### Nota de Urgência Mockada

```typescript
// URG-2025-0001 - Urgência com foto e vendedor
{
  id: 'URG-2025-0001',
  data: '2024-11-26',
  numeroNota: 'URG-001',
  fornecedor: 'TechSupply Urgente',
  valorTotal: 3200.00,
  status: 'Pendente',
  origem: 'Urgência',
  statusUrgencia: 'Aguardando Financeiro',
  vendedorRegistro: 'Carlos Vendedor',
  fotoComprovante: 'data:image/jpeg;base64,...', // URL ou base64 simulado
  valorConferido: 0,
  valorPendente: 3200.00,
  statusPagamento: 'Aguardando Conferência',
  statusConferencia: 'Em Conferência',
  produtos: [
    {
      id: 'PROD-URG1-001',
      marca: 'Apple',
      modelo: 'iPhone 14 Pro Max',
      cor: 'Roxo Profundo',
      imei: '352123456789030',
      tipo: 'Seminovo',
      tipoProduto: 'Aparelho',
      quantidade: 1,
      valorUnitario: 3200.00,
      valorTotal: 3200.00,
      saudeBateria: 88,
      statusConferencia: 'Pendente'
    }
  ],
  timeline: [
    {
      id: 'TL-URG1-001',
      data: '2024-11-26T16:45:00Z',
      tipo: 'entrada',
      titulo: 'Urgência Registrada',
      descricao: 'Nota de urgência registrada por Carlos Vendedor',
      responsavel: 'Carlos Vendedor'
    }
  ]
}
```

---

## Fase 5: Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/EstoqueProdutosPendentes.tsx` | Barra de progresso + seleção múltipla + validação em lote |
| `src/pages/FinanceiroNotasPendencias.tsx` | Upload real de comprovantes no modal de pagamento |
| `src/pages/EstoqueNotasCompra.tsx` | Upload real de foto no modal de urgência |
| `src/utils/estoqueApi.ts` | Dados mockados + função validarAparelhosEmLote |
| `src/utils/pendenciasFinanceiraApi.ts` | Atualizar inicializarPendenciasDeNotas com dados novos |

---

## Resultado Esperado

Após implementação:

1. **Produtos Pendentes** mostra progresso visual de cada nota na coluna "Nota de Origem"
2. **Checkbox de seleção** permite selecionar múltiplos produtos para validação em lote
3. **Upload de arquivos** funciona com drag-and-drop, validação de tipo/tamanho e preview
4. **Dados mockados** incluem notas em diferentes estados de conferência (0%, 50%, 66%)
5. **Nota de urgência mockada** com foto de exemplo e vendedor responsável

---

## Considerações Técnicas

### Armazenamento de Arquivos
- Como o sistema usa dados mockados, arquivos serão armazenados como base64 no estado/localStorage
- Preview de imagens funcionará nativamente com base64
- PDFs mostrarão apenas o nome do arquivo

### Performance
- useMemo para cálculos de progresso
- Debounce na seleção múltipla para evitar re-renders excessivos

### UX
- Toast de confirmação após validação em lote
- Indicador de loading durante processamento
- Confirmação antes de validar múltiplos produtos
