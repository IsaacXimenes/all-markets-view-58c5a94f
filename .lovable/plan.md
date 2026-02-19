
## Melhoria Visual dos Titulos das Paginas

### O que sera feito

Adicionar **icone do modulo** e **efeito de gradiente dourado com brilho animado** ao titulo de cada pagina, mantendo a identidade visual existente (fundo escuro, textura de circuito, borda amarela).

---

### Resultado Visual Esperado

- Icone do modulo aparece a esquerda do titulo (ex: Users para RH, Package para Estoque)
- Texto do titulo com gradiente dourado (de #F7BB05 para #FFD700 para #F7BB05)
- Borda amarela com efeito de brilho/shimmer animado sutil
- Textura de circuito no fundo mantida

---

### Detalhes Tecnicos

**Arquivo: `src/components/layout/PageLayout.tsx`**

1. Adicionar prop opcional `icon` ao `PageLayoutProps` para receber o componente Lucide do modulo
2. Renderizar o icone ao lado do titulo com cor amarela (#F7BB05)
3. Aplicar gradiente dourado no texto via CSS `background-clip: text` com cores #F7BB05 -> #FFD700 -> #F7BB05
4. Adicionar animacao de shimmer na borda usando um pseudo-elemento com `@keyframes`

**Arquivo: `src/index.css`**

Adicionar keyframe `shimmer-border` para o efeito de brilho sutil na borda:
- Uma faixa de luz dourada que percorre a borda horizontalmente a cada ~3 segundos

**Arquivos de pagina (todos que usam PageLayout):**

Passar o icone correspondente via prop `icon`. Mapeamento:

| Modulo | Icone |
|--------|-------|
| Recursos Humanos | Users |
| Financeiro | Banknote |
| Estoque | Package |
| Vendas | ShoppingCart |
| Garantias | Shield |
| Assistencia | Wrench |
| Gestao Administrativa | ClipboardCheck |
| Relatorios | BarChart3 |
| Cadastros | Database |
| Dados Sistema Antigo | Archive |
| Configuracoes | Settings |

Cada pagina que usa `<PageLayout title="...">` recebera o prop adicional `icon={NomeDoIcone}`.

---

### Resumo de Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/layout/PageLayout.tsx` | Adicionar prop `icon`, gradiente no texto, shimmer na borda |
| `src/index.css` | Adicionar keyframe `shimmer-border` |
| ~20 paginas que usam PageLayout | Adicionar prop `icon` com o icone Lucide correspondente |
