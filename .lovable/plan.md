

## Ajustes: Sidebar (icones colapsados) e Login Mobile

### 1. Sidebar - Espacamento dos icones ao colapsar

**Problema**: Quando a sidebar esta colapsada (`w-16`), os icones ficam com espacamento irregular -- o `gap-0.5`, `px-2`, `py-1.5` e `mx-1` nao centralizam bem os icones no espaco disponivel.

**Solucao no arquivo `src/components/layout/Sidebar.tsx`**:
- Ajustar o padding e gap dos itens no modo colapsado para que fiquem centralizados e com espacamento uniforme.
- Quando `isCollapsed`:
  - Cada link tera `px-0 py-2.5 mx-auto w-10 h-10 flex items-center justify-center` para garantir centralizacao perfeita.
  - O `gap` do nav sera aumentado para `gap-1` quando colapsado.
  - Remover o `mx-1` atual que causa desalinhamento.
- Ocultar o indicador lateral ativo (barra branca) quando colapsado, pois nao faz sentido visual.
- Ocultar o rodape "Status da Loja" completamente quando colapsado (usar `hidden` em vez de `opacity-0` para nao ocupar espaco).

---

### 2. Tela de Login - Versao Mobile

**Problema**: No mobile, o formulario usa `marginLeft: '0'` mas o background (imagem grande de desktop) nao se adapta bem, e o formulario pode ficar mal posicionado ou com tamanho inadequado.

**Solucao no arquivo `src/components/login/LoginCard.tsx`**:
- No mobile, usar `bg-contain` ou uma cor de fundo escura em vez de `bg-cover` (a imagem de desktop nao funciona bem em telas estreitas).
- Centralizar o formulario completamente no mobile sem margin lateral.
- Reduzir a largura maxima do formulario para `maxWidth: '85vw'` no mobile.
- Adicionar padding seguro para evitar que o formulario encoste nas bordas.

**Solucao no arquivo `src/components/login/LoginForm.tsx`**:
- Reduzir tamanhos de fonte no mobile:
  - Titulo "Bem-vindo": de `text-4xl` para `text-2xl` no mobile.
  - Inputs: padding vertical reduzido de `py-3.5` para `py-3`.
  - Botao "Entrar": padding de `py-4` para `py-3`.
- Reduzir `mb-8` do header para `mb-5` no mobile.

---

### Resumo de Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/layout/Sidebar.tsx` | Centralizar icones no modo colapsado com tamanho fixo, ajustar gap, ocultar rodape quando colapsado |
| `src/components/login/LoginCard.tsx` | Adaptar background e posicionamento do formulario para telas mobile |
| `src/components/login/LoginForm.tsx` | Reduzir tamanhos de fonte, padding e espacamento para mobile |

