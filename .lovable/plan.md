

# Plano - Ajustes no Modulo de Vendas (8 problemas)

## Problema 1: Conferencia do Gestor - Painel lateral deve seguir o modelo do Financeiro

O painel lateral do Gestor (`VendasConferenciaGestor.tsx`, linhas 772-1003) usa `w-[30%] sticky top-4` com layout simples. O painel do Financeiro (`FinanceiroConferencia.tsx`, linhas 1088-1345) usa `xl:fixed xl:right-0 xl:h-screen xl:w-[480px]` com drawer lateral full-height e sections mais detalhadas (Aprovacao do Gestor, Rastreabilidade, Observacoes read-only e editaveis, Data de Finalizacao).

**Correcao em `src/pages/VendasConferenciaGestor.tsx`:**
- Substituir o container do painel de `w-[30%] sticky top-4 h-fit min-w-[350px]` para `w-full xl:w-[480px] xl:min-w-[460px] xl:max-w-[520px] xl:fixed xl:right-0 xl:top-0 xl:bottom-0 h-fit xl:h-screen flex-shrink-0 xl:z-30`
- Substituir `<Card className="max-h-[calc(100vh-120px)] overflow-y-auto">` para `<Card className="xl:h-full xl:rounded-none xl:border-l xl:border-t-0 xl:border-b-0 xl:border-r-0 overflow-y-auto">`
- Ajustar o container principal de `w-[70%]` para `w-full xl:flex-1` com `flex-col xl:flex-row gap-4 xl:gap-6`
- Adicionar secao de "Acessorios" abaixo dos Itens da Venda (listar `vendaSelecionada.acessorios` se existir)
- Adicionar secao de "Trade-Ins" com abatimento
- Adicionar secao com comprovantes de pagamento (usando `ComprovantePreview`)

---

## Problema 2: Garantia estendida sumindo apos lancamento na Conferencia Gestor

O campo `garantiaExtendida` nao esta sendo incluido no objeto `vendaData` em `VendasNova.tsx` (linha 950-983). Ao criar a venda, os dados de garantia extendida sao perdidos e nao aparecem na conferencia.

**Correcao em `src/pages/VendasNova.tsx`:**
- Adicionar `garantiaExtendida` ao objeto `vendaData` (linha ~982)
- Adicionar `garantiaItens` ao objeto `vendaData`

**Correcao em `src/utils/vendasApi.ts`:**
- Adicionar campos `garantiaExtendida` e `garantiaItens` a interface `Venda` como opcionais

**Correcao em `src/pages/VendasConferenciaGestor.tsx`:**
- Exibir secao de "Garantia Extendida" no painel lateral quando `vendaSelecionada.garantiaExtendida` existir, mostrando plano, valor, e vigencia

---

## Problema 3: Venda Balcao - Opcao de aumentar/diminuir quantidade de acessorios

Atualmente a quantidade e definida no modal de selecao e so pode ser removida. Na tabela de acessorios da Venda Balcao (`VendasAcessorios.tsx`, linhas 640-714), a coluna "Qtd" mostra apenas o numero sem controles de incremento/decremento.

**Correcao em `src/pages/VendasAcessorios.tsx`:**
- Na coluna "Qtd" da tabela de acessorios, substituir `{item.quantidade}` por controles +/- com botoes e validacao de estoque maximo
- Ao alterar a quantidade, recalcular `valorTotal = valorUnitario * novaQuantidade`
- Botao "-" nao permite ir abaixo de 1 (remover usa o botao X)
- Botao "+" valida contra o estoque disponivel do acessorio

---

## Problema 4: Historico de Vendas - Filtro "Modelo" e coluna "Produto" - retornar se venda de aparelho ou acessorio

O filtro esta nomeado "Modelo" (linha 317) mas a coluna da tabela diz "Produto" (linha 394). Alem disso, vendas de acessorios (via Venda Balcao) nao mostram a informacao de que sao vendas de acessorios na coluna Produto.

**Correcao em `src/pages/Vendas.tsx`:**
- Renomear o label do filtro de "Modelo" para "Produto" (linha 317)
- Na celula da coluna "Produto" (linha 446): se `venda.itens.length === 0` e `venda.acessorios?.length > 0`, exibir "Acessorio" (com badge diferenciada) seguido dos nomes dos acessorios. Se tiver itens normais, manter o modelo do aparelho
- Ajustar o filtro `modeloFiltro` para tambem buscar nos nomes dos acessorios (`venda.acessorios?.some(a => a.descricao...)`)

---

## Problema 5: Pendentes Digitais - Responsavel com nomes errados

Na tabela de Pendentes Digitais (`VendasPendentesDigitais.tsx`, linha 159), o "Responsavel" usa `venda.responsavelVendaNome` que vem dos mocks hardcoded em `vendasDigitalApi.ts` (nomes como "Rafael Digital", "Camila Online"). Esses nomes nao existem no cadastro real de colaboradores.

**Correcao em `src/pages/VendasPendentesDigitais.tsx`:**
- Importar `useCadastroStore` e usar `obterNomeColaborador(venda.responsavelVendaId)` para resolver o nome real do colaborador
- Se o ID nao existir no cadastro, fazer fallback para `venda.responsavelVendaNome`

---

## Problema 6: Pendentes Digitais - Origem da Venda sempre "Loja Online"

Na tela de Nova Venda Digital (`VendasNovaDigital.tsx`, linha 91), a origem da venda e definida como `'Digital'` hardcoded. Ao finalizar na tela `VendasFinalizarDigital.tsx`, o campo de origem tambem inicia com `'Digital'`.

**Correcao em `src/pages/VendasNovaDigital.tsx`:**
- Alterar o valor default de `origemVenda` de `'Digital'` para `'Loja Online'`

**Correcao em `src/pages/VendasFinalizarDigital.tsx`:**
- Alterar o valor default de `origemVenda` de `'Digital'` para `'Loja Online'` (linha 91)
- Tornar o campo de Origem da Venda readonly/desabilitado com valor fixo "Loja Online"

---

## Problema 7: Finalizar Venda Digital - Adequar quadros e modais conforme Nova Venda

A tela `VendasFinalizarDigital.tsx` (1943 linhas) precisa ser verificada para garantir que todos os quadros (Cliente, Produtos, Acessorios, Trade-In, Pagamentos, Garantias, Resumo) e modais (Buscar Cliente, Novo Cliente, Selecionar Produto, etc.) seguem exatamente o mesmo modelo visual e funcional da `VendasNova.tsx`.

**Correcao em `src/pages/VendasFinalizarDigital.tsx`:**
- Verificar e alinhar visualmente os modais de selecao de produto (max-w, colunas, filtros)
- Verificar presenca da secao de Garantia Extendida (existente na VendasNova mas pode estar ausente ou diferente na FinalizarDigital)
- Garantir que o quadro de pagamentos usa `PagamentoQuadro` com os mesmos parametros
- Verificar a secao de resumo financeiro (Lucro, Margem, Custo)
- Adicionar secao de Garantia Extendida se nao existir

---

## Problema 8: Venda Balcao registra acessorio mas coluna Produto no Historico nao identifica como "Acessorio"

Quando uma venda e registrada pela aba Venda Balcao (`VendasAcessorios.tsx`), os dados sao salvos com `itens: []` e `acessorios: [...]`. No Historico de Vendas (`Vendas.tsx`), a coluna Produto mostra `modelos` que vem de `venda.itens.map(i => i.produto)`, resultando em "-" ou vazio para vendas so de acessorios.

**Correcao**: ja coberta pelo Problema 4 - a logica de exibicao da coluna Produto sera ajustada para identificar e exibir "Acessorio" quando a venda so tem acessorios.

---

## Secao Tecnica

| Arquivo | Alteracoes |
|---------|-----------|
| `src/pages/VendasConferenciaGestor.tsx` | Redesenhar painel lateral: layout fixed full-height (modelo Financeiro); adicionar secoes de Acessorios, Trade-Ins, Comprovantes, Garantia Extendida |
| `src/utils/vendasApi.ts` | Adicionar campos opcionais `garantiaExtendida` e `garantiaItens` na interface `Venda` |
| `src/pages/VendasNova.tsx` | Incluir `garantiaExtendida` e `garantiaItens` no objeto `vendaData` ao registrar venda |
| `src/pages/VendasAcessorios.tsx` | Adicionar botoes +/- na coluna Qtd dos acessorios com validacao de estoque |
| `src/pages/Vendas.tsx` | Renomear filtro "Modelo" para "Produto"; exibir "Acessorio" na coluna quando venda e so de acessorios; ajustar busca do filtro para incluir acessorios |
| `src/pages/VendasPendentesDigitais.tsx` | Usar `obterNomeColaborador` do cadastroStore para resolver nomes reais |
| `src/pages/VendasNovaDigital.tsx` | Alterar origemVenda default para "Loja Online" |
| `src/pages/VendasFinalizarDigital.tsx` | Alterar origemVenda default para "Loja Online"; campo desabilitado; alinhar modais e quadros com VendasNova; adicionar Garantia Extendida se ausente |

