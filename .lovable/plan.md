
# Plano: Correção do Fluxo de Migração de Aparelhos (Novo vs. Seminovo)

## Diagnóstico do Problema

Após análise detalhada do código, identifiquei que o sistema **não está diferenciando** aparelhos "Novo" de "Semi-novo" ao finalizar notas de entrada.

### Comportamento Atual (Incorreto)
- **Todos os aparelhos** são enviados para `Estoque > Produtos Pendentes` (triagem)
- Não há verificação do campo `tipo` ou `categoria` do produto

### Comportamento Esperado (Regra de Negócio)
| Tipo do Aparelho | Destino Correto |
|------------------|-----------------|
| **Novo** | Estoque > Produtos (disponível para venda imediata) |
| **Semi-novo** | Estoque > Produtos Pendentes (triagem/análise) |

---

## Arquivos Afetados

| Arquivo | Problema |
|---------|----------|
| `src/pages/FinanceiroConferenciaNotas.tsx` | Linhas 205-220: Envia todos aparelhos para pendentes |
| `src/utils/notaEntradaFluxoApi.ts` | Função `finalizarConferencia`: Não migra produtos |

---

## Solução Proposta

### Alteração 1: FinanceiroConferenciaNotas.tsx

Modificar a lógica de migração (linhas 204-220) para:

1. **Filtrar aparelhos "Novo"** e chamar `addProdutoMigrado()` para envio direto ao estoque principal
2. **Filtrar aparelhos "Semi-novo"** e chamar `migrarProdutosNotaParaPendentes()` para envio à triagem

```text
ANTES (Incorreto):
┌─────────────────────────────────────────────────────────────┐
│  Todos os Aparelhos → migrarProdutosNotaParaPendentes()     │
│                       (Estoque > Produtos Pendentes)        │
└─────────────────────────────────────────────────────────────┘

DEPOIS (Correto):
┌─────────────────────────────────────────────────────────────┐
│  Aparelhos "Novo" → addProdutoMigrado()                     │
│                     (Estoque > Produtos - Qtd disponível)   │
├─────────────────────────────────────────────────────────────┤
│  Aparelhos "Semi-novo" → migrarProdutosNotaParaPendentes()  │
│                          (Estoque > Produtos Pendentes)     │
└─────────────────────────────────────────────────────────────┘
```

### Alteração 2: Criar função de migração para aparelhos novos

Criar função `migrarAparelhoNovoParaEstoque()` em `estoqueApi.ts` que:
- Recebe dados do produto da nota
- Gera ID único (PROD-XXXX)
- Adiciona ao array de produtos com `statusNota: 'Concluído'`
- Registra na timeline
- Define `vendaRecomendada` como pendente (null)

### Alteração 3: notaEntradaFluxoApi.ts (Opcional)

Se a nota for finalizada pelo Estoque (após conferência 100% + pagamento 100% antecipado), a mesma lógica de migração deve ser aplicada na função `finalizarConferencia`.

---

## Detalhes Técnicos

### Nova Função: migrarAparelhoNovoParaEstoque

```typescript
export const migrarAparelhoNovoParaEstoque = (
  produto: ProdutoNota,
  notaId: string,
  fornecedor: string,
  lojaDestino: string,
  responsavel: string
): Produto => {
  const newId = generateProductId();
  
  const novoProduto: Produto = {
    id: newId,
    imei: produto.imei,
    marca: produto.marca,
    modelo: produto.modelo,
    cor: produto.cor,
    tipo: 'Novo',
    quantidade: 1,
    valorCusto: produto.valorUnitario,
    valorVendaSugerido: produto.valorUnitario * 1.8,
    vendaRecomendada: undefined, // Pendente
    saudeBateria: 100,
    loja: lojaDestino,
    estoqueConferido: true,
    assistenciaConferida: true,
    condicao: 'Lacrado',
    historicoCusto: [{
      data: new Date().toISOString().split('T')[0],
      fornecedor: fornecedor,
      valor: produto.valorUnitario
    }],
    historicoValorRecomendado: [],
    statusNota: 'Concluído',
    origemEntrada: 'Fornecedor'
  };
  
  produtos.push(novoProduto);
  registerProductId(newId);
  
  return novoProduto;
};
```

### Lógica de Separação em FinanceiroConferenciaNotas.tsx

```typescript
// Separar aparelhos por tipo
const aparelhosNovos = notaFinalizada.produtos.filter(p => 
  (p.tipoProduto === 'Aparelho' || !p.tipoProduto) && 
  p.tipo === 'Novo'
);

const aparelhosSeminovos = notaFinalizada.produtos.filter(p => 
  (p.tipoProduto === 'Aparelho' || !p.tipoProduto) && 
  p.tipo === 'Seminovo'
);

// Migrar aparelhos NOVOS direto para estoque
let qtdNovos = 0;
for (const aparelho of aparelhosNovos) {
  migrarAparelhoNovoParaEstoque(
    aparelho,
    notaFinalizada.id,
    notaFinalizada.fornecedor,
    lojaDestino,
    responsavelFinanceiro
  );
  qtdNovos++;
}

// Migrar aparelhos SEMI-NOVOS para triagem
let qtdSeminovos = 0;
if (aparelhosSeminovos.length > 0) {
  const migrados = migrarProdutosNotaParaPendentes(
    aparelhosSeminovos,
    notaFinalizada.id,
    notaFinalizada.fornecedor,
    lojaDestino,
    responsavelFinanceiro
  );
  qtdSeminovos = migrados.length;
}
```

---

## Imports Necessários

Adicionar em `FinanceiroConferenciaNotas.tsx`:
```typescript
import { migrarAparelhoNovoParaEstoque } from '@/utils/estoqueApi';
```

---

## Mensagem de Sucesso Atualizada

A mensagem toast será atualizada para refletir a separação:

```text
✅ Nota NC-2025-0001 liberada!
   3 aparelho(s) NOVO(s) adicionado(s) ao estoque.
   2 aparelho(s) SEMI-NOVO(s) enviado(s) para triagem.
   5 acessório(s) adicionado(s) ao estoque.
```

---

## Verificação de Campo de Categoria

O sistema usa o campo `tipo` (ou `categoria` em algumas interfaces) para identificar a condição do produto:
- `tipo: 'Novo'` → Aparelho novo/lacrado
- `tipo: 'Seminovo'` → Aparelho usado (semi-novo)

Caso o campo não esteja preenchido, o sistema assumirá **Semi-novo** por segurança (forçar passagem pela triagem).

---

## Resultado Esperado

Após a implementação:

1. **Aparelhos "Novo"** cadastrados em notas de entrada irão diretamente para `Estoque > Produtos` com quantidade disponível
2. **Aparelhos "Semi-novo"** continuarão indo para `Estoque > Produtos Pendentes` para análise e parecer do estoque
3. Rastreabilidade mantida com IDs PROD-XXXX únicos e persistentes
4. Timeline registra origem da entrada corretamente
