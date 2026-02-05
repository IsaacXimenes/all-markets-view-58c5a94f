
# Plano: Módulo de Gestão Administrativa - Conferência de Caixa

## Visão Geral

Criar um novo módulo chamado **"Gestão Administrativa"** destinado a gestores para conferência de caixa e conciliação financeira diária. O módulo será 100% sincronizado com as vendas do sistema.

---

## 1. Estrutura do Módulo

### Novos Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/GestaoAdministrativa.tsx` | Página principal - Conferência Diária |
| `src/components/layout/GestaoAdministrativaLayout.tsx` | Layout com tabs de navegação |
| `src/utils/gestaoAdministrativaApi.ts` | API para dados de conferência, ajustes e logs |

### Modificações em Arquivos Existentes

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Adicionar rota `/gestao-administrativa` |
| `src/components/layout/Sidebar.tsx` | Adicionar item "Gestão Administrativa" com ícone `ClipboardCheck` |

---

## 2. Estrutura de Dados

### 2.1 Interface de Conferência Diária

```typescript
interface ConferenciaDiaria {
  id: string;
  data: string; // YYYY-MM-DD
  lojaId: string;
  
  // Totais consolidados por método de pagamento
  totaisPorMetodo: {
    pix: { bruto: number; conferido: boolean; conferidoPor?: string; dataConferencia?: string };
    debito: { bruto: number; conferido: boolean; conferidoPor?: string; dataConferencia?: string };
    credito: { bruto: number; conferido: boolean; conferidoPor?: string; dataConferencia?: string };
    dinheiro: { bruto: number; conferido: boolean; conferidoPor?: string; dataConferencia?: string };
    transferencia: { bruto: number; conferido: boolean; conferidoPor?: string; dataConferencia?: string };
  };
  
  vendasTotal: number;
  statusConferencia: 'Não Conferido' | 'Parcial' | 'Conferido';
  
  // Ajustes/Divergências
  ajustes: AjusteDivergencia[];
}

interface AjusteDivergencia {
  id: string;
  metodoPagamento: string;
  valorDiferenca: number;
  justificativa: string;
  registradoPor: string;
  dataRegistro: string;
}

interface LogAuditoria {
  id: string;
  conferenciaId: string;
  acao: 'conferencia_marcada' | 'conferencia_desmarcada' | 'ajuste_registrado';
  metodoPagamento?: string;
  usuarioId: string;
  usuarioNome: string;
  dataHora: string;
  detalhes: string;
}
```

---

## 3. Interface do Usuário

### 3.1 Filtros Principais (Topo)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [Competência: Fevereiro/2026 ▼]  [Loja: Todas ▼]  [Vendedor: Todos ▼]   │
│                                                                          │
│  📊 Cards de Resumo:                                                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐            │
│  │ Total Bruto│ │ Conferido  │ │ Pendente   │ │ Dias Abertos│            │
│  │R$ 150.000  │ │R$ 120.000  │ │R$ 30.000   │ │    5       │            │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘            │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Tabela de Conferência Diária

| Data | Status | Vendas (Bruto) | PIX | ✓ PIX | Débito | ✓ Deb | Crédito | ✓ Cred | Dinheiro | ✓ Din | Ações |
|------|--------|----------------|-----|-------|--------|-------|---------|--------|----------|-------|-------|
| 05/02 | 🟡 Parcial | R$ 15.000 | R$ 5.000 | ✅ | R$ 3.000 | ❌ | R$ 7.000 | ✅ | R$ 0 | - | 👁️ ✍️ |
| 04/02 | 🟢 Conferido | R$ 12.500 | R$ 4.000 | ✅ | R$ 2.500 | ✅ | R$ 6.000 | ✅ | R$ 0 | - | 👁️ |

**Cores das Linhas:**
- 🔴 `bg-red-500/10` - Não Conferido
- 🟡 `bg-yellow-500/10` - Parcial
- 🟢 `bg-green-500/10` - Conferido

### 3.3 Modal de Drill-Down (Detalhes do Dia)

Ao clicar em um valor ou no botão "Visualizar":

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Vendas do Dia 05/02/2026 - Loja Matriz                                 │
│  Método: PIX (R$ 5.000,00)                                              │
├─────────────────────────────────────────────────────────────────────────┤
│  ID Venda    │ Cliente       │ Vendedor        │ Valor                  │
│  VEN-2025-01 │ João Silva    │ Carlos Vendedor │ R$ 2.500,00            │
│  VEN-2025-02 │ Maria Santos  │ Ana Vendedora   │ R$ 2.500,00            │
├─────────────────────────────────────────────────────────────────────────┤
│  Total Bruto: R$ 5.000,00                                               │
│  Taxa Estimada (Cartão): -                                              │
│  Valor Líquido: R$ 5.000,00                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Modal de Ajuste/Divergência

Ao clicar no botão ✍️:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Registrar Divergência - 05/02/2026                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Método de Pagamento: [PIX ▼]                                           │
│  Valor da Diferença:  [R$ __________]                                   │
│  Justificativa:       [________________________]                        │
│                       [________________________]                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                          [Cancelar]  [Salvar Ajuste]    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementação Técnica

### 4.1 API de Gestão Administrativa (`gestaoAdministrativaApi.ts`)

```typescript
// Consolidar vendas por dia, loja e método de pagamento
export const consolidarVendasPorDia = (
  competencia: string,   // "2026-02"
  lojaId?: string,
  vendedorId?: string
): ConferenciaDiaria[] => {
  // 1. Filtrar vendas por competência
  // 2. Agrupar por data
  // 3. Para cada dia, somar valores por método de pagamento
  // 4. Verificar status de conferência salvo no localStorage
};

// Obter vendas detalhadas de um dia/método
export const getVendasPorDiaMetodo = (
  data: string,
  lojaId: string,
  metodoPagamento: string
): VendaDrillDown[] => {
  // Filtrar vendas e retornar com dados para o modal
};

// Marcar/Desmarcar conferência
export const toggleConferencia = (
  data: string,
  lojaId: string,
  metodoPagamento: string,
  usuarioId: string,
  usuarioNome: string
): void => {
  // Salvar no localStorage e registrar log
};

// Registrar ajuste/divergência
export const registrarAjuste = (
  data: string,
  lojaId: string,
  ajuste: Omit<AjusteDivergencia, 'id' | 'dataRegistro'>
): void => {
  // Salvar ajuste e registrar log
};

// Obter logs de auditoria
export const getLogsAuditoria = (
  competencia?: string,
  lojaId?: string
): LogAuditoria[] => {
  // Retornar logs filtrados
};
```

### 4.2 Layout do Módulo (`GestaoAdministrativaLayout.tsx`)

```typescript
const tabs = [
  { name: 'Conferência Diária', href: '/gestao-administrativa', icon: ClipboardCheck },
  { name: 'Logs de Auditoria', href: '/gestao-administrativa/logs', icon: History },
];
```

### 4.3 Controle de Acesso

O módulo deve verificar se o usuário logado é gestor:

```typescript
// No componente principal
const { colaboradores } = useCadastroStore();
const { user } = useAuthStore();

const colaboradorLogado = colaboradores.find(c => c.id === user?.colaborador?.id);
const ehGestor = colaboradorLogado?.eh_gestor ?? false;

if (!ehGestor) {
  return <Alert>Acesso restrito a gestores.</Alert>;
}
```

---

## 5. Fluxo de Conferência

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      Gestor acessa o módulo                              │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            Seleciona Competência (mês/ano) e Loja                        │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│           Sistema consolida vendas por dia automaticamente               │
│              (100% sincronizado com base de vendas)                      │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                Para cada método de pagamento do dia:                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │ Visualizar  │    │   Conferir  │    │  Registrar  │                  │
│  │  Detalhes   │    │  (Checkbox) │    │   Ajuste    │                  │
│  └─────────────┘    └─────────────┘    └─────────────┘                  │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Todas as ações são auditadas                          │
│         (quem fez, quando fez, qual método, qual valor)                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Persistência de Dados

### localStorage Keys

| Key | Descrição |
|-----|-----------|
| `gestao_conferencia_{YYYY-MM}_{lojaId}` | Status de conferência por dia |
| `gestao_ajustes_{YYYY-MM}_{lojaId}` | Ajustes/divergências registrados |
| `gestao_logs_auditoria` | Logs de todas as ações |

---

## 7. Resumo de Arquivos

### Novos Arquivos (3)

1. **`src/pages/GestaoAdministrativa.tsx`** (~400 linhas)
   - Página principal com tabela de conferência diária
   - Filtros de competência, loja e vendedor
   - Cards de resumo (Total, Conferido, Pendente, Dias)
   - Modais de drill-down e ajuste

2. **`src/components/layout/GestaoAdministrativaLayout.tsx`** (~35 linhas)
   - Layout padrão com TabsNavigation

3. **`src/utils/gestaoAdministrativaApi.ts`** (~250 linhas)
   - Funções de consolidação de vendas
   - Gerenciamento de conferências
   - Registro de ajustes e logs

### Arquivos a Modificar (2)

4. **`src/App.tsx`**
   - Adicionar import e rota

5. **`src/components/layout/Sidebar.tsx`**
   - Adicionar item de menu

---

## 8. Considerações de Performance

- A consolidação de vendas usa `useMemo` para evitar recálculos desnecessários
- Filtros aplicados antes da agregação para reduzir volume de dados
- Índices por data e loja para buscas rápidas
- Debounce em filtros de texto (se aplicável)

---

## 9. Padrões Seguidos

- Layout consistente com outros módulos (FinanceiroLayout como referência)
- Tabela com scroll horizontal (TableScrollArea)
- Cores de status conforme `statusColors.ts`
- Formatação monetária brasileira (R$ XXX.XXX,XX)
- Checkboxes para conferência com feedback visual
- Modais para detalhes e ações
- Logs de auditoria para rastreabilidade
