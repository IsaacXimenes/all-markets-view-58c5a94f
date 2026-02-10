
## Central de Despesas -- Modulo Unificado

### Resumo

Substituir as duas abas separadas ("Despesas Fixas" e "Despesas Variaveis") por uma unica aba **"Central de Despesas"** no modulo Financeiro. Essa nova tela unifica o lancamento, controle de status, automacao de recorrencia, dashboard de saude financeira e agenda eletronica por despesa.

---

### 1. Refatoracao da Interface `Despesa` (`src/utils/financeApi.ts`)

Campos adicionados a interface existente:

| Campo | Tipo | Descricao |
|---|---|---|
| `lojaId` | `string` | UUID da loja (obrigatorio) |
| `status` | `'Agendado' \| 'Vencido' \| 'Pago'` | Controle de contas a pagar |
| `categoria` | `string` | Ex: Aluguel, Energia, Marketing, Salarios, Impostos, Material de Escritorio |
| `dataVencimento` | `string` | Data de vencimento (YYYY-MM-DD) |
| `dataPagamento` | `string \| null` | Quando foi pago |
| `recorrente` | `boolean` | Se e despesa recorrente |
| `periodicidade` | `'Mensal' \| 'Trimestral' \| 'Anual' \| null` | Periodicidade da recorrencia |
| `pagoPor` | `string \| null` | Nome do usuario que marcou como Pago |

Todos os dados mockados existentes serao migrados para incluir os novos campos com valores padrao.

Novas funcoes na API:
- `pagarDespesa(id, contaDestino, usuarioNome)`: muda status para 'Pago', registra dataPagamento e pagoPor
- `provisionarProximoPeriodo(id)`: cria copia da despesa com dataVencimento avancada e status 'Agendado'
- `atualizarStatusVencidos()`: percorre despesas e muda 'Agendado' para 'Vencido' se dataVencimento < hoje

Categorias pre-definidas (constante exportada):
```
CATEGORIAS_DESPESA = ['Aluguel', 'Energia', 'Agua', 'Internet/Telefonia', 'Salarios', 'Impostos', 'Marketing', 'Estoque', 'Manutencao', 'Material de Escritorio', 'Frete/Logistica', 'Outros']
```

---

### 2. Nova Pagina: `src/pages/FinanceiroCentralDespesas.tsx`

Substitui `FinanceiroDespesasFixas.tsx` e `FinanceiroDespesasVariaveis.tsx`.

#### 2.1. Dashboard de Saude Financeira (Cards no Topo)

Quatro cards para a competencia selecionada:
- **Total Realizado**: soma das despesas com status `Pago`
- **Total Previsto**: soma das despesas com status `Agendado` ou `Vencido`
- **Custo Total do Periodo**: Realizado + Previsto
- **Vencidas**: quantidade de despesas com status `Vencido` (destaque vermelho)

#### 2.2. Filtros

- **Competencia** (Mes/Ano): seletor que filtra a listagem
- **Loja**: dropdown das lojas ativas (Cadastros)
- **Categoria**: dropdown das categorias
- **Status**: Todos / Agendado / Vencido / Pago
- **Tipo**: Todos / Fixa / Variavel
- **Busca Global**: campo de texto para buscar por descricao

#### 2.3. Formulario de Lancamento (Card expansivel)

Campos:
- Tipo (Fixa / Variavel) -- ao selecionar Fixa, habilita Recorrente e Periodicidade
- Descricao
- Valor (R$ com mascara)
- Loja (obrigatorio, Autocomplete do Cadastros)
- Categoria (dropdown)
- Data de Vencimento
- Competencia (select MMM-YYYY)
- Conta de Origem (select do Cadastros > Contas Financeiras)
- Recorrente (checkbox, visivel se tipo=Fixa)
- Periodicidade (Mensal/Trimestral/Anual, visivel se recorrente=true)
- Observacoes

#### 2.4. Tabela Unificada

Colunas:
| Coluna | Descricao |
|---|---|
| Checkbox | Selecao em lote |
| ID | Codigo da despesa |
| Tipo | Badge: azul=Fixa, laranja=Variavel |
| Categoria | Nome da categoria |
| Descricao | Texto descritivo |
| Loja | Nome da loja (resolvido via Cadastros) |
| Vencimento | Data de vencimento formatada |
| Competencia | MMM-YYYY |
| Valor | R$ XXX.XXX,XX |
| Status | Badge: verde=Pago, amarelo=Agendado, vermelho=Vencido |
| Acoes | Pagar / Excluir / Agenda |

Cores de linha conforme `statusColors.ts`:
- Pago: `bg-green-500/10`
- Agendado: `bg-yellow-500/10`
- Vencido: `bg-red-500/10`

#### 2.5. Acao "Pagar"

Ao clicar em "Pagar":
1. Abre modal de confirmacao
2. Exibe dados da despesa (descricao, valor, conta)
3. Botao "Confirmar Pagamento"
4. Ao confirmar: status muda para `Pago`, dataPagamento = hoje, pagoPor = usuario logado
5. Se a despesa for `recorrente`, abre segundo modal: "Deseja provisionar para o proximo periodo?"
   - Se sim: cria nova despesa identica com dataVencimento avancada e status `Agendado`
   - Se nao: apenas fecha

#### 2.6. Agenda Eletronica por Despesa

Botao de agenda (icone CalendarDays) em cada linha. Abre o `AgendaEletronicaModal` existente com `chaveContexto = despesa_{id}`. Indicador de ponto vermelho se houver anotacao importante.

#### 2.7. Acoes em Lote

- Mudar Competencia em lote (mantido)
- Exportar CSV

---

### 3. Alteracoes no Roteamento e Layout

**`src/components/layout/FinanceiroLayout.tsx`**:
- Remover as abas "Despesas Fixas" e "Despesas Variaveis"
- Adicionar aba unica: `{ name: 'Central de Despesas', href: '/financeiro/despesas', icon: MinusCircle }`

**`src/App.tsx`**:
- Remover rotas `/financeiro/despesas-fixas` e `/financeiro/despesas-variaveis`
- Adicionar rota `/financeiro/despesas` apontando para `FinanceiroCentralDespesas`

---

### 4. Atualizacao Automatica de Status

Na inicializacao da pagina, chamar `atualizarStatusVencidos()` para marcar automaticamente como `Vencido` qualquer despesa cuja `dataVencimento < hoje` e `status === 'Agendado'`.

---

### 5. Arquivos Impactados

| Arquivo | Acao |
|---|---|
| `src/utils/financeApi.ts` | Refatorar interface Despesa, adicionar campos, novas funcoes, atualizar dados mockados |
| `src/pages/FinanceiroCentralDespesas.tsx` | **Novo arquivo** -- tela unificada |
| `src/components/layout/FinanceiroLayout.tsx` | Substituir 2 abas por 1 |
| `src/App.tsx` | Atualizar rotas |
| `src/pages/FinanceiroDespesasFixas.tsx` | Pode ser removido (a rota sera redirecionada) |
| `src/pages/FinanceiroDespesasVariaveis.tsx` | Pode ser removido (a rota sera redirecionada) |

---

### 6. Dados Mockados Atualizados

As 6 despesas existentes serao migradas com os novos campos (lojaId usando UUIDs reais, categorias atribuidas, status baseado na data, recorrente para fixas). Serao adicionadas mais 4-6 despesas para cobrir cenarios de Agendado, Vencido e Pago em diferentes lojas e categorias.
