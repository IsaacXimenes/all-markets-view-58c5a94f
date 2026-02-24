
Para atender às solicitações de padronização do fluxo de Notas de Entrada, o plano consiste em restringir as categorias de produtos e mover a funcionalidade de encaminhamento para assistência para a fase pós-cadastro (detalhamento da nota).

### Alterações Propostas

#### 1. Cadastro de Nova Nota (`src/pages/EstoqueNotaCadastrar.tsx`)
*   **Remover Opção "Usado"**: Garantir que o campo de Categoria no quadro de produtos contenha estritamente apenas "Novo" e "Seminovo".
*   **Desativar Assistência no Lançamento**: 
    *   Remover o botão de chave inglesa (Wrench) e a marcação de assistência das linhas da tabela de produtos.
    *   Ocultar o segundo quadro ("Aparelhos para Análise na Assistência") que aparecia durante o lançamento.
    *   Remover a lógica de criação automática de lote de revisão no `handleSalvar`, pois agora o encaminhamento será feito via detalhes da nota.
    *   Limpar estados e funções auxiliares (`produtosMarcadosAssistencia`, `abrirModalAssistencia`, etc.) para manter o código limpo.

#### 2. Detalhes da Nota (`src/components/estoque/NotaDetalhesContent.tsx`)
*   **Nova Funcionalidade de Encaminhamento**:
    *   Adicionar um botão "Encaminhar para Assistência" na seção de ações da nota (visível apenas para o perfil Estoque).
    *   Implementar um modal que lista os aparelhos com IMEI da nota atual que ainda não foram enviados para assistência.
    *   Nesse modal, o usuário poderá selecionar os itens e informar o motivo individualmente.
    *   Ao confirmar, o sistema criará o `LoteRevisao` e realizará o encaminhamento para a Análise de Tratativas (utilizando as APIs existentes em `loteRevisaoApi.ts`).

---

### Detalhes Técnicos
*   **Impacto no Fluxo**: O usuário primeiro foca 100% no lançamento e conferência dos dados fiscais/físicos da nota. Somente após a nota estar salva (ou durante a conferência posterior), ele decide quais itens precisam de reparo.
*   **Consistência de Dados**: O campo `saudeBateria` continuará sendo preenchido automaticamente como 100% para itens "Novo" e editável para "Seminovo".
*   **APIs Utilizadas**: 
    *   `criarLoteRevisao` e `encaminharLoteParaAssistencia` de `src/utils/loteRevisaoApi.ts`.
    *   `getNotaEntradaById` de `src/utils/notaEntradaFluxoApi.ts`.

### Próximos Passos
1. Limpar a interface de lançamento em `EstoqueNotaCadastrar.tsx`.
2. Implementar o modal e botão de ação em `NotaDetalhesContent.tsx`.
3. Validar se a seção de Assistência Técnica (que já existe no detalhamento) é exibida corretamente após o encaminhamento pós-cadastro.
