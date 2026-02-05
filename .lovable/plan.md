
# Plano: Melhorias no Módulo de Estoque - Movimentações

## Visão Geral

Este plano implementa melhorias significativas nas telas de **Movimentações Matriz**, **Movimentações Aparelhos** e **Movimentações Acessórios**, focando em validação de IMEI, gestão de status dinâmica, logs de auditoria e padronização de campos.

---

## 1. Movimentações - Matriz

### 1.1 Leitura de IMEI via Câmera (Registrar Devolução + Nova Movimentação)

**Arquivos:** `EstoqueMovimentacaoMatrizDetalhes.tsx`, `EstoqueNovaMovimentacaoMatriz.tsx`

**Alterações:**
- Adicionar botão de câmera ao lado do campo IMEI no modal de devolução
- Importar e utilizar o componente `BarcodeScanner` existente
- Aplicar máscara `formatIMEI` nos itens pendentes listados no modal
- Limpar campo IMEI ao fechar o modal (cancelar ou confirmar)

**Estrutura do Input com Câmera:**
```text
┌─────────────────────────────────────────────────┐
│ IMEI do Aparelho *                              │
│ ┌─────────────────────────────────┐ ┌────────┐  │
│ │ Informe ou escaneie o IMEI...   │ │ 📷     │  │
│ └─────────────────────────────────┘ └────────┘  │
└─────────────────────────────────────────────────┘
```

### 1.2 Nova Lógica de Status Dinâmico

**Arquivo:** `estoqueApi.ts`

Substituir os 3 status atuais por 4 novos status:

| Status Atual | Novo Status |
|--------------|-------------|
| `Aguardando Retorno` | `Pendente` |
| `Retorno Atrasado` | `Atrasado` |
| `Concluída` | `Finalizado - Dentro do Prazo` ou `Finalizado - Atrasado` |

**Lógica de Transição:**
```text
1. Movimentação criada → status = 'Pendente'
2. Se horário atual > 22:00 do dia limite e status = 'Pendente':
   → status muda automaticamente para 'Atrasado'
3. Ao finalizar conferência de todos os itens:
   - Se status era 'Pendente' e horário < 22:00 → 'Finalizado - Dentro do Prazo'
   - Se status era 'Atrasado' OU horário >= 22:00 → 'Finalizado - Atrasado'
```

**Interface Atualizada:**
```typescript
export interface MovimentacaoMatriz {
  // ... campos existentes
  statusMovimentacao: 'Pendente' | 'Atrasado' | 'Finalizado - Dentro do Prazo' | 'Finalizado - Atrasado';
}
```

### 1.3 Quadro de Logs de Movimentação

**Arquivo:** `EstoqueMovimentacaoMatrizDetalhes.tsx`

Adicionar um **4º quadro** abaixo dos 3 existentes (largura total):

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ 📜 Histórico de Ações                                          [Badge n] │
├──────────────────────────────────────────────────────────────────────────┤
│ 05/02/2025 14:30 - João Silva                                            │
│   ✓ Item iPhone 14 Pro (IMEI: 35-123456-789012-3) conferido             │
├──────────────────────────────────────────────────────────────────────────┤
│ 05/02/2025 10:00 - Sistema                                               │
│   ⚠️ Status alterado para "Atrasado" (horário limite ultrapassado)       │
├──────────────────────────────────────────────────────────────────────────┤
│ 04/02/2025 18:30 - Maria Santos                                          │
│   📦 Movimentação criada com 5 aparelhos                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

**Dados exibidos de `movimentacao.timeline`:**
- Data/Hora da ação
- Usuário responsável
- Descrição da ação com ícone contextual

### 1.4 Comportamento de Movimentação Matriz (SEM status "Em movimentação")

**Arquivo:** `estoqueApi.ts` → função `criarMovimentacaoMatriz`

**Mudança Crítica:**
- **REMOVER** a atribuição de `statusMovimentacao = 'Em movimentação'` nos produtos
- Apenas atualizar `lojaAtualId` para a loja destino imediatamente
- Produto continua disponível para venda na loja destino
- A movimentação é apenas um registro de rastreabilidade

**Antes:**
```typescript
produto.statusMovimentacao = 'Em movimentação';
produto.movimentacaoId = novaMovimentacao.id;
```

**Depois:**
```typescript
// Apenas atualizar localização física (sem bloqueio)
produto.lojaAtualId = dados.lojaDestinoId;
// Manter referência para rastreabilidade, mas sem bloquear
produto.movimentacaoId = novaMovimentacao.id;
```

### 1.5 Leitura de IMEI via Câmera ao Lançar Novo Registro

**Arquivo:** `EstoqueNovaMovimentacaoMatriz.tsx`

Adicionar opção de scanner no modal de seleção de aparelhos:
- Botão "Escanear IMEI" que abre `BarcodeScanner`
- Ao ler, busca o produto na lista e adiciona automaticamente

### 1.6 Limpeza de Modal de Devolução

**Arquivo:** `EstoqueMovimentacaoMatrizDetalhes.tsx`

Garantir que ao fechar o modal (por qualquer meio):
```typescript
const handleCloseModal = () => {
  setImeiDevolucao('');
  setResponsavelDevolucao('');
  setShowDevolucaoModal(false);
};
```

---

## 2. Movimentações - Aparelhos

### 2.1 Leitura de IMEI via Câmera

**Arquivo:** `EstoqueMovimentacoes.tsx`

- Adicionar botão de câmera no campo de busca de IMEI (filtro da tabela)
- Adicionar botão de câmera no modal "Buscar Produto no Estoque"
- Utilizar o componente `BarcodeScanner` existente

### 2.2 Campos Origem e Destino Sincronizados

**Arquivo:** `EstoqueMovimentacoes.tsx`

O código atual já utiliza `AutocompleteLoja` para os campos - verificar se está filtrando apenas lojas ativas.

**Validação:**
- Filtros Origem/Destino: Já usam `AutocompleteLoja`
- Modal de Registro: Origem é preenchida automaticamente, Destino usa `AutocompleteLoja`

Nenhuma alteração necessária aqui, apenas validar funcionamento.

---

## 3. Movimentações - Acessórios

### 3.1 Campos Origem e Destino Sincronizados

**Arquivo:** `EstoqueMovimentacoesAcessorios.tsx`

**Problema Atual (linha 282-304):**
Os filtros e o formulário usam `Select` com `lojas.map(loja => loja.nome)` - isso passa o **nome** em vez do **ID**.

**Solução:**
Substituir os `<Select>` por `<AutocompleteLoja>` para:
1. Filtro de Origem (linha 282-292)
2. Filtro de Destino (linha 294-304)
3. Campo Origem no modal (linha 359-368)
4. Campo Destino no modal (linha 371-380)

---

## Resumo de Arquivos a Modificar

| Arquivo | Alterações |
|---------|-----------|
| `src/utils/estoqueApi.ts` | Nova lógica de status (4 estados), remover bloqueio "Em movimentação" |
| `src/pages/EstoqueMovimentacaoMatrizDetalhes.tsx` | Scanner IMEI, máscara IMEI, quadro de logs, limpeza de modal |
| `src/pages/EstoqueNovaMovimentacaoMatriz.tsx` | Scanner IMEI na seleção de aparelhos |
| `src/pages/EstoqueMovimentacoesMatriz.tsx` | Atualizar badges para 4 novos status |
| `src/pages/EstoqueMovimentacoes.tsx` | Scanner IMEI no filtro e modal |
| `src/pages/EstoqueMovimentacoesAcessorios.tsx` | Substituir Selects por AutocompleteLoja |

---

## Detalhes Técnicos

### Novos Status e Cores (Badges)

| Status | Cor | Ícone |
|--------|-----|-------|
| `Pendente` | `bg-yellow-500` | `Clock` |
| `Atrasado` | `bg-destructive animate-pulse` | `AlertTriangle` |
| `Finalizado - Dentro do Prazo` | `bg-green-600` | `CheckCircle` |
| `Finalizado - Atrasado` | `bg-orange-500` | `CheckCircle` + `AlertTriangle` |

### Lógica de Verificação Automática de Status

Adicionar função `verificarStatusMovimentacaoMatriz` que:
1. É chamada ao carregar a página
2. Verifica todas as movimentações com status `Pendente`
3. Se `dataHoraLimiteRetorno < agora`, muda para `Atrasado`
4. Registra a mudança na timeline

### Integração do BarcodeScanner

Padrão de uso:
```typescript
const [showScanner, setShowScanner] = useState(false);

<div className="flex gap-2">
  <Input 
    placeholder="IMEI..."
    value={imeiDevolucao}
    onChange={(e) => setImeiDevolucao(formatIMEI(e.target.value))}
  />
  <Button variant="outline" size="icon" onClick={() => setShowScanner(true)}>
    <Camera className="h-4 w-4" />
  </Button>
</div>

<BarcodeScanner
  open={showScanner}
  onScan={(code) => {
    setImeiDevolucao(code);
    setShowScanner(false);
  }}
  onClose={() => setShowScanner(false)}
/>
```

### Estrutura do Quadro de Logs

```typescript
<Card className="col-span-full mt-6">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <History className="h-4 w-4" />
      Histórico de Ações
      <Badge variant="secondary">{movimentacao.timeline.length}</Badge>
    </CardTitle>
  </CardHeader>
  <CardContent>
    <ScrollArea className="h-[250px]">
      {movimentacao.timeline.map(entry => (
        <div key={entry.id} className="flex gap-4 py-3 border-b last:border-0">
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {format(new Date(entry.data), "dd/MM/yyyy HH:mm")}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{entry.titulo}</p>
            <p className="text-xs text-muted-foreground">{entry.descricao}</p>
            {entry.responsavel && (
              <p className="text-xs text-primary">Por: {entry.responsavel}</p>
            )}
          </div>
        </div>
      ))}
    </ScrollArea>
  </CardContent>
</Card>
```
