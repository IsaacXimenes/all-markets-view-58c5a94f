
## Objetivo
Na rota **/estoque/produtos (Aparelhos)**, garantir que no modo mobile (incluindo “Mobile Preview”) o usuário veja:
- **4 cards** completos, redimensionando automaticamente (sem cortar)
- **Filtros** todos visíveis (empilhados quando necessário)
- **Tabela** com **scroll horizontal visível e funcional** (barra aparecendo, não só “arrastar”)

---

## Diagnóstico (por que está cortando)
Hoje a tela “Aparelhos” usa grids com breakpoints (`sm:`, `lg:`). Isso funciona quando o **viewport** realmente fica pequeno.

Mas no “mobile preview” (dependendo de como você está abrindo), pode acontecer do **viewport continuar grande** e apenas o **container ficar estreito**. Nesse cenário:
- O Tailwind ainda aplica layout “desktop” (4 colunas / muitos campos lado a lado)
- O conteúdo “passa” da largura disponível e fica **cortado**
- A tabela fica “sem scroll visível” porque o componente `Table` usa `ScrollArea` com `type="hover"` (em touch não existe hover, então a barra some)

---

## Solução (mais robusta): layout baseado no “espaço disponível”, não no viewport
Vamos trocar os grids de cards e filtros para um padrão “container-friendly” usando **auto-fit + minmax**, que se adapta ao espaço real disponível.

E vamos corrigir a tabela para que a barra horizontal fique **sempre visível**.

---

## Mudanças planejadas (arquivos)

### 1) `src/pages/EstoqueProdutos.tsx` — Cards (4) sempre visíveis, sem corte
**Trocar o grid atual:**
- De: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Para algo como:
```text
grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]
```

Por que isso resolve:
- Se o container tiver ~360–420px, cabe **1 card por linha** (todos aparecem empilhados)
- Se o container for maior, automaticamente vira 2/3/4 colunas sem quebrar
- Não depende de breakpoint do viewport

Ajustes adicionais:
- Garantir `min-w-0` em wrappers dos cards (e eventualmente `truncate`) para não estourar textos longos.
- Remover qualquer `overflow-hidden` desnecessário no “wrapper” do grid (manter só nos próprios cards se quiser).

---

### 2) `src/pages/EstoqueProdutos.tsx` — Filtros: todos visíveis, sempre empilhando quando precisar
Hoje os filtros usam `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` e ainda tem `col-span` baseado em quantidade de colunas (isso costuma quebrar quando mudamos a grade).

Vamos padronizar para:
```text
grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]
```

E ajustar os itens especiais:
- Checkbox “Só não conferidos”: usar `col-span-full` para sempre ocupar a linha toda quando necessário.
- Botões “Limpar / CSV”: também `col-span-full` e layout:
```text
flex flex-col sm:flex-row gap-2
```
(sem depender de `sm:col-span-2` / `lg:col-span-1`, que fica frágil quando a grade muda)

Resultado esperado:
- Em container estreito: filtros 1 por linha (todos aparecem)
- Em container médio: 2 por linha
- Em container largo: 3/4 por linha

---

### 3) `src/components/ui/table.tsx` — Scroll horizontal sempre visível em mobile
Atualmente:
- `TableScrollArea` usa `type="hover"`
- Em mobile/touch, “hover” não acontece, então a barra fica praticamente invisível

Vamos mudar para:
- `type="always"` (ou no mínimo “sempre em telas pequenas”)

Também vamos garantir que:
- O `Viewport` permita o gesto de scroll horizontal
- A barra tenha altura suficiente (ex.: `h-3` ou `h-4`) e contraste ok

Resultado esperado:
- A tabela continua com largura grande (min-width)
- A barra aparece e o usuário entende que dá para rolar

---

### 4) `src/pages/EstoqueProdutos.tsx` — Evitar “scroll duplo” na tabela
Hoje o `Table` já tem um scroll interno (Radix ScrollArea). Se a gente também deixar `overflow-x-auto` no CardContent, às vezes vira confuso.

Decisão:
- Manter **um único** responsável pelo scroll horizontal:
  - Preferência: deixar o `Table` controlar o scroll (e corrigir o `type="always"` no `table.tsx`)
  - Ajustar o wrapper do Card para não criar scroll duplicado

---

## Como vamos validar (checklist rápido)
1. Abrir **/estoque/produtos**
2. Ativar o modo mobile (do jeito que você costuma testar)
3. Confirmar:
   - Vejo os **4 cards** (sem cortar nenhum) e consigo rolar a tela normalmente
   - Vejo **todos os filtros** (IMEI, Modelo, Loja, Tipo, Origem, checkbox, botões)
   - A tabela mostra uma **barra de rolagem horizontal** visível
   - Consigo rolar para ver colunas da direita (Ações etc.)

---

## Resultado final esperado (mobile)
- Cards: **um embaixo do outro**, ajustando conforme o espaço
- Filtros: **um embaixo do outro**, sem esconder nenhum
- Tabela: **scroll lateral evidente e funcionando**

---

## Observação importante (para ficar “à prova” de Mobile Preview)
Se você estiver usando um “mobile preview” que **não reduz o viewport**, essa abordagem com `auto-fit/minmax` é a que mais evita cortes, porque responde ao espaço real disponível, não ao breakpoint.
