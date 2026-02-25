

## Plano: Dashboard de Performance em Vendas + Game de Metas + Colunas Expandidas no Historico

### Visao Geral

Implementar 3 grandes frentes no modulo de Vendas:
1. Painel de rentabilidade detalhado na tela Nova Venda (VendasNova.tsx)
2. Game de Metas na Conferencia de Lancamento (VendasConferenciaLancamento.tsx) + cadastro de metas
3. Colunas expandidas no Historico de Vendas (Vendas.tsx)

---

### 1. Dashboard de Performance no Lancamento (VendasNova.tsx)

Adicionar um componente `PainelRentabilidadeVenda` ao final da pagina de Nova Venda, posicionado entre o card de "Resumo da Venda" e os "Botoes Finais" (apos linha ~2448).

#### 1.1 Novo Componente: `src/components/vendas/PainelRentabilidadeVenda.tsx`

Componente isolado que recebe como props todos os dados necessarios para calcular as metricas. Sera dividido em 6 blocos visuais usando cards colapsaveis (Collapsible):

**a. Bloco Aparelhos**
- Para cada item em `itens[]`: exibir produto, valorCusto, valorVenda, lucro (valorVenda - valorCusto), margem ((lucro/valorCusto)*100)
- Totalizar ao final

**b. Bloco Acessorios**
- Para cada item em `acessoriosVenda[]`: buscar `valorCusto` via `getAcessorioById(acessorioId)` do `acessoriosApi.ts`, multiplicar pela quantidade
- Calcular lucro = valorTotal - (valorCusto * quantidade)
- Margem = (lucro / custoTotal) * 100

**c. Bloco Base de Troca (Trade-In)**
- Para cada trade-in: exibir modelo, valorCompraUsado
- Buscar `valorSugerido` via `getValoresRecomendados()` do `valoresRecomendadosTrocaApi.ts` (match pelo modelo)
- Indicador visual:
  - Se valorCompraUsado < valorSugerido: seta verde + "Economia: R$ X"
  - Se valorCompraUsado > valorSugerido: seta vermelha + "Acima do Recomendado: R$ X"

**d. Bloco Garantia Extendida**
- Plano, valor, comissao sobre garantia (10% do valor do plano)

**e. Bloco Logistica (Entrega)**
- Valor cobrado do cliente (taxaEntrega)
- Custo parametrizado (obtido do `taxasEntregaApi.ts` via localEntregaId)
- Diferenca = valor cobrado - custo parametrizado (positivo = lucro, negativo = prejuizo)
- Nota: "Custo parametrizado provisionado 100% para o motoboy"

**f. Bloco Resumo Consolidado**
- Custo Total = soma custos aparelhos + custos acessorios + valorCompraUsado dos trade-ins
- Valor de Venda Total = total da venda
- Lucro Bruto = Valor de Venda Total - Custo Total
- Comissao Hibrida:
  - Comissao Garantia = valorGarantiaExtendida * 0.10
  - Lucro Restante = Lucro Bruto - Comissao Garantia
  - Se loja = LOJA_ONLINE_ID ou LOJA_MATRIZ_ID: comissao = Lucro Restante * 0.06
  - Senao: comissao = Lucro Restante * 0.10
  - Comissao Final = Comissao Garantia + Comissao sobre Lucro Restante
- Taxas de Cartao: calcular usando `calcularValoresVenda` do `taxasCartao.ts` com dados dos pagamentos
- Lucro Real (Liquido) = Valor de Venda Total - Custo Total - Comissao Final - Custo Entrega Parametrizado - Taxas Cartao
- Secao "Discriminacao de Valores" com tabela detalhada mostrando cada componente

#### 1.2 Integracao com VendasNova.tsx

- Importar e renderizar `PainelRentabilidadeVenda` apos o card de Resumo (linha ~2448)
- Passar props: itens, acessoriosVenda, tradeIns, garantiaExtendida, taxaEntrega, localEntregaId, lojaVenda, pagamentos, total
- O painel atualiza em tempo real via useMemo

#### 1.3 Novo Utilitario: `src/utils/calculoRentabilidadeVenda.ts`

Centralizar toda a logica de calculo em funcoes puras reutilizaveis:
- `calcularRentabilidadeAparelhos(itens)`
- `calcularRentabilidadeAcessorios(acessoriosVenda, getAcessorioById)`
- `calcularAnaliseTradeIn(tradeIns, getValoresRecomendados)`
- `calcularComissaoHibrida(lucro, valorGarantia, lojaVendaId)`
- `calcularLucroReal(params)` - calculo completo do lucro liquido
- `calcularTaxasCartao(pagamentos)` - soma de taxas de todos os pagamentos

---

### 2. Game de Metas (VendasConferenciaLancamento.tsx)

#### 2.1 Nova API: `src/utils/metasApi.ts`

Interface e CRUD para metas mensais por loja:

```text
interface MetaLoja {
  id: string;
  lojaId: string;
  mes: number;       // 1-12
  ano: number;
  metaFaturamento: number;    // R$
  metaAcessorios: number;     // Unidades
  metaGarantia: number;       // R$ ou conversao %
  dataCriacao: string;
  ultimaAtualizacao: string;
}
```

Persistencia via localStorage (`metas_lojas_data`).
Funcoes: `getMetas()`, `getMetaByLojaEMes(lojaId, mes, ano)`, `addMeta()`, `updateMeta()`.

#### 2.2 Nova Pagina: `src/pages/CadastrosMetas.tsx`

Adicionar ao modulo de Cadastros (nova aba "Metas"):
- Select de Loja + Select de Mes/Ano
- Campos: Meta Faturamento (R$), Meta Acessorios (unidades), Meta Garantia (R$)
- Tabela com metas cadastradas, edicao inline ou modal
- Botao salvar persiste no localStorage

Adicionar rota em `App.tsx`: `/cadastros/metas`
Adicionar tab em `CadastrosLayout.tsx`: `{ name: 'Metas', href: '/cadastros/metas', icon: Target }`

#### 2.3 Painel de Metas em VendasConferenciaLancamento.tsx

Apos os cards de resumo financeiro (apos linha ~426), adicionar componente `PainelMetasLoja`:
- Buscar meta do mes atual via `getMetaByLojaEMes()`
- Calcular realizacao acumulada do mes (soma de vendas filtradas por loja e mes atual)
- Exibir 3 barras de progresso (componente `Progress`):
  - **Faturamento**: Acumulado vs Meta, percentual, valor faltante
  - **Acessorios**: Total unidades vendidas vs Meta, percentual
  - **Garantia**: Total R$ garantias vendidas vs Meta, percentual
- Cores: verde >= 80%, amarelo >= 50%, vermelho < 50%
- Se nao houver meta cadastrada para o mes/loja, exibir mensagem: "Meta nao cadastrada para este periodo"

---

### 3. Expansao do Historico de Vendas (Vendas.tsx)

#### 3.1 Novas Colunas na Tabela (apos linha ~412)

Adicionar entre as colunas existentes (reorganizar):

| Coluna | Fonte | Calculo |
|--------|-------|---------|
| V. Aparelhos | venda.itens | soma de item.valorVenda |
| V. Acessorios | venda.acessorios | soma de acessorio.valorTotal |
| V. Garantia | venda.garantiaExtendida | .valor ou 0 |
| Custo Total | itens + acessorios | soma valorCusto * qtd (itens) + soma custoAcessorio * qtd |
| V. Final (Bruto) | venda.total | total ja calculado |
| Lucro Real | calculoRentabilidade | usar `calcularLucroReal()` do novo utilitario |

#### 3.2 Alteracoes no Componente

- Atualizar `calcularTotaisVenda()` (linha ~75) para retornar campos adicionais: `valorAparelhos`, `valorAcessorios`, `valorGarantia`, `custoTotal`, `lucroReal`
- Adicionar `TableHead` para cada nova coluna
- Adicionar `TableCell` no map de `vendasFiltradas`
- Atualizar totalizador no rodape para incluir novos totais

#### 3.3 Funcao de Calculo Expandida

Usar `calcularLucroReal()` de `calculoRentabilidadeVenda.ts` para calcular o lucro liquido real (descontando comissao, taxas cartao, custo entrega).

---

### Resumo de Arquivos

| Arquivo | Tipo | Alteracao |
|---------|------|-----------|
| `src/utils/calculoRentabilidadeVenda.ts` | Novo | Funcoes puras de calculo de rentabilidade |
| `src/utils/metasApi.ts` | Novo | CRUD de metas mensais por loja com localStorage |
| `src/components/vendas/PainelRentabilidadeVenda.tsx` | Novo | Dashboard de rentabilidade por categoria |
| `src/pages/CadastrosMetas.tsx` | Novo | Tela de cadastro de metas |
| `src/pages/VendasNova.tsx` | Editar | Integrar PainelRentabilidadeVenda |
| `src/pages/VendasConferenciaLancamento.tsx` | Editar | Adicionar painel de metas |
| `src/pages/Vendas.tsx` | Editar | Adicionar colunas expandidas na tabela |
| `src/components/layout/CadastrosLayout.tsx` | Editar | Adicionar tab "Metas" |
| `src/App.tsx` | Editar | Adicionar rota /cadastros/metas |

### Ordem de Implementacao

1. `calculoRentabilidadeVenda.ts` - base de calculos reutilizavel
2. `PainelRentabilidadeVenda.tsx` + integracao com `VendasNova.tsx`
3. `metasApi.ts` + `CadastrosMetas.tsx` + rotas
4. Painel de metas em `VendasConferenciaLancamento.tsx`
5. Colunas expandidas em `Vendas.tsx`

