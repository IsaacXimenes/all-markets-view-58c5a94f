
# Plano: Ajustes nos Módulos Estoque e Assistência

## Resumo Executivo
Este plano aborda 4 melhorias principais nos módulos de Estoque e Assistência, incluindo reorganização de colunas, destaque visual de linha selecionada, formatação de IMEI, exibição correta de nome de loja, e correção de navegação na sidebar.

---

## 1. Estoque: Reordenação de Colunas e Destaque de Linha

### 1.1 Reordenação de Colunas na Tabela
**Arquivo:** `src/pages/EstoqueProdutosPendentes.tsx`

**Estado Atual:**
A tabela possui as colunas na seguinte ordem:
1. Checkbox
2. ID
3. IMEI
4. Produto
5. Origem
6. Nota de Origem
7. Fornecedor
8. Loja
9. Valor Origem
10. Saúde Bat.
11. (...)

**Alteração:**
Reorganizar para:
1. Checkbox (mantém)
2. **Produto** (move para cima)
3. **Loja** (move para cima)
4. **Custo/Valor Origem** (move para cima)
5. ID
6. IMEI
7. Origem
8. Nota de Origem
9. Fornecedor
10. Saúde Bat.
11. (demais colunas mantêm ordem atual)

### 1.2 Destaque de Linha Selecionada
**Implementação:**
- Adicionar estado `selectedRowId` para rastrear a linha clicada
- Quando uma linha for clicada (não apenas o checkbox), aplicar:
  - Cor de fundo: `bg-muted/80` ou `bg-gray-200`
  - Borda lateral esquerda: `border-l-4 border-black`
- O clique no botão de ações ou checkbox também seleciona a linha

---

## 2. Assistência: Nome da Loja e Máscara de IMEI

### 2.1 Exibição do Nome da Loja
**Arquivo:** `src/pages/OSProdutosAnalise.tsx`

**Estado Atual:**
A função `getLojaNome` já existe na página e está sendo chamada na coluna Loja:
```tsx
<TableCell>{getLojaNome(produto.loja)}</TableCell>
```

A função busca o nome usando `getLojaById` de `cadastrosApi`. Vou verificar se está funcionando corretamente e, se necessário, integrar com `useCadastroStore` para consistência com o padrão do sistema.

### 2.2 Aplicar Máscara de IMEI
**Alteração:**
Importar e utilizar a função `formatIMEI` do arquivo `src/utils/imeiMask.ts` para exibir o IMEI formatado:

```tsx
// Antes
<TableCell className="font-mono text-xs">{produto.imei}</TableCell>

// Depois
<TableCell className="font-mono text-xs">{formatIMEI(produto.imei)}</TableCell>
```

A máscara seguirá o padrão: `XX-XXXXXX-XXXXXX-X`

---

## 3. Navegação e Sidebar

### 3.1 Adicionar Aba "Produtos para Análise" no OSLayout
**Arquivo:** `src/components/layout/OSLayout.tsx`

**Estado Atual:**
A aba "Produtos para Análise" NÃO está incluída no array `tabs` do OSLayout, mas a rota `/os/produtos-analise` existe.

**Alteração:**
Adicionar a aba ao array `tabs`:
```tsx
const tabs = [
  { name: 'Produtos para Análise', href: '/os/produtos-analise', icon: Eye }, // NOVA ABA
  { name: 'Histórico de Assistência', href: '/os/historico-assistencia', icon: ClipboardList },
  { name: 'Assistência', href: '/os/assistencia', icon: Wrench },
  // ... demais abas
];
```

### 3.2 Sidebar - Indicador de Aba Ativa
**Arquivo:** `src/components/layout/Sidebar.tsx`

**Estado Atual:**
A sidebar já possui lógica para destacar o módulo "Assistência" quando a rota começa com `/os`:
```tsx
if (href === '/os/produtos-analise') {
  return location.pathname.startsWith('/os');
}
```

**Verificação:** A lógica está correta. O menu "Assistência" será destacado para qualquer rota `/os/*`. Não são necessárias alterações aqui.

---

## 4. Fluxo de Encaminhamento (Estoque -> Assistência)

### 4.1 Verificar Status de Produtos Encaminhados
**Arquivo:** `src/pages/EstoqueProdutoPendenteDetalhes.tsx` e `src/utils/osApi.ts`

**Estado Atual:**
Quando o parecer "Encaminhado para conferência da Assistência" é salvo:
1. A função `salvarParecerEstoque` em `osApi.ts` atualiza o status para `'Em Análise Assistência'`
2. A função `getProdutosParaAnaliseOS` filtra produtos com `statusGeral === 'Em Análise Assistência' || statusGeral === 'Aguardando Peça'`

**Validação:** O fluxo está correto. Produtos encaminhados pelo estoque aparecem automaticamente na aba "Produtos para Análise" da Assistência.

**Nota importante:** A aba "Produtos para Análise" usa OSLayout, mas não estava listada nas tabs do OSLayout. A correção do item 3.1 resolverá a visibilidade dessa aba na navegação.

---

## Resumo de Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/pages/EstoqueProdutosPendentes.tsx` | Reordenar colunas + adicionar estado de linha selecionada |
| `src/pages/OSProdutosAnalise.tsx` | Aplicar máscara IMEI + garantir uso do nome da loja |
| `src/components/layout/OSLayout.tsx` | Adicionar aba "Produtos para Análise" |

---

## Detalhes Técnicos

### Estado de Linha Selecionada (EstoqueProdutosPendentes.tsx)
```tsx
// Novo estado
const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

// Handler de clique na linha
const handleRowClick = (id: string) => {
  setSelectedRowId(prev => prev === id ? null : id);
};

// Aplicar classe condicional na TableRow
<TableRow 
  key={produto.id} 
  className={cn(
    getStatusRowClass(produto, produto.dataEntrada),
    selectedRowId === produto.id && 'bg-muted/80 border-l-4 border-black'
  )}
  onClick={() => handleRowClick(produto.id)}
>
```

### Reordenação de Colunas (cabeçalho e corpo)
Nova ordem no TableHeader:
```
Checkbox | Produto | Loja | Valor Origem | ID | IMEI | Origem | Nota | Fornecedor | Saúde | SLA | Parecer Est. | Parecer Assist. | Ações
```

### OSLayout - Nova Aba
```tsx
import { Eye } from 'lucide-react';

const tabs = [
  { name: 'Produtos para Análise', href: '/os/produtos-analise', icon: Eye },
  // ... demais abas existentes
];
```
