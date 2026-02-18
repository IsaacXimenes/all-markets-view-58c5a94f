

## Correcoes: Pecas, Loja e Campos Financeiros no Quadro de Aparelhos Pendentes

### Problemas Identificados

1. **Pecas nao aparecem na tabela**: O codigo usa `peca.descricao` e `peca.valorCusto`, mas a interface `PecaServico` define os campos como `peca.peca` (nome da peca) e `peca.valor` / `peca.valorTotal`. Resultado: colunas vazias ou "0".

2. **Loja exibindo ID**: O `obterNomeLoja` esta sendo chamado corretamente no codigo. O problema pode estar no campo "Loja" do card superior (Informacoes do Produto, linha 370) que ja usa `obterNomeLoja`. Vou garantir que todos os locais estejam consistentes e adicionar uma verificacao de fallback mais robusta.

3. **Busca da OS vinculada pode falhar**: A condicao atual busca por `origemOS === 'Estoque' && imeiAparelho === data.imei`. Se o IMEI no produto pendente e na OS nao baterem exatamente (por exemplo, espacos ou formatacao), a OS nao e encontrada, e consequentemente as pecas nao aparecem. Vou adicionar uma busca alternativa por `produtoId`.

---

### Alteracoes

**Arquivo: `src/pages/EstoqueProdutoPendenteDetalhes.tsx`**

#### 1. Corrigir mapeamento de campos na tabela de pecas (linhas 541-547)

```text
ANTES:
  peca.descricao || peca.nome || '-'
  peca.valorCusto || peca.valor || 0

DEPOIS:
  peca.peca || peca.descricao || '-'
  peca.valorTotal || peca.valor || 0
```

O campo correto na interface `PecaServico` e `peca` (nome/descricao da peca) e `valorTotal` (valor total calculado).

#### 2. Melhorar busca da OS vinculada (linhas 110-115)

Adicionar busca alternativa por `produtoId` caso a busca por IMEI falhe:

```typescript
const os = ordensServico.find(o => 
  o.origemOS === 'Estoque' && (
    o.imeiAparelho === data.imei || 
    o.produtoId === data.id
  )
);
```

#### 3. Adicionar coluna "Qtd" na tabela de pecas

Incluir a quantidade da peca (quando disponivel) para melhor rastreabilidade.

---

### Resumo de Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/EstoqueProdutoPendenteDetalhes.tsx` | Corrigir campos da tabela de pecas (`peca.peca`, `peca.valorTotal`), melhorar busca da OS vinculada (fallback por `produtoId`) |

