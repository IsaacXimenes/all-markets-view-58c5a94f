
## Diagnóstico (por que ainda está “cortando” e por que o scroll lateral não aparece)

### 1) Cards “cortando” ao reduzir a tela
Mesmo com breakpoints (`sm/md/lg/...`), o módulo tem **Sidebar fixa** (com `ml-64`/`ml-16` no `PageLayout`). Isso reduz muito a largura “real” do conteúdo, mas o Tailwind continua aplicando os breakpoints com base no **viewport**, não na largura restante do conteúdo.

Exemplo: em 1024px (lg), com sidebar aberta (≈256px), o conteúdo fica perto de 768px. Se uma seção usa `lg:grid-cols-5`, cada card fica estreito e **o conteúdo interno pode estourar** (principalmente valores monetários, textos e layouts `flex` sem `min-w-0`/`truncate`).

### 2) Scroll lateral “não aparece” na tabela
Hoje a tabela pode não “forçar” overflow porque:
- O `<Table />` usa `w-full`, e as colunas podem encolher para caber.
- Não há **min-width** por coluna / tabela para garantir que em telas menores exista overflow horizontal.
- O scrollbar nativo pode ficar invisível dependendo do sistema (macOS), então mesmo com overflow o usuário “não vê” um indicador claro.

---

## Objetivo do ajuste
1) Garantir que **os cards nunca estourem**: em vez de “forçar 5 colunas no lg”, usar um grid que se adapta pela **largura real do container**.
2) Garantir que a tabela tenha **scroll horizontal visível e consistente**, com um “indicador” claro de que dá para arrastar para o lado.

---

## Estratégia (mais robusta que só breakpoints)
### A) Trocar grids fixos por “auto-fit + minmax”
Aplicar grids do tipo:
- Cards: `repeat(auto-fit, minmax(220px, 1fr))`
- Filtros: `repeat(auto-fit, minmax(200px, 1fr))`

Isso faz o layout responder à **largura real disponível**, mesmo com sidebar aberta, sem depender tanto de `sm/md/lg/xl`.

### B) Garantir que textos internos possam encolher
Em áreas com `flex` (ícone + textos), garantir:
- `min-w-0` no container do texto
- `truncate` para valores grandes/nomes longos
- Ajuste de fontes responsivas (`text-xs sm:text-sm`, etc.)

### C) Scroll horizontal “de verdade” na tabela (visível)
Para não depender de scrollbar do sistema operacional, trocar o wrapper do `Table` para um scroll com barra customizada (Radix ScrollArea) **com scrollbar horizontal sempre montada** (e preferencialmente `type="always"`).

Além disso, definir **min-width por coluna** (ou min-width total da tabela) para que o overflow aconteça quando a tela ficar menor.

---

## Implementação (focando primeiro na aba /financeiro/conferencia)

### 1) `src/components/ui/table.tsx` — “Scroll lateral visível + overflow garantido”
**Mudanças:**
- Substituir o `<div className="overflow-x-auto ...">` por Radix ScrollArea (ou uma versão equivalente) para renderizar uma barra horizontal visível e padronizada.
- Garantir que a tabela possa “exceder” a largura do container em telas menores:
  - Opção 1 (global): adicionar `min-w-max` no `<table>` base.
  - Opção 2 (mais segura): manter base neutra e forçar min-width na tela específica via `className` (ex.: `className="min-w-[1200px]"`), mas isso exige editar as telas.

**Recomendação:** fazer a base do Table suportar bem todos os usos:
- `className` base do `<table>`: `w-full min-w-max caption-bottom text-sm`
- ScrollArea horizontal sempre montada com thumb visível.

**Resultado esperado:**
- Em telas pequenas, aparece barra horizontal dentro do card da tabela.
- Em telas grandes, não aparece (porque não há overflow).

---

### 2) `src/pages/FinanceiroConferencia.tsx` — remover “pontos de corte” e padronizar
#### 2.1) Cards “Pendentes” e “Conferidos”
Trocar:
- `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 ...`
Por:
- grid auto-fit, por exemplo (Tailwind arbitrário):
  - `grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]`

E dentro de cada card:
- No wrapper do texto: `min-w-0`
- Nos valores: `truncate` + opcional `title={valorFormatado}`
- Ajustar fonte dos valores para evitar estouro: `text-xs sm:text-sm` (ou manter `text-sm` com truncamento).

#### 2.2) Cards de resumo (Pendentes / Finalizadas / Total)
Trocar:
- `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
Por:
- `grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]`

E ajustar:
- O `text-3xl` em telas pequenas pode estourar: usar `text-2xl sm:text-3xl`.
- Garantir `min-w-0` e `truncate` onde tiver número + ícone em `justify-between`.

#### 2.3) Filtros
Trocar:
- `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8`
Por:
- `grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]`

Isso evita filtros comprimidos/“cortados” quando a sidebar estiver aberta.

#### 2.4) Tabela (scroll horizontal)
Hoje existe um wrapper extra:
- `<div className="overflow-x-auto"> <Table> ...`

Como o `Table` já tem wrapper de scroll, isso pode criar comportamento confuso (scroll duplo / barra não evidente).
**Ajuste:**
- Remover o wrapper `overflow-x-auto` da página e deixar o `Table` ser o único responsável pelo scroll horizontal.
- Definir min-width por coluna (para garantir overflow em telas pequenas):
  - Ex.: `TableHead`/`TableCell` com `min-w-[...] whitespace-nowrap`
  - Exemplo de metas:
    - ID: `min-w-[110px]`
    - Data: `min-w-[110px]`
    - SLA: `min-w-[110px]`
    - Método: `min-w-[170px]`
    - Valor: `min-w-[140px]`
    - Conta Destino: `min-w-[260px]`
    - Situação: `min-w-[140px]`
    - Status: `min-w-[140px]`
    - Ações: `min-w-[80px]`

Também:
- Em “Conta Destino”, se ficar grande demais: usar `max-w-[260px] truncate` no texto, mantendo `title` com o nome completo.

---

## Depois de estabilizar Conferência de Contas, aplicar no restante do Financeiro
Para cada página do Financeiro com cards/filtros/tabela:
1) Substituir grids fixos por auto-fit/minmax (mesmas regras de cima).
2) Garantir `min-w-0` e `truncate` em textos longos (principalmente valores e labels).
3) Para tabelas, garantir min-width por coluna (ou `Table className="min-w-[...]"`) e usar o `Table` com scroll padronizado.

Arquivos do Financeiro (conforme seu plano original):
- `src/pages/FinanceiroConferencia.tsx`
- `src/pages/FinanceiroConferenciaNotas.tsx`
- `src/pages/FinanceiroDespesasFixas.tsx`
- `src/pages/FinanceiroDespesasVariaveis.tsx`
- `src/pages/FinanceiroExtratoContas.tsx`
- `src/pages/FinanceiroExtrato.tsx`
- `src/pages/FinanceiroFiado.tsx`
- `src/pages/FinanceiroLotesPagamento.tsx`
- `src/pages/FinanceiroNotasPendencias.tsx`
- `src/pages/FinanceiroNotasAssistencia.tsx`
- `src/pages/FinanceiroPagamentosDowngrade.tsx`
- `src/pages/FinanceiroTetoBancario.tsx`

---

## Checklist de validação (rápido)
1) Em `/financeiro/conferencia`:
   - Reduzir a largura até ~730px: cards não devem cortar.
   - Reduzir até ~390px: cards devem virar 1 coluna e continuar legíveis.
2) Na tabela:
   - Em 390–768px: deve aparecer **barra horizontal** dentro do card da tabela.
   - Conseguir arrastar lateralmente e ver todas as colunas.
3) Verificar com sidebar expandida e colapsada.

---

## Observação importante
O `index.css` define `overflow-x-hidden` em `html, body`, então “scroll horizontal na página” nunca vai acontecer — o scroll precisa ser **dentro da tabela**. Por isso a abordagem com ScrollArea horizontal e min-width é a forma correta para garantir o comportamento.

---

<lov-actions>
<lov-suggestion message="Testar o Financeiro > Conferência de Contas end-to-end em 390px, 768px, 1024px e 1366px (com sidebar aberta e colapsada) para confirmar que cards não cortam e que a tabela tem scroll horizontal visível.">Verificar end-to-end</lov-suggestion>
<lov-suggestion message="Aplicar a mesma estratégia de grid auto-fit/minmax e min-width nas colunas das tabelas nas outras abas do Financeiro (Extrato, Fiado, Notas, etc.).">Padronizar responsividade no Financeiro</lov-suggestion>
<lov-suggestion message="Adicionar um indicador visual 'Arraste para o lado →' (aparece apenas quando a tabela está overflow) para deixar o scroll horizontal óbvio para o usuário.">Indicador de scroll na tabela</lov-suggestion>
<lov-suggestion message="Implementar comportamento mobile para a Sidebar (virar um menu tipo Drawer/Sheet abaixo de md), para ganhar largura útil e melhorar a responsividade do sistema inteiro.">Sidebar mobile (Drawer)</lov-suggestion>
<lov-suggestion message="Criar um componente reutilizável (ex: ResponsiveGrid) para cards e filtros, para evitar repetir classes e garantir consistência em todos os módulos.">Componente de grid responsivo</lov-suggestion>
</lov-actions>
