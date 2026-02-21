

## Rastreabilidade Cruzada e Dashboard Unificado de Custos por Origem

### Resumo

Implementar o "DNA da Peca" -- cada peca em uma OS carrega 3 selos (Origem do Servico, Origem da Peca, Valor de Custo Real) -- e consolidar os custos em 4 cards mestres exibidos de forma identica na Assistencia, Financeiro e Painel Geral, com grafico de composicao no Dashboard.

---

### 1. Mudancas no Modelo de Dados

**Arquivo: `src/utils/assistenciaApi.ts`**

Adicionar campos na interface `PecaServico`:

- `origemServico?: 'Balcao' | 'Garantia' | 'Estoque'` -- herdado automaticamente do campo `origemOS` da OS
- `origemPeca?: 'Consignado' | 'Estoque Thiago' | 'Retirada de Pecas' | 'Fornecedor' | 'Manual'` -- identificado no momento da selecao
- `valorCustoReal?: number` -- valor de custo efetivo (do estoque, do lote consignado ou do desmonte)

**Nova funcao utilitaria: `calcularCustosPorOrigem(ordensServico[])`**

Retorna um objeto com:
- `custoBalcao`: soma do valorCustoReal de pecas onde origemServico === 'Balcao'
- `custoGarantia`: soma onde origemServico === 'Garantia'
- `custoEstoque`: soma onde origemServico === 'Estoque'
- `investimentoConsignados`: soma onde origemPeca === 'Consignado' e status de pagamento pendente

Esta funcao aceita um array filtrado de OS, permitindo reutilizacao em todos os contextos.

---

### 2. Preenchimento Automatico dos Selos

**Arquivos: `src/pages/OSAssistenciaNova.tsx` e `src/pages/OSAssistenciaEditar.tsx`**

#### 2.1. Origem do Servico
- No momento de salvar a OS, cada peca recebe `origemServico` copiado do `origemOS` da OS (mapeamento: `'Venda'`/`'Balcao'` -> `'Balcao'`, `'Garantia'` -> `'Garantia'`, `'Estoque'` -> `'Estoque'`)

#### 2.2. Origem da Peca
- Ao selecionar peca no estoque via modal:
  - Se `peca.loteConsignacaoId` existir -> `origemPeca = 'Consignado'`
  - Se `peca.origem === 'Retirada de Peca'` -> `origemPeca = 'Retirada de Pecas'`
  - Senao -> `origemPeca = 'Estoque Thiago'`
- Ao selecionar peca de fornecedor -> `origemPeca = 'Fornecedor'`
- Peca manual sem estoque -> `origemPeca = 'Manual'`

#### 2.3. Valor de Custo Real
- Estoque / Consignado: usa `peca.valorCusto` do registro em `pecasApi`
- Retirada de Pecas: usa `peca.valorCusto` atribuido no momento do desmonte (ja existente no `pecasApi`)
- Fornecedor: usa o valor informado na solicitacao
- Manual: usa o valor digitado pelo usuario

---

### 3. Componente Compartilhado: Cards de Custo por Origem

**Novo arquivo: `src/components/assistencia/CustoPorOrigemCards.tsx`**

Componente reutilizavel que recebe `ordensServico: OrdemServico[]` e exibe 4 StatsCards:

| Card | Icone | Cor | Calculo |
|---|---|---|---|
| Custo Total - Balcao | Wrench | Azul | Soma valorCustoReal onde origemServico='Balcao' |
| Custo Total - Garantia | Shield | Vermelho | Soma valorCustoReal onde origemServico='Garantia' |
| Custo Total - Estoque | Package | Verde | Soma valorCustoReal onde origemServico='Estoque' |
| Investimento Consignados | PackageCheck | Roxo | Soma valorCustoReal onde origemPeca='Consignado' |

Props opcionais:
- `titulo?: string` para contextualizar (ex: "Custos desta Nota")
- `filtroNotas?: string[]` para filtrar por IDs de OS especificos

---

### 4. Integracao nos Modulos

#### 4.1. Nova Assistencia (`OSAssistenciaNova.tsx`)
- Importar `CustoPorOrigemCards`
- Exibir acima do quadro de pecas, calculando com base nas pecas ja adicionadas ao formulario (preview em tempo real)

#### 4.2. Edicao de OS (`OSAssistenciaEditar.tsx`)
- Importar `CustoPorOrigemCards`
- Exibir acima do quadro de pecas, calculando com base nas pecas da OS sendo editada

#### 4.3. Financeiro - Notas Pendentes (`FinanceiroNotasAssistencia.tsx`)
- No dialog de conferencia (ao clicar "Conferir"), exibir os cards filtrados para as OS vinculadas aquela nota especifica
- Buscar as OS via `getOrdemServicoById` para cada item da nota

#### 4.4. Painel Geral / Dashboard (`Dashboard.tsx`)
- Importar `CustoPorOrigemCards` com todas as OS do sistema
- Adicionar secao "Custos de Assistencia" abaixo dos cards de garantias
- Incluir grafico de composicao (PieChart do Recharts) mostrando distribuicao percentual por Origem da Peca (Consignado vs Estoque Thiago vs Retirada de Pecas vs Fornecedor)

---

### 5. Badges Visuais no Quadro de Pecas

**Arquivos: `OSAssistenciaNova.tsx` e `OSAssistenciaEditar.tsx`**

Exibir os 3 selos como badges compactos abaixo do nome da peca selecionada:
- Badge azul: Origem do Servico (Balcao/Garantia/Estoque)
- Badge roxo: Origem da Peca (Consignado/Estoque Thiago/Retirada)
- Badge verde: Valor de Custo Real formatado

---

### 6. Grafico de Composicao no Dashboard

**Arquivo: `Dashboard.tsx`**

- Usar `PieChart` + `Pie` + `Cell` do Recharts (ja instalado)
- Dados: agrupar pecas de todas as OS por `origemPeca` e somar `valorCustoReal`
- Cores: Consignado (roxo), Estoque Thiago (azul), Retirada de Pecas (laranja), Fornecedor (verde)
- Exibir legenda com percentuais

---

### Sequencia de Implementacao

1. Atualizar interface `PecaServico` em `assistenciaApi.ts` com os 3 novos campos
2. Criar funcao `calcularCustosPorOrigem` em `assistenciaApi.ts`
3. Criar componente `CustoPorOrigemCards.tsx`
4. Atualizar `OSAssistenciaNova.tsx`: preencher selos automaticamente + exibir cards + badges
5. Atualizar `OSAssistenciaEditar.tsx`: preencher selos automaticamente + exibir cards + badges
6. Atualizar `FinanceiroNotasAssistencia.tsx`: exibir cards no dialog de conferencia
7. Atualizar `Dashboard.tsx`: exibir cards + grafico de composicao
8. Atualizar mock data das OS existentes com valores de origemServico/origemPeca/valorCustoReal

### Arquivos Afetados

- `src/utils/assistenciaApi.ts` (interface + funcao + mock data)
- `src/components/assistencia/CustoPorOrigemCards.tsx` (novo)
- `src/pages/OSAssistenciaNova.tsx` (selos + cards + badges)
- `src/pages/OSAssistenciaEditar.tsx` (selos + cards + badges)
- `src/pages/FinanceiroNotasAssistencia.tsx` (cards no dialog)
- `src/components/layout/Dashboard.tsx` (cards + grafico)

