

# Plano - Navegacao em Carrossel Compacto (Gestao Administrativa)

## Resumo

Criar um novo componente `CarouselTabsNavigation` com estilo de "chips/tags" compactos e aplicar exclusivamente no modulo de Gestao Administrativa para teste. O componente atual `TabsNavigation` permanece inalterado para os demais modulos. O Sidebar nao sera tocado.

## Alteracoes

### 1. Novo componente: `src/components/layout/CarouselTabsNavigation.tsx`

- Carrossel horizontal com scroll fluido e botoes de seta nas extremidades (visiveis apenas quando ha conteudo oculto)
- Cada aba renderizada como "chip" compacto com cantos arredondados (`rounded-lg`)
- Icone a esquerda + texto a direita, na mesma linha
- **Estado ativo**: fundo azul suave (`bg-primary/10`), texto em cor primaria (`text-primary`), `font-semibold`
- **Estado inativo**: fundo neutro (`bg-muted/50`), texto cinza (`text-muted-foreground`)
- **Hover**: transicao suave de fundo (`hover:bg-muted`)
- Altura reduzida: padding vertical minimo (`py-1.5`), texto `text-xs` ou `text-sm`
- Espacamento entre chips: `gap-2`
- Touch scroll fluido em mobile (`scroll-smooth`, `-webkit-overflow-scrolling: touch`)
- Mesma interface de props do `TabsNavigation` para compatibilidade

### 2. Alterar: `src/components/layout/GestaoAdministrativaLayout.tsx`

- Substituir o import de `TabsNavigation` por `CarouselTabsNavigation`
- Remover o wrapper `div` com `border-b` (os chips nao precisam de borda inferior, o visual e autocontido)
- Manter tudo o mais inalterado

## Detalhes Tecnicos

Estrutura do chip:

```text
[Icon Label]  [Icon Label]  [Icon Label]  ...
  ativo          inativo       inativo
  bg-primary/10  bg-muted/50   bg-muted/50
```

O componente reutiliza a mesma logica de scroll do `TabsNavigation` (ResizeObserver, checkScroll, botoes condicionais), mas com visual de chip ao inves de border-bottom tabs.

Nenhum outro layout ou modulo sera alterado. O Sidebar permanece intacto.
