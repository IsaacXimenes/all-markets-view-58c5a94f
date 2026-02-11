

## Drill-down em Valores da Conferencia Diaria e Remuneracao Motoboy

### 1. Conferencia Diaria - Drill-down nos Valores por Metodo de Pagamento

**Arquivo**: `src/pages/GestaoAdministrativa.tsx`

**O que muda**:
- Os valores na coluna "Valor" (R$ X.XXX,XX) de cada metodo de pagamento se tornam clicaveis (botao estilizado como link).
- Ao clicar, abre o modal "Extrato de Composicao do Valor" ja existente (reutiliza `modalDetalhesOpen`), porem com colunas atualizadas.

**Colunas do modal atualizado**:
| Coluna | Descricao |
|--------|-----------|
| ID da Venda | Link/referencia da venda (font-mono) |
| Colaborador/Vendedor | Nome resolvido via `colaboradores` |
| Composicao do Valor | Itens da venda concatenados (ex: "iPhone 15 Pro Max + Capinha") |
| Valor da Transacao | Valor especifico daquele pagamento para o metodo selecionado |
| Comprovante | Miniatura clicavel do comprovante anexado ao pagamento |

**Detalhes tecnicos**:
- Atualizar `VendaDrillDown` em `gestaoAdministrativaApi.ts` para incluir `composicao: string` (itens concatenados) e `comprovante?: string`, `comprovanteNome?: string`.
- Na funcao `getVendasPorDiaMetodo`, popular `composicao` concatenando `v.itens.map(i => i.produto).join(' + ')` mais acessorios se houver, e extrair `comprovante`/`comprovanteNome` do pagamento correspondente.
- No JSX da celula de Valor na tabela, envolver o `formatCurrency(valor)` em um `<button>` com estilo de link que chama `handleAbrirDrillDown(conf, metodo)`.
- No modal de drill-down (linhas 569-600), adicionar as colunas "Composicao" e "Comprovante".
- Para o comprovante: exibir miniatura (img 32x32px) clicavel que abre um segundo dialog com a imagem em tamanho real. Reutilizar o padrao do `ComprovantePreview` existente ou implementar inline com estado `imagemExpandida`.

### 2. Remuneracao Motoboy - Drill-down no Valor Total

**Arquivo**: `src/pages/RHMotoboyRemuneracao.tsx`

**O que muda**:
- O valor na coluna "Valor" de cada remuneracao se torna clicavel.
- Ao clicar, abre modal "Detalhamento de Entregas e Remuneracao".

**Colunas do modal**:
| Coluna | Descricao |
|--------|-----------|
| ID da Venda | Referencia da venda que gerou a entrega |
| Vendedor | Quem solicitou o servico |
| Produto | Descricao do item entregue |
| Localizacao | Endereco/ponto de entrega |
| Valor da Entrega | Taxa de entrega (100% motoboy) |
| Valor da Venda | Valor total da transacao |

**Detalhes tecnicos**:
- Criar funcao `getDemandasPorRemuneracao(motoboyId, periodoInicio, periodoFim)` em `motoboyApi.ts` que retorna as demandas do periodo com dados cruzados das vendas (busca vendas que tem `motoboyId` correspondente e `tipoRetirada === 'Entrega'`).
- Adicionar estado `modalDrilldownOpen` e `remuneracaoSelecionada` no componente.
- Envolver o valor em `<button>` estilizado como link.
- Criar o modal com Dialog padrao `max-w-4xl` e tabela interna.

### 3. API - Novas funcoes e ajustes

**Arquivo**: `src/utils/gestaoAdministrativaApi.ts`
- Expandir interface `VendaDrillDown` com campos: `composicao`, `comprovante`, `comprovanteNome`.
- Atualizar `getVendasPorDiaMetodo` para popular os novos campos a partir de `v.itens`, `v.acessorios` e `p.comprovante`.

**Arquivo**: `src/utils/motoboyApi.ts`
- Criar funcao `getDetalheEntregasRemuneracao(motoboyId, periodoInicio, periodoFim)` que cruza demandas com vendas para retornar os dados necessarios ao modal.

### 4. Consistencia Visual
- Ambos os modais seguem o padrao existente: `max-w-4xl`, `max-h-[80vh]`, `overflow-y-auto`.
- Valores clicaveis usam `text-primary underline cursor-pointer hover:text-primary/80`.
- Comprovante miniatura: `h-8 w-8 rounded object-cover border cursor-pointer` com Dialog de expansao.
- Responsividade garantida com `overflow-x-auto` nas tabelas internas dos modais.

