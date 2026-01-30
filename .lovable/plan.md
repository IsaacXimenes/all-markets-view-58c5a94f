
Objetivo: corrigir o overflow no TOP 3 do “Ranking de Vendedores do Mês” (Dashboard), garantindo que valores (vendas + comissão/percentual) nunca “vazem” para fora do card, mesmo quando o card fica estreito (ex.: layout em 3/4 colunas em monitores).

Diagnóstico (com base no código atual)
- No TOP 3, a coluna de valores está com `flex-shrink-0`. Isso impede que ela encolha quando o card fica estreito, então o bloco de valores força a linha a ficar mais larga que o container.
- Mesmo com `truncate`, se o item não puder encolher (por causa de `shrink-0`), o texto continua “empurrando” e aparece fora do box (principalmente do “mini-card” de destaque do TOP 3).

Solução proposta (robusta e visual)
Em vez de tentar “forçar” tudo em uma única linha sempre, vamos tornar o TOP 3 responsivo de verdade:
- Em larguras menores, o layout do item do TOP 3 passa a ser “duas linhas”:
  1) Linha 1: medalha + avatar + nome/loja
  2) Linha 2: valores (vendas e comissão)
- Em larguras maiores (sm+), volta ao layout em uma linha (valores à direita), mas agora sem “vazar”.

Arquivo a alterar
- src/components/dashboard/RankingVendedores.tsx

Mudanças detalhadas (TOP 3)
1) Ajustar o container interno do TOP 3 para permitir quebra controlada
- Trocar o wrapper interno (hoje: `flex items-center ...`) para:
  - `flex flex-col sm:flex-row`
  - `min-w-0` no wrapper para permitir contração do conteúdo
  - `gap-2` no mobile e `sm:gap-3` no desktop

2) Agrupar “lado esquerdo” (medalha + avatar + nome/loja) num bloco próprio
- Criar uma `div` esquerda com:
  - `flex items-center gap-2 min-w-0`
  - medalha e avatar permanecem `flex-shrink-0`
  - nome/loja continuam com `flex-1 min-w-0` e `truncate`

3) Corrigir o bloco de valores (o ponto principal do bug)
- Remover `flex-shrink-0` do bloco de valores no mobile
- Usar:
  - `w-full` no mobile (para ele ocupar a “linha 2” inteira)
  - `sm:w-auto sm:ml-auto sm:flex-shrink-0` para voltar a “colar à direita” no desktop
- Manter `min-w-0` e `truncate` nos textos (principalmente vendas e comissão)

4) Evitar qualquer vazamento visual do “mini-card” do TOP 3
- Adicionar `overflow-hidden` no container do item do TOP 3 (o `div` com borda e background do destaque)
  - Isso garante que, mesmo se alguma string extrema escapar, ela não desenhe fora da borda arredondada.

5) Opcional (qualidade): preservar acesso ao valor completo quando truncar
- Adicionar `title={formatCurrency(...)}` nos `<p>` de vendas e comissão para desktop (hover mostra tooltip nativo do browser).
  - Isso melhora UX quando o truncamento ocorrer.

Mudanças (CardContent do Ranking) – somente se ainda houver scroll horizontal após o ajuste acima
- Hoje: `CardContent className="flex-1 overflow-auto"`
- Se ainda aparecer rolagem horizontal indesejada, ajustar para:
  - `overflow-y-auto overflow-x-hidden`
- Eu só aplicaria isso se, após corrigir o layout do TOP 3, ainda houver “x-scroll” aparecendo.

Validação / Testes (manual)
1) No Dashboard, observar o TOP 3 em diferentes larguras:
- Tablet (~768-1024): ranking não deve estourar
- Notebook 1366px: ranking em coluna direita (card mais estreito) não deve estourar
- Monitor 1920px/3xl: layout continua bonito e sem truncamentos desnecessários
2) Confirmar que:
- Não existe texto desenhando fora do “mini-card” do TOP 3
- Não aparece scrollbar horizontal dentro do ranking (a não ser que seja intencional)
- O “Top 4 ao 10” continua intacto

Risco / Impacto
- Alteração localizada apenas no TOP 3 do RankingVendedores.
- Não muda regras de negócio, só layout.
- Baixo risco de regressão.

Entrega
- 1 arquivo editado: `src/components/dashboard/RankingVendedores.tsx`
- Ajuste fino responsivo especificamente no TOP 3 para eliminar overflow em qualquer largura de card.
