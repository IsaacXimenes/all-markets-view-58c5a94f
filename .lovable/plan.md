

## Plano: Coach de Vendas (Upsell) + Feedback Visual no Botao "Usar" Trade-In

### O que ja esta implementado

Todas as funcionalidades das secoes 2.1, 2.2, 2.4, 3 e 4 do prompt ja estao no codigo. Os cabecalhos exibem valores de venda, as margens tem cores, o Game de Metas funciona, e as colunas expandidas no historico estao presentes.

### O que falta implementar

**1. Sugestao Inteligente de Upsell (Coach de Vendas) - Secao 2.3**

Adicionar um bloco de dicas contextuais no `PainelRentabilidadeVenda.tsx`, posicionado entre o Resumo Consolidado e o card de Lucro Real (linha ~306). O bloco so aparece quando ha gatilhos ativos.

Logica dos gatilhos:
- **Gatilho Acessorios**: Se `itens.length > 0` (ha aparelhos) e `acessoriosVenda.length === 0` (nenhum acessorio adicionado), exibir dica incentivando adicionar capa/pelicula com estimativa de comissao extra.
- **Gatilho Garantia**: Se `garantiaExtendida === null`, exibir dica incentivando a venda de garantia com o valor de comissao (10% do plano).
- **Calculo de Impacto**: Estimar o ganho adicional na comissao caso o vendedor adicione esses itens. Usar um valor medio de referencia para acessorios e garantia.

Visual: Cards discretos com icone de lampada (Lightbulb), fundo amarelo/ambar suave, texto curto e valor estimado de ganho.

**2. Feedback Visual no Botao "Usar" do Trade-In - Secao 2.2c**

No componente `ValoresRecomendadosTroca.tsx`, ao clicar em "Usar":
- Trocar o texto do botao para "Vinculado" com icone de check verde
- Aplicar uma animacao de destaque (bg-green-100 fade) na linha da tabela
- Usar estado local para rastrear qual item foi selecionado

### Arquivos Afetados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/vendas/PainelRentabilidadeVenda.tsx` | Adicionar bloco de Coach de Vendas com gatilhos contextuais e estimativa de comissao |
| `src/components/vendas/ValoresRecomendadosTroca.tsx` | Adicionar feedback visual animado no botao "Usar" (estado "Vinculado" + destaque na linha) |

### Detalhes Tecnicos

**Coach de Vendas** - Novo bloco JSX no PainelRentabilidadeVenda:
- Importar `Lightbulb` do lucide-react
- Calcular `temAparelhoSemAcessorio = itens.length > 0 && acessoriosVenda.length === 0`
- Calcular `semGarantia = !garantiaExtendida && itens.length > 0`
- Estimar comissao extra de acessorios: valor medio de R$ 50 por acessorio * margem media
- Estimar comissao extra de garantia: valor medio de plano * 10%
- Renderizar cards de dica apenas quando o gatilho estiver ativo

**Feedback "Usar"** - Alteracoes no ValoresRecomendadosTroca:
- Adicionar `const [selecionadoId, setSelecionadoId] = useState<string | null>(null)`
- No onClick: chamar `onUsarValor`, setar `setSelecionadoId(item.id)`
- Na TableRow: aplicar `className={selecionadoId === item.id ? 'bg-green-50 dark:bg-green-900/20 transition-colors' : ''}`
- No Button: se selecionado, mostrar "Vinculado" com check verde; senao, mostrar "Usar"

