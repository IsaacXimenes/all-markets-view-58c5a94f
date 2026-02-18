

## Plano: Reatividade na Oficina + Status/Filtros/Colunas nas Solicitacoes + Ajustes em Nova Assistencia

### 1. Botao "Confirmar Recebimento" independente do pagamento (OSAssistenciaEditar.tsx)

**Problema:** O botao "Confirmar Recebimento" so aparece apos o financeiro confirmar pagamento. Deve ser visivel assim que existir uma solicitacao registrada.

**Correcao:** Na tabela de solicitacoes de pecas dentro da edicao da OS (linhas 807-841), adicionar uma coluna "Acoes" com botao "Confirmar Recebimento" para solicitacoes com status `Pendente`, `Aprovada`, `Enviada`, `Pagamento Finalizado`, `Pagamento - Financeiro`, `Aguardando Chegada`. Ao clicar:
- Atualizar a solicitacao para status `Recebida`
- Fazer fresh fetch da OS e atualizar status para `Em servico` com `proximaAtuacao: 'Tecnico'`
- Atualizar timeline

### 2. Solicitacao de peca NAO deve salvar automaticamente (OSAssistenciaEditar.tsx)

**Problema:** Ao clicar "Adicionar" na solicitacao de pecas (linhas 862-896), o sistema chama `addSolicitacao()` e `updateOrdemServico()` imediatamente.

**Correcao:** Manter as solicitacoes em estado local (`solicitacoesPendentesLocal`) e so persistir quando o usuario clicar "Salvar Alteracoes":
- Ao clicar "Adicionar", salvar apenas no `useState` local
- No `handleSave`, apos validar, iterar pelas solicitacoes locais e chamar `addSolicitacao` + atualizar status da OS

### 3. Renomear status "Peca Recebida" para "Pagamento Realizado" na aba Servicos

**Arquivo: `src/pages/OSAssistenciaEditar.tsx` (linhas 824-834)**

Onde o badge exibe `Recebida` ou `Pagamento Finalizado`, exibir como "Pagamento Realizado". Tambem no select de status (linhas 461-476), renomear a opcao.

Tambem ajustar em `src/pages/OSOficina.tsx` nos badges de status para consistencia.

### 4. Filtro "Cancelada" na aba Solicitacoes de Pecas

**Arquivo: `src/pages/OSSolicitacoesPecas.tsx` (linhas 418-427)**

Adicionar `<SelectItem value="Cancelada">Cancelada</SelectItem>` apos "Recebida" no seletor de filtros.

### 5. Coluna "Fornecedor" na listagem de Solicitacoes de Pecas

**Arquivo: `src/pages/OSSolicitacoesPecas.tsx`**

Na tabela (linhas 460-473), adicionar `<TableHead>Fornecedor</TableHead>` apos a coluna "Valor".

Na celula (apos linha 509), adicionar:
```
<TableCell className="text-xs">
  {sol.fornecedorId ? getFornecedorNome(sol.fornecedorId) : '-'}
</TableCell>
```

O `fornecedorId` ja existe na interface `SolicitacaoPeca` e e preenchido na aprovacao.

### 6. Botao de detalhamento na aba Solicitacoes de Pecas

**Arquivo: `src/pages/OSSolicitacoesPecas.tsx` (linhas 552-558)**

O botao `Eye` atualmente navega para `/os/assistencia/${sol.osId}`. Alterar para abrir um modal de detalhes da solicitacao que exiba:
- Dados da solicitacao (peca, quantidade, justificativa, status, datas)
- Fornecedor e valor (se aprovada)
- Forma de pagamento, banco, chave Pix (se preenchidos)
- Timeline/historico da solicitacao
- Observacao do gestor

Criar um novo estado `detalheSolicitacaoOpen` e `solicitacaoDetalhe` para controlar o modal.

### 7. Remover campo "Status" da tela de Nova Assistencia

**Arquivo: `src/pages/OSAssistenciaNova.tsx` (linhas 1062-1072)**

Remover o bloco do campo Status (Select com opcoes "Servico concluido", "Em servico", "Aguardando Peca"). O status sera fixo como "Aguardando Analise" (que ja e o valor padrao na linha 130: `useState('Aguardando Analise')`).

Remover tambem a referencia ao `status` no auto-save (linha 407) e no draft (linhas 370, 397).

---

### Resumo de Arquivos Modificados

1. `src/pages/OSAssistenciaEditar.tsx` - Botao Confirmar Recebimento na tabela + solicitacoes em estado local + renomear status
2. `src/pages/OSSolicitacoesPecas.tsx` - Filtro Cancelada + coluna Fornecedor + modal de detalhamento
3. `src/pages/OSAssistenciaNova.tsx` - Remover campo Status
4. `src/pages/OSOficina.tsx` - Consistencia de badges de status (renomear "Peca Recebida" para "Pagamento Realizado")

