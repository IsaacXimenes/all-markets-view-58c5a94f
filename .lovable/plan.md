

## Plano: Nova Conta "Dinheiro - Geral" + Movimentacoes entre Contas

### 1. Cadastro da Nova Conta Financeira

**Arquivo:** `src/utils/cadastrosApi.ts`

- Adicionar a conta CTA-020 nos dados mockados, apos CTA-019:
  - id: "CTA-020"
  - nome: "Loja - JK Shopping - Dinheiro - Geral"
  - tipo: "Dinheiro - Geral" (sem coluna extra de categoria)
  - lojaVinculada: "db894e7d" (JK Shopping)
  - cnpj: "62.968.637/0001-23"
  - statusMaquina: "Propria", notaFiscal: true, status: "Ativo"

Nenhuma alteracao na interface `ContaFinanceira` -- o campo `tipo` ja e string livre.

**Arquivo:** `src/pages/CadastrosContasFinanceiras.tsx`

- Adicionar "Dinheiro - Geral" como nova opcao no Select de Tipo no formulario

### 2. Funcionalidade de Movimentacao entre Contas

**Novo arquivo:** `src/utils/movimentacoesEntreContasApi.ts`

- Interface `MovimentacaoEntreConta`:
  - id, transacaoId (UUID compartilhado entre os 2 lancamentos)
  - contaOrigemId, contaDestinoId
  - valor (number)
  - dataHora (string ISO)
  - observacao (motivo: Sangria, Suprimento, Deposito, etc.)
  - usuarioId, usuarioNome
- Funcoes:
  - `getMovimentacoesEntreConta()` -- lista todas (localStorage)
  - `addMovimentacaoEntreConta(data)` -- cria movimentacao, persiste no localStorage, gera registro de auditoria

### 3. Interface no Extrato por Conta

**Arquivo:** `src/pages/FinanceiroExtratoContas.tsx`

- Botao "Nova Movimentacao" (icone ArrowLeftRight) junto aos filtros
- Modal de transferencia com:
  - Select "Conta de Origem" (contas ativas do cadastro)
  - Select "Conta de Destino" (contas ativas, excluindo a origem selecionada)
  - Campo valor com mascara de moeda (InputComMascara)
  - Campo data/hora (preenchido automaticamente, editavel)
  - Campo observacao/motivo (Textarea)
  - Validacoes: origem != destino, valor > 0, campos obrigatorios
- Ao confirmar:
  - Chamar `addMovimentacaoEntreConta`
  - Integrar movimentacoes no calculo do `useMemo` de `movimentacoesPorConta` (saida na origem, entrada no destino)
  - Atualizar estado para refletir imediatamente nos cards
  - Toast de sucesso

### 4. Rastreabilidade e Auditoria

**Arquivo:** `src/pages/CadastrosLogsAuditoria.tsx`

- Adicionar "Movimentacao entre Contas" como opcao no filtro de modulos
- Consumir os logs gerados pela API de movimentacoes e exibir na tabela unificada

### Arquivos modificados/criados

- `src/utils/cadastrosApi.ts` -- nova conta mockada + opcao de tipo
- `src/pages/CadastrosContasFinanceiras.tsx` -- nova opcao "Dinheiro - Geral" no Select de Tipo
- `src/utils/movimentacoesEntreContasApi.ts` -- novo arquivo
- `src/pages/FinanceiroExtratoContas.tsx` -- botao, modal e integracao no calculo
- `src/pages/CadastrosLogsAuditoria.tsx` -- novo modulo de log
