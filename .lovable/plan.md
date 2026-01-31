

# Plano: Centralizar Todo CSS em Um Único Arquivo

## Situação Atual

O projeto tem os estilos CSS distribuídos em:

| Arquivo | Conteúdo | Linhas |
|---------|----------|--------|
| `src/index.css` | Estilos principais (variáveis, utilitários, container queries) | ~347 |
| `src/App.css` | Apenas reset do `#root` (residual do Vite) | 5 |
| `tailwind.config.ts` | Configurações de tema, cores, animações | ~170 |
| `src/utils/statusColors.ts` | Mapeamento de classes CSS para status | ~197 |

**Boa notícia**: O projeto já está quase centralizado! Apenas o `App.css` está separado desnecessariamente.

---

## Plano de Centralização

### 1. Mover Conteúdo do `App.css` para `index.css`

O `App.css` só tem 5 linhas:
```css
#root {
  width: 100%;
  min-height: 100vh;
}
```

Vou mover isso para dentro do `@layer base` no `index.css`.

### 2. Deletar `App.css`

Após mover o conteúdo, o arquivo `App.css` não será mais necessário.

### 3. Reorganizar `index.css` com Seções Claras

Vou organizar o arquivo em seções bem documentadas:

```css
/* ============================================
   1. IMPORTS E TAILWIND DIRECTIVES
   ============================================ */

/* ============================================
   2. CSS VARIABLES (Design Tokens)
   - Cores do tema claro
   - Cores do tema escuro
   ============================================ */

/* ============================================
   3. BASE STYLES
   - Reset e estilos globais
   - Tipografia base
   ============================================ */

/* ============================================
   4. UTILITY CLASSES
   - Glass morphism
   - Scrollbar styles
   - Loading states
   ============================================ */

/* ============================================
   5. LAYOUT RESPONSIVO (Container Queries)
   - Cards grid
   - Filters grid
   - Page layout
   ============================================ */

/* ============================================
   6. LEGACY UTILITIES (para remoção futura)
   - Classes viewport-based (deprecated)
   ============================================ */
```

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `src/index.css` | Reorganizar + adicionar conteúdo do App.css |
| `src/App.css` | **DELETAR** |

---

## Resultado Final

**Antes:**
```
src/
├── App.css (5 linhas - separado)
├── index.css (347 linhas - principal)
└── ...
```

**Depois:**
```
src/
├── index.css (~360 linhas - tudo centralizado e organizado)
└── ...
```

---

## Observações Importantes

### O que NÃO deve ser movido para CSS:

1. **`tailwind.config.ts`**: Este arquivo configura o Tailwind e deve permanecer separado. É uma configuração JavaScript, não CSS puro.

2. **`src/utils/statusColors.ts`**: Este arquivo contém lógica TypeScript para mapeamento dinâmico de classes. Não é CSS - é código que **gera** classes Tailwind dinamicamente. Deve permanecer como está.

### Arquivos que permanecem inalterados:

- `tailwind.config.ts` - Configuração do Tailwind (não é CSS)
- `src/utils/statusColors.ts` - Lógica de mapeamento (não é CSS)
- `src/components/ui/ResponsiveContainers.tsx` - Componentes React (usa classes CSS)

---

## Benefícios

1. **Arquivo único**: Todo CSS personalizado em `src/index.css`
2. **Organização clara**: Seções bem documentadas
3. **Fácil manutenção**: Um lugar para editar estilos
4. **Menos imports**: Remove necessidade do `App.css`
5. **Padrão Tailwind**: Segue a convenção do ecossistema

