
# Plano: Atualizar Quadro de Retirada/Logística em VendasEditar.tsx

## Objetivo
Igualar as funcionalidades do quadro "Retirada / Logística" na tela de Editar Venda (`VendasEditar.tsx`) às da tela Nova Venda (`VendasNova.tsx`).

---

## Diferenças Identificadas

| Funcionalidade | VendasNova.tsx | VendasEditar.tsx |
|----------------|----------------|------------------|
| Autocomplete de Local de Entrega | Sim | Nao (campo nao existe) |
| Valor Recomendado (read-only) | Sim | Nao |
| Indicador de valor abaixo do recomendado | Sim (alerta vermelho) | Nao |
| Grid dinâmico 5 colunas para Entrega | Sim | 4 colunas |
| Import de taxasEntregaApi | Sim | Nao |

---

## Alterações Necessárias

### 1. Adicionar Imports Faltantes

```typescript
import { getTaxasEntregaAtivas, TaxaEntrega } from '@/utils/taxasEntregaApi';
import { AlertTriangle } from 'lucide-react'; // Já existe, verificar
```

### 2. Adicionar Novos Estados (linhas ~90-95)

```typescript
// Estados para Local de Entrega com autocomplete
const [valorRecomendadoEntrega, setValorRecomendadoEntrega] = useState(0);
const [localEntregaId, setLocalEntregaId] = useState('');
const [localEntregaNome, setLocalEntregaNome] = useState('');
const [buscaLocalEntrega, setBuscaLocalEntrega] = useState('');
const [taxasEntrega] = useState<TaxaEntrega[]>(getTaxasEntregaAtivas());
const [showLocaisEntrega, setShowLocaisEntrega] = useState(false);
```

### 3. Atualizar Carregamento da Venda (useEffect ~linha 173)

Carregar dados do local de entrega se existirem na venda original:

```typescript
// Carregar dados de entrega se existirem
if (venda.localEntregaId) {
  setLocalEntregaId(venda.localEntregaId);
  const taxa = getTaxasEntregaAtivas().find(t => t.id === venda.localEntregaId);
  if (taxa) {
    setLocalEntregaNome(taxa.local);
    setValorRecomendadoEntrega(taxa.valor);
  }
}
```

### 4. Substituir o Quadro de Retirada/Logística (linhas 1069-1171)

Copiar a estrutura completa de VendasNova.tsx que inclui:

- Grid dinâmico de 5 colunas quando `tipoRetirada === 'Entrega'`
- Autocomplete de Local de Entrega com dropdown de sugestões
- Campo "Valor Recom." (read-only)
- Campo "Valor Entrega" com indicador de diferença
- Campo Motoboy (já existe)

---

## Estrutura do Novo Quadro

```text
Tipo: Entrega
├── Tipo de Retirada (Select)
├── Local de Entrega (Autocomplete com lista de taxas)
├── Valor Recom. (read-only, mostra valor do cadastro)
├── Valor Entrega (editável, com alerta se menor que recomendado)
└── Motoboy (Select obrigatório)
```

---

## Arquivo a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/pages/VendasEditar.tsx` | Adicionar imports, estados e substituir seção Retirada/Logística |

---

## Benefícios

1. **Consistência** - Mesmo comportamento em Nova Venda e Editar Venda
2. **Autocomplete** - Facilita seleção do local de entrega
3. **Controle de valor** - Visualização do valor recomendado e alerta de desconto
4. **UX melhorada** - Usuário não precisa lembrar valores de entrega
