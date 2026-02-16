

## Confirmacao em Duas Etapas com Registro de Usuario e Hora

### Contexto
Os botoes "Registrar Pagamento" e "Confirmar Recebimento" na tela de detalhes da OS precisam de confirmacao em duas etapas, registrando o usuario logado e a data/hora da confirmacao. Apos confirmar, o botao fica desabilitado. Tambem sera removido o botao "Editar" da listagem na aba Nova Assistencia, e os comprovantes do financeiro serao visiveis na consulta da OS.

### Alteracoes

#### 1. Remover botao Editar na listagem (OSAssistencia.tsx)
Remover o botao com icone de lapis (linhas 582-589) da coluna de acoes na tabela.

#### 2. Persistencia de comprovantes (OSAssistenciaDetalhes.tsx)
Corrigir o mapeamento de pagamentos (linhas 84-92) para ler `p.comprovante` e `p.comprovanteNome` dos dados da OS, em vez de strings vazias. Adicionar coluna "Comprovante" na tabela read-only de pagamentos.

#### 3. Dupla confirmacao para "Registrar Pagamento" (OSAssistenciaDetalhes.tsx)

- Importar `useAuthStore` e `AlertDialog` components
- Criar estados: `modalConfirmarPagamento`, `pagamentoConfirmado`, `checkPagamento`
- Ao clicar em "Registrar Pagamento", abrir AlertDialog com:
  - Texto: "Confirme o registro de pagamento para a OS #ID"
  - Exibicao automatica do usuario logado (nome do colaborador) e data/hora atual
  - Checkbox: "Confirmo que os dados de pagamento estao corretos"
  - Botao "Confirmar" habilitado somente com checkbox marcado
- Ao confirmar: executar `handleSalvarPagamentoVendedor()`, registrar na timeline o usuario e hora, setar `pagamentoConfirmado = true`
- Com `pagamentoConfirmado = true`, o botao fica `disabled`

#### 4. Dupla confirmacao para "Confirmar Recebimento" (OSAssistenciaDetalhes.tsx)

- Criar estados: `modalConfirmarRecebimento`, `recebimentoConfirmado`, `checkRecebimento`
- Ao clicar em "Confirmar Recebimento", abrir AlertDialog com:
  - Texto: "Confirme o recebimento da peca para a OS #ID"
  - Exibicao automatica do usuario logado e data/hora atual
  - Checkbox: "Confirmo o recebimento fisico da peca"
  - Botao "Confirmar" habilitado somente com checkbox marcado
- Ao confirmar: executar a logica existente de atualizar status para "Em servico", registrar na timeline com nome do usuario logado (em vez de "Tecnico" generico), setar `recebimentoConfirmado = true`
- Com `recebimentoConfirmado = true`, o botao fica `disabled`

### Detalhes Tecnicos

| Arquivo | Alteracao |
|---|---|
| `src/pages/OSAssistencia.tsx` | Remover botao Editar (linhas 582-589) |
| `src/pages/OSAssistenciaDetalhes.tsx` | Importar useAuthStore e AlertDialog; corrigir leitura de comprovantes; criar modais de dupla confirmacao com registro de usuario/hora para pagamento e recebimento |

**Registro de auditoria nos modais:** Os campos "Responsavel" e "Data/Hora" sao preenchidos automaticamente a partir do `useAuthStore` (colaborador logado) e `new Date()`, exibidos como campos somente leitura (disabled) no modal, garantindo rastreabilidade sem possibilidade de alteracao manual.

**Timeline:** Ao confirmar, o evento na timeline registra o nome do colaborador autenticado (ex: "Joao Gestor") e o timestamp exato da confirmacao, substituindo strings genericas como "Tecnico".

