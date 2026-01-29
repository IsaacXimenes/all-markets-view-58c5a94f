
# Plano: Sincronizar Notas de Entrada com Financeiro

## Problema Identificado

O sistema possui **duas fontes de dados paralelas que não estão sincronizadas**:

| Sistema | Arquivo | Armazenamento | Consumido por |
|---------|---------|---------------|---------------|
| **Novo** | `notaEntradaFluxoApi.ts` | `notasEntrada[]` | EstoqueNotaCadastrar, EstoqueNotasPendencias |
| **Antigo** | `pendenciasFinanceiraApi.ts` | `pendenciasFinanceiras[]` | FinanceiroNotasPendencias |

Quando uma nota e lançada via `criarNotaEntrada()`, ela **não cria registro** no sistema antigo `pendenciasFinanceiras[]`, por isso não aparece no Financeiro.

---

## Solução: Adaptar Financeiro para Consumir Novo Sistema

A melhor solução e adaptar `FinanceiroNotasPendencias.tsx` para consumir diretamente as notas do novo sistema (`notaEntradaFluxoApi`), mantendo compatibilidade com o layout atual.

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/utils/notaEntradaFluxoApi.ts` | Adicionar funções | Criar `getNotasParaFinanceiro()` que filtra notas com `atuacaoAtual === 'Financeiro'` |
| `src/pages/FinanceiroNotasPendencias.tsx` | Modificar | Consumir novo sistema ao inves do antigo |

---

## Etapa 1: Adicionar Funções de Consulta para Financeiro

**Arquivo**: `src/utils/notaEntradaFluxoApi.ts`

Adicionar funções para o Financeiro consumir as notas:

```typescript
// Obter notas para o módulo Financeiro
// Exibe notas onde atuacaoAtual === 'Financeiro' OU que precisam de ação financeira
export const getNotasParaFinanceiro = (): NotaEntrada[] => {
  return notasEntrada.filter(nota => {
    // Notas com atuação atual no Financeiro
    if (nota.atuacaoAtual === 'Financeiro') return true;
    
    // Notas aguardando pagamento (mesmo se atuação é Estoque, mostrar para acompanhamento)
    const statusFinanceiros = [
      'Aguardando Pagamento Inicial',
      'Aguardando Pagamento Final',
      'Com Divergencia'
    ];
    if (statusFinanceiros.includes(nota.status)) return true;
    
    // Incluir notas finalizadas para histórico (opcional)
    // if (nota.status === 'Finalizada') return true;
    
    return false;
  });
};

// Converter NotaEntrada para formato compatível com PendenciaFinanceira
// Isso permite manter o layout atual do FinanceiroNotasPendencias
export const converterNotaParaPendencia = (nota: NotaEntrada): {
  id: string;
  notaId: string;
  fornecedor: string;
  valorTotal: number;
  valorConferido: number;
  valorPendente: number;
  valorPago: number;
  statusPagamento: string;
  statusConferencia: string;
  atuacaoAtual: AtuacaoAtual;
  tipoPagamento: TipoPagamentoNota;
  qtdInformada: number;
  qtdCadastrada: number;
  qtdConferida: number;
  dataCriacao: string;
  status: NotaEntradaStatus;
  timeline: TimelineNotaEntrada[];
  podeEditar: boolean;
} => {
  return {
    id: `PEND-${nota.id}`,
    notaId: nota.id,
    fornecedor: nota.fornecedor,
    valorTotal: nota.valorTotal,
    valorConferido: nota.valorConferido,
    valorPendente: nota.valorPendente,
    valorPago: nota.valorPago,
    statusPagamento: nota.valorPago >= nota.valorTotal ? 'Pago' : 
                     nota.valorPago > 0 ? 'Parcial' : 'Aguardando',
    statusConferencia: nota.status,
    atuacaoAtual: nota.atuacaoAtual,
    tipoPagamento: nota.tipoPagamento,
    qtdInformada: nota.qtdInformada,
    qtdCadastrada: nota.qtdCadastrada,
    qtdConferida: nota.qtdConferida,
    dataCriacao: nota.dataCriacao,
    status: nota.status,
    timeline: nota.timeline,
    podeEditar: nota.atuacaoAtual === 'Financeiro'
  };
};
```

---

## Etapa 2: Adaptar FinanceiroNotasPendencias.tsx

**Arquivo**: `src/pages/FinanceiroNotasPendencias.tsx`

Principais alteracões:

1. **Importar novo sistema**:
```typescript
import { 
  getNotasParaFinanceiro, 
  converterNotaParaPendencia,
  registrarPagamento,
  NotaEntrada,
  AtuacaoAtual,
  TipoPagamentoNota
} from '@/utils/notaEntradaFluxoApi';
```

2. **Atualizar estado para consumir novo sistema**:
```typescript
// Antes:
const [pendencias, setPendencias] = useState<PendenciaFinanceira[]>(getPendencias());

// Depois:
const notasFinanceiro = getNotasParaFinanceiro();
const [pendencias, setPendencias] = useState(
  notasFinanceiro.map(converterNotaParaPendencia)
);
```

3. **Adicionar coluna Atuacao Atual**:
- Badge verde "Financeiro" quando pode editar
- Badge cinza "Estoque" quando somente leitura

4. **Adicionar coluna Tipo Pagamento**:
- Exibir "Pos", "Parcial" ou "100% Antecipado"

5. **Bloquear ações quando Atuação != Financeiro**:
- Botão de pagamento desabilitado se `atuacaoAtual !== 'Financeiro'`
- Mostrar tooltip explicando o motivo

6. **Atualizar função de pagamento**:
```typescript
const handleFinalizarPagamento = (dados: DadosPagamento) => {
  if (!pendenciaSelecionada) return;
  
  // Usar novo sistema
  const resultado = registrarPagamento(pendenciaSelecionada.notaId, {
    valor: pendenciaSelecionada.valorPendente,
    formaPagamento: dados.formaPagamento,
    contaPagamento: dados.contaPagamento,
    comprovante: dados.comprovante,
    responsavel: dados.responsavel,
    tipo: pendenciaSelecionada.valorPago > 0 ? 'final' : 'inicial'
  });

  if (resultado) {
    toast.success(`Pagamento da nota ${pendenciaSelecionada.notaId} confirmado!`);
    // Recarregar dados do novo sistema
    const novasNotas = getNotasParaFinanceiro();
    setPendencias(novasNotas.map(converterNotaParaPendencia));
    setDialogPagamento(false);
  }
};
```

---

## Etapa 3: Adicionar Colunas na Tabela

Novas colunas a adicionar:

| Coluna | Descricao | Badge/Formato |
|--------|-----------|---------------|
| Tipo Pagamento | Pos, Parcial, Antecipado | Badge colorido |
| Atuacao Atual | Estoque, Financeiro, Encerrado | Badge com icone |
| Valor Pago | Quanto já foi pago | R$ formatado |
| Qtd Informada/Cadastrada/Conferida | Progresso de quantidade | X / Y / Z |

---

## Resumo das Alteracões

```text
1. notaEntradaFluxoApi.ts
   ├── Adicionar getNotasParaFinanceiro()
   └── Adicionar converterNotaParaPendencia()

2. FinanceiroNotasPendencias.tsx
   ├── Importar novo sistema
   ├── Substituir getPendencias() por getNotasParaFinanceiro()
   ├── Adicionar colunas: Tipo Pagamento, Atuacao Atual
   ├── Bloquear ações quando Atuacao != Financeiro
   └── Usar registrarPagamento() do novo sistema
```

---

## Resultado Esperado

Após implementação:
- Nota lançada no Estoque aparece **instantaneamente** no Financeiro
- Financeiro visualiza a **Atuacao Atual** para saber se pode agir
- Botões bloqueados quando atuação não é do Financeiro
- Fluxo unificado entre módulos via um único sistema (`notaEntradaFluxoApi`)
