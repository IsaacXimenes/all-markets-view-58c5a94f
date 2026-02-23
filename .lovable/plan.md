

# Padronizacao UX do Modulo de Vendas

## Escopo da Mudanca

Este plano aborda 4 frentes de trabalho para unificar a experiencia do modulo de Vendas, usando a tela "Nova Venda" (`VendasNova.tsx`) como referencia padrao.

---

## 1. Padronizacao de Layout nas Telas de Conferencia e Finalizacao

### Situacao Atual

- **VendasNova.tsx** (3647 linhas): Layout completo com Cards estruturados: Info da Venda, Cliente, Itens + Acessorios, Trade-In, Logistica/Retirada, Pagamentos (via `PagamentoQuadro`), Resumo Financeiro com lucro/margem.
- **VendasFinalizarDigital.tsx** (1956 linhas): Ja segue estrutura similar, mas faltam alguns quadros (garantia extendida, downgrade detection, trade-in com tipo de entrega obrigatorio).
- **VendasConferenciaLancamento.tsx** (835 linhas): Modal de aprovacao mostra apenas grid basico (ID, Cliente, Valor, Data) + lista simples de produtos/pagamentos. Nao exibe acessorios detalhados, trade-ins, resumo financeiro, taxa de entrega.
- **VendasConferenciaGestor.tsx** (1166 linhas): Painel lateral mostra informacoes parciais. Faltam: quadro de itens com tabela completa, quadro de trade-in, resumo financeiro com lucro/margem/custo, quadro de logistica.

### Acoes

#### 1.1 Criar componente reutilizavel `VendaResumoCompleto`
- Novo arquivo: `src/components/vendas/VendaResumoCompleto.tsx`
- Recebe uma `VendaComFluxo` e renderiza todos os quadros padrao:
  - Card "Informacoes da Venda" (ID, numero, loja, vendedor, origem, data)
  - Card "Cliente" (nome, CPF, telefone, email, cidade, historico)
  - Card "Itens da Venda" (tabela com produto, IMEI, valor recomendado, valor de venda, custo)
  - Card "Acessorios" (tabela com descricao, quantidade, valor unitario, valor total)
  - Card "Trade-In / Base de Troca" (tabela com modelo, condicao, IMEI, valor, badges de entrega/anexos)
  - Card "Logistica" (tipo retirada, local, taxa entrega, motoboy)
  - Card "Pagamentos" (tabela com meio, conta destino, parcelas, valor final, taxa, valor liquido, comprovante)
  - Card "Resumo Financeiro" (subtotal, acessorios, trade-in, taxa entrega, garantia extendida, total, custo total, lucro, margem %)
- Props: `readOnly?: boolean`, `showCustos?: boolean` (para controlar visibilidade de custos/lucro por perfil)

#### 1.2 Atualizar VendasConferenciaLancamento
- Substituir o modal de aprovacao simples pelo componente `VendaResumoCompleto`
- Manter botoes de acao (Conferir / Cancelar) no footer do modal

#### 1.3 Atualizar VendasConferenciaGestor
- Substituir o conteudo do painel lateral pelo componente `VendaResumoCompleto`
- Manter secao de validacao de pagamentos (checkboxes) e botoes de acao (Aprovar / Recusar)

#### 1.4 Atualizar VendasFinalizarDigital
- Adicionar deteccao automatica de Upgrade/Downgrade (ja presente em VendasNova)
- Adicionar suporte a garantia extendida
- Adicionar validacao de tipo de entrega obrigatorio nos trade-ins

---

## 2. Inteligencia de Troca: Aba de Valores Recomendados

### Acoes

#### 2.1 Criar tabela de precos de referencia
- Novo arquivo: `src/utils/valoresRecomendadosTrocaApi.ts`
- Contera uma tabela mock com valores sugeridos de compra de aparelhos usados por modelo e condicao
- Funcao `getValoresRecomendadosTroca()` retorna a lista completa
- Funcao `getValorRecomendado(modelo, condicao)` retorna valor sugerido especifico

#### 2.2 Criar componente `ValoresRecomendadosTroca`
- Novo arquivo: `src/components/vendas/ValoresRecomendadosTroca.tsx`
- Tabela de referencia com colunas: Modelo, Condicao (Novo/Semi-novo), Valor Min, Valor Max, Valor Sugerido
- Busca por modelo com filtro em tempo real
- Botao "Usar este valor" que preenche o campo de valor no modal de trade-in

#### 2.3 Integrar nas telas de venda
- Em `VendasNova.tsx`, `VendasFinalizarDigital.tsx` e `VendasEditar.tsx`: dentro do modal de Trade-In, adicionar uma aba/secao "Valores Recomendados" abaixo do campo de valor, com o componente `ValoresRecomendadosTroca`

---

## 3. Travas de Seguranca

### 3.1 Bloqueio de Edicao na Conferencia de Lancamento
- Em `VendasConferenciaLancamento.tsx`: quando uma venda tem `statusFluxo === 'Conferencia Gestor'` ou qualquer status posterior, o botao "Editar" (Pencil) deve ser removido ou desabilitado
- Na tabela, vendas com status "Conferencia Gestor" ou superior nao devem exibir o botao de edicao
- Atualmente a linha 633 ja verifica `venda.statusFluxo !== 'Finalizado'` para exibir o botao de edicao, mas nao bloqueia "Com o Gestor" -- sera corrigido para bloquear quando `statusFluxo` nao for `'Aguardando Conferencia'`, `'Recusada - Gestor'` ou `'Feito Sinal'`

### 3.2 Exclusao do campo "Vai na primeira rota"
- Busca completa realizada: **nao encontrado** em nenhum arquivo do projeto
- Termos buscados: "vai na primeira rota", "primeiraRota", "primeira_rota", "primeira rota"
- Este campo ja foi removido ou nunca foi implementado. Nenhuma acao necessaria.

---

## 4. Padronizacao de Modais de Edicao

### Acoes

#### 4.1 Atualizar modal de aprovacao em VendasConferenciaLancamento
- Usar `VendaResumoCompleto` dentro do `DialogContent` com hierarquia: Cliente > Itens > Pagamentos > Totais
- Layout de pagamentos em quadro igual ao `PagamentoQuadro` (read-only)

#### 4.2 Atualizar painel lateral em VendasConferenciaGestor
- Mesma hierarquia de informacoes do `VendaResumoCompleto`
- Secao de validacao de pagamentos mantida apos o resumo

#### 4.3 Atualizar VendasEditarGestor
- Garantir que os Cards de edicao sigam a mesma ordem e layout da Nova Venda
- Adicionar Card de Acessorios e Card de Trade-In que atualmente nao existem nesta tela

---

## Detalhes Tecnicos

### Arquivos a criar
1. `src/components/vendas/VendaResumoCompleto.tsx` -- componente reutilizavel de resumo
2. `src/utils/valoresRecomendadosTrocaApi.ts` -- API de valores recomendados para troca

### Arquivos a modificar
1. `src/pages/VendasConferenciaLancamento.tsx` -- modal padronizado + trava de seguranca
2. `src/pages/VendasConferenciaGestor.tsx` -- painel lateral padronizado
3. `src/pages/VendasFinalizarDigital.tsx` -- adicionar funcionalidades faltantes
4. `src/pages/VendasNova.tsx` -- integrar aba de valores recomendados no modal de trade-in
5. `src/pages/VendasEditar.tsx` -- integrar aba de valores recomendados no modal de trade-in
6. `src/pages/VendasEditarGestor.tsx` -- padronizar layout

### Componentes reutilizados
- `PagamentoQuadro` -- ja existe, sera usado em modo read-only nas conferencias
- `ComprovantePreview` -- ja existe, sera usado consistentemente
- `AutocompleteLoja` / `AutocompleteColaborador` -- ja existem

### Ordem de implementacao
1. Criar `VendaResumoCompleto` (base para tudo)
2. Criar `valoresRecomendadosTrocaApi` e `ValoresRecomendadosTroca`
3. Atualizar `VendasConferenciaLancamento` (modal + trava)
4. Atualizar `VendasConferenciaGestor` (painel lateral)
5. Atualizar `VendasFinalizarDigital` (funcionalidades faltantes)
6. Integrar valores recomendados em `VendasNova` e `VendasEditar`
7. Atualizar `VendasEditarGestor`

