
# Plano: Implementar Busca Global com Command Palette

## Visao Geral

Este plano transforma o campo de busca "Buscar acoes, indices..." em uma **Command Palette funcional** que permite buscar e navegar rapidamente por todo o sistema - incluindo modulos, paginas, lojas, colaboradores e acoes rapidas.

---

## Design Visual

```text
ANTES (campo estatico):
┌──────────────────────────────────────────────────────────────┐
│  [🔍] Buscar acoes, indices...                               │
└──────────────────────────────────────────────────────────────┘

DEPOIS (clicavel, abre modal):
┌──────────────────────────────────────────────────────────────┐
│  [🔍] Buscar no sistema...                       [⌘K]       │
└──────────────────────────────────────────────────────────────┘
      │
      ▼ (ao clicar ou pressionar Cmd+K)
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Digite para buscar...                                       │
├─────────────────────────────────────────────────────────────────┤
│  NAVEGACAO                                                      │
│  ├─ 🏠 Painel                                                   │
│  ├─ 👥 Recursos Humanos                                         │
│  ├─ 💰 Financeiro                                               │
│  ├─ 📦 Estoque                                                  │
│  ├─ 🛒 Vendas                                                   │
│  └─ ...                                                         │
├─────────────────────────────────────────────────────────────────┤
│  ACOES RAPIDAS                                                  │
│  ├─ ➕ Nova Venda                                               │
│  ├─ ➕ Nova OS                                                  │
│  ├─ ➕ Nova Garantia                                            │
│  └─ ➕ Cadastrar Nota                                           │
├─────────────────────────────────────────────────────────────────┤
│  LOJAS (ao digitar)                                             │
│  ├─ 🏪 Loja Matriz - Centro                                    │
│  ├─ 🏪 Loja Sul - Barra                                        │
│  └─ ...                                                         │
├─────────────────────────────────────────────────────────────────┤
│  COLABORADORES (ao digitar)                                     │
│  ├─ 👤 Ana Silva - Vendedora                                   │
│  ├─ 👤 Pedro Lima - Gestor                                     │
│  └─ ...                                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Funcionalidades

### 1. Atalho de Teclado
- **Cmd+K** (Mac) ou **Ctrl+K** (Windows) abre a busca global
- **Escape** fecha o modal
- Setas ↑↓ navegam entre resultados
- **Enter** executa a acao selecionada

### 2. Categorias de Busca

| Categoria | Fonte de Dados | Acao ao Selecionar |
|-----------|----------------|-------------------|
| Navegacao | Lista estatica de modulos | `navigate(rota)` |
| Acoes Rapidas | Lista estatica | `navigate(rota)` |
| Lojas | `useCadastroStore.lojas` | `navigate(/cadastros/lojas)` + filtro |
| Colaboradores | `useCadastroStore.colaboradores` | `navigate(/rh/funcionario/:id)` |

### 3. Busca Fuzzy
- Busca por nome, cargo, loja
- Resultados ordenados por relevancia
- Maximo de 5 resultados por categoria

---

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/layout/GlobalSearch.tsx` | **Criar** | Componente da Command Palette |
| `src/components/layout/Navbar.tsx` | Modificar | Substituir input estatico pelo GlobalSearch |

---

## Estrutura do Componente GlobalSearch

```typescript
// Dados estaticos de navegacao
const navigationItems = [
  { name: 'Painel', href: '/', icon: Home, keywords: ['dashboard', 'inicio'] },
  { name: 'Recursos Humanos', href: '/rh', icon: Users, keywords: ['rh', 'funcionarios', 'equipe'] },
  { name: 'Financeiro', href: '/financeiro/conferencia', icon: Banknote, keywords: ['dinheiro', 'contas'] },
  { name: 'Estoque', href: '/estoque', icon: Package, keywords: ['produtos', 'inventario'] },
  { name: 'Vendas', href: '/vendas', icon: ShoppingCart, keywords: ['pedidos', 'clientes'] },
  { name: 'Garantias', href: '/garantias/nova', icon: Shield, keywords: ['troca', 'devolucao'] },
  { name: 'Assistencia', href: '/os/produtos-analise', icon: Wrench, keywords: ['os', 'conserto'] },
  { name: 'Relatorios', href: '/relatorios', icon: BarChart3, keywords: ['graficos', 'dados'] },
  { name: 'Cadastros', href: '/cadastros', icon: Database, keywords: ['registros', 'configuracoes'] },
];

// Acoes rapidas
const quickActions = [
  { name: 'Nova Venda', href: '/vendas/nova', icon: Plus },
  { name: 'Nova Venda Digital', href: '/vendas/nova-digital', icon: Plus },
  { name: 'Nova OS', href: '/os/assistencia/nova', icon: Plus },
  { name: 'Nova Garantia', href: '/garantias/nova', icon: Plus },
  { name: 'Cadastrar Nota', href: '/estoque/nota/cadastrar', icon: Plus },
];
```

---

## Fluxo de Uso

1. Usuario clica no campo de busca ou pressiona **Cmd+K**
2. Modal abre com categorias pre-carregadas
3. Usuario digita termo de busca
4. Sistema filtra em tempo real:
   - Modulos por nome e keywords
   - Lojas por nome e cidade
   - Colaboradores por nome e cargo
5. Usuario seleciona item com setas ou clique
6. Sistema navega para a pagina correspondente

---

## Detalhes Tecnicos

### Componentes Utilizados
- `CommandDialog` - Modal do cmdk
- `CommandInput` - Campo de busca
- `CommandList` - Lista de resultados
- `CommandGroup` - Grupos de categorias
- `CommandItem` - Itens clicaveis
- `CommandEmpty` - Mensagem quando sem resultados

### Integracao com Dados
```typescript
// Buscar lojas e colaboradores do store
const { lojas, colaboradores } = useCadastroStore();

// Filtrar por termo digitado
const filteredLojas = lojas.filter(loja => 
  loja.nome.toLowerCase().includes(search.toLowerCase()) ||
  loja.cidade?.toLowerCase().includes(search.toLowerCase())
).slice(0, 5);
```

### Atalho de Teclado
```typescript
useEffect(() => {
  const down = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setOpen(true);
    }
  };
  document.addEventListener('keydown', down);
  return () => document.removeEventListener('keydown', down);
}, []);
```

---

## Acessibilidade

- Navegacao completa por teclado
- Labels descritivos para screen readers
- Foco automatico no input ao abrir
- Anuncio de resultados encontrados

---

## Resultado Esperado

1. Campo de busca no header funcional e interativo
2. Atalho Cmd+K / Ctrl+K para acesso rapido
3. Busca unificada por modulos, lojas e colaboradores
4. Navegacao instantanea ao selecionar resultado
5. Experiencia similar a apps modernos (VS Code, Slack, Linear)
