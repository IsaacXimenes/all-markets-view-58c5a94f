
# Plano de Implementação: Correção RH Feedback + Nova Aba "Movimentações - Matriz"

---

## Parte 1: Correção do Modal "Registrar FeedBack" no RH

### Problema Identificado
No modal de registro de feedback (RHFeedback.tsx), quando o usuário seleciona um colaborador, a loja exibida vem do `feedbackApi.ts` que usa a API antiga (`cadastrosApi`). O campo de loja não está usando o `useCadastroStore` centralizado.

### Solução
Corrigir o `feedbackApi.ts` para utilizar os dados do `useCadastroStore` em vez do `cadastrosApi` antigo.

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/utils/feedbackApi.ts` | Substituir uso de `cadastrosApi` pelo `useCadastroStore` |
| `src/pages/RHFeedback.tsx` | Ajustar se necessário para garantir nomenclatura correta |

### Detalhes Técnicos

**feedbackApi.ts - Mudanças:**
- Remover importações do `cadastrosApi` (linhas 3-4)
- Criar funções que recebem os dados das lojas e colaboradores como parâmetro
- Ou: criar um wrapper que usa os dados do localStorage diretamente

---

## Parte 2: Nova Aba "Movimentações - Matriz" no Estoque

### Objetivo
Criar um sistema de controle de saída de aparelhos da Matriz para outras lojas, com timer de 22 horas para conferência de retorno.

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/EstoqueMovimentacoesMatriz.tsx` | Nova página com layout em 3 quadros |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/utils/estoqueApi.ts` | Adicionar interfaces e funções para movimentações da Matriz |
| `src/components/layout/EstoqueLayout.tsx` | Adicionar nova aba "Movimentações - Matriz" |
| `src/App.tsx` | Adicionar rota `/estoque/movimentacoes-matriz` |

---

## Detalhes Técnicos - Movimentações Matriz

### 1. Novas Interfaces (estoqueApi.ts)

```typescript
// Interface para item individual da movimentação
interface MovimentacaoMatrizItem {
  aparelhoId: string;
  imei: string;
  modelo: string;
  cor: string;
  statusItem: 'Enviado' | 'Devolvido' | 'Vendido';
  dataHoraRetorno?: string;
  responsavelRetorno?: string;
}

// Interface principal da movimentação
interface MovimentacaoMatriz {
  id: string;
  dataHoraLancamento: string;
  responsavelLancamento: string;
  lojaOrigemId: string; // Sempre Matriz
  lojaDestinoId: string;
  statusMovimentacao: 'Aguardando Retorno' | 'Concluída' | 'Retorno Atrasado';
  dataHoraLimiteRetorno: string; // +22 horas
  itens: MovimentacaoMatrizItem[];
  timeline: TimelineEntry[];
}
```

### 2. Novas Funções (estoqueApi.ts)

| Função | Descrição |
|--------|-----------|
| `criarMovimentacaoMatriz()` | Registra nova movimentação, atualiza `lojaAtualId` dos produtos |
| `registrarRetornoItemMatriz()` | Marca item como devolvido, atualiza produto |
| `getMovimentacoesMatriz()` | Lista movimentações com filtros |
| `getMovimentacaoMatrizById()` | Detalhes de uma movimentação |
| `verificarRetornosAtrasados()` | Atualiza status para 'Retorno Atrasado' |

### 3. Modificar Interface Produto

Adicionar campo `lojaAtualId` ao tipo `Produto`:
```typescript
interface Produto {
  // ... campos existentes ...
  lojaAtualId?: string; // Loja onde o produto está fisicamente
}
```

### 4. Estender TimelineEntry

Adicionar novos tipos:
```typescript
tipo: '...' | 'saida_matriz' | 'retorno_matriz' | 'venda_matriz';
```

---

## Layout da Página EstoqueMovimentacoesMatriz.tsx

### Estrutura Visual (3 Quadros)

```text
┌─────────────────────────────────────────────────────────────────┐
│ QUADRO 1: Cabeçalho da Movimentação (Auto-preenchido)           │
│ ┌─────────────┬─────────────────────┬───────────────────────┐   │
│ │ ID Mov.     │ Data/Hora Lanç.     │ Responsável           │   │
│ │ MM-XXXXX    │ 01/02/2026 14:30    │ João Silva            │   │
│ └─────────────┴─────────────────────┴───────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ QUADRO 2: Lançamento de Aparelhos (Saída da Matriz)             │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Loja Destino: [Select - Lojas exceto Matriz]              │   │
│ │                                                           │   │
│ │ [Buscar IMEI/Modelo...] [Adicionar +]                     │   │
│ │                                                           │   │
│ │ ┌─────────────┬────────────────┬──────┬────────┐          │   │
│ │ │ IMEI        │ Modelo         │ Cor  │ Ação   │          │   │
│ │ ├─────────────┼────────────────┼──────┼────────┤          │   │
│ │ │ 35-2123...  │ iPhone 15 Pro  │ Preto│ [X]    │          │   │
│ │ │ 35-2124...  │ iPhone 14      │ Azul │ [X]    │          │   │
│ │ └─────────────┴────────────────┴──────┴────────┘          │   │
│ │                                                           │   │
│ │ [Registrar Lançamento]                                    │   │
│ └───────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ QUADRO 3: Aparelhos em Retorno (Conferência)                    │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Status: Aguardando Retorno          Timer: 18:45:32 🟢    │   │
│ │                                                           │   │
│ │ [Detalhar] [Editar - Conferir Retorno]                    │   │
│ │                                                           │   │
│ │ ┌─────────────┬────────────────┬──────┬──────────┬──────┐ │   │
│ │ │ IMEI        │ Modelo         │ Cor  │ Status   │ Ação │ │   │
│ │ ├─────────────┼────────────────┼──────┼──────────┼──────┤ │   │
│ │ │ 35-2123...  │ iPhone 15 Pro  │ Preto│ Enviado  │[Dev] │ │   │
│ │ │ 35-2124...  │ iPhone 14      │ Azul │ Devolvido│  -   │ │   │
│ │ └─────────────┴────────────────┴──────┴──────────┴──────┘ │   │
│ └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Timer de 22 Horas - Lógica

### Cores do Timer
| Tempo Restante | Cor | Classe CSS |
|----------------|-----|------------|
| > 4 horas | Verde | `text-green-500` |
| 1-4 horas | Amarelo | `text-yellow-500` |
| < 1 hora | Vermelho | `text-red-500` |
| Expirado | Vermelho + Piscando | `text-red-600 animate-pulse` |

### Implementação
```typescript
const calcularTempoRestante = (dataLimite: string) => {
  const agora = new Date();
  const limite = new Date(dataLimite);
  const diff = limite.getTime() - agora.getTime();
  
  if (diff <= 0) return { expirado: true, texto: '00:00:00', cor: 'red' };
  
  const horas = Math.floor(diff / (1000 * 60 * 60));
  const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const segundos = Math.floor((diff % (1000 * 60)) / 1000);
  
  return {
    expirado: false,
    texto: `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`,
    cor: horas > 4 ? 'green' : horas >= 1 ? 'yellow' : 'red'
  };
};
```

---

## Fluxo de Dados

### Lançamento da Movimentação
1. Usuário seleciona loja destino
2. Busca aparelhos disponíveis na Matriz
3. Adiciona aparelhos à lista
4. Clica "Registrar Lançamento"
5. Sistema:
   - Cria `MovimentacaoMatriz`
   - Atualiza `lojaAtualId` de cada produto para loja destino
   - Adiciona timeline `saida_matriz`
   - Inicia timer de 22 horas

### Conferência de Retorno
1. Usuário clica "Editar" na movimentação
2. Visualiza lista de itens
3. Para cada item retornado, clica "Produto Devolvido"
4. Sistema:
   - Atualiza `statusItem` para 'Devolvido'
   - Atualiza `lojaAtualId` do produto para Matriz
   - Adiciona timeline `retorno_matriz`
5. Quando todos devolvidos/vendidos: status = 'Concluída'

---

## Atualização do EstoqueLayout.tsx

Adicionar nova aba:
```typescript
const tabs = [
  // ... tabs existentes ...
  { name: 'Movimentações - Matriz', href: '/estoque/movimentacoes-matriz', icon: Building },
];
```

---

## Nova Rota (App.tsx)

```typescript
import EstoqueMovimentacoesMatriz from './pages/EstoqueMovimentacoesMatriz';

// Na seção de rotas:
<Route path="/estoque/movimentacoes-matriz" element={<EstoqueMovimentacoesMatriz />} />
```

---

## Regras de Negócio Implementadas

1. **Matriz como Origem Fixa**: A loja de origem é sempre a Matriz
2. **Transferência Imediata**: `lojaAtualId` muda no momento do lançamento
3. **Timer de 22h**: Prazo fixo a partir do lançamento
4. **Status Automático**: 'Retorno Atrasado' quando timer expira
5. **Rastreamento Individual**: Cada aparelho tem seu próprio status
6. **Integração com Vendas**: Se vendido na loja destino, status = 'Vendido'

---

## Ordem de Implementação

1. Correção do feedbackApi.ts (Parte 1)
2. Adicionar interfaces em estoqueApi.ts
3. Adicionar funções de CRUD em estoqueApi.ts
4. Criar EstoqueMovimentacoesMatriz.tsx
5. Atualizar EstoqueLayout.tsx
6. Adicionar rota em App.tsx
7. Testar fluxo completo

