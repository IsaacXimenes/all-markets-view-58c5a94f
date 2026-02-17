

## Plano de Implementacao - 3 Ajustes no Modulo de Assistencia

### 1. Quadro de Pecas/Servicos na Edicao (Aba Servicos)

**Problema:** O quadro de Pecas/Servicos na tela de edicao (`OSAssistenciaEditar.tsx`) tem funcionalidades mais simples que o da Nova Assistencia (`OSAssistenciaNova.tsx`). Faltam:
- Selecao de peca do estoque (checkbox "Peca no estoque" com dropdown de pecas disponiveis)
- Checkbox "Fornecedor" com campo de selecao de fornecedor via AutocompleteFornecedor
- Checkbox "Servico Terceirizado" com campos: descricao, fornecedor do servico e nome do responsavel
- Campo "Unidade de Servico" (AutocompleteLoja)
- Campo "Desconto (%)" com mascara
- Campo "Valor Total" calculado (desabilitado)

**Solucao:** Atualizar o formulario de pecas em `OSAssistenciaEditar.tsx` para replicar 100% do layout e logica do `OSAssistenciaNova.tsx`, incluindo:
- Adicionar campos `pecaEstoqueId`, `pecaDeFornecedor`, `nomeRespFornecedor` ao `PecaForm` da edicao
- Importar `getPecas`, `initializePecasWithLojaIds`, `darBaixaPeca` de `pecasApi`
- Importar `InputComMascara`, `AutocompleteFornecedor`, `AutocompleteLoja`
- Replicar os checkboxes e campos condicionais exatamente como na Nova Assistencia
- Adicionar calculo de valor total com desconto

---

### 2. Campos Chave Pix e Banco no Modal de Aprovacao (Solicitacoes de Pecas)

**Problema:** No modal de aprovacao de solicitacao de pecas (`OSSolicitacoesPecas.tsx`), faltam os campos "Banco do Destinatario" e "Chave Pix" quando a forma de pagamento e Pix. Alem disso, o campo "Origem da Peca" deve ser sempre "Fornecedor" (fixo).

**Solucao:** No modal de aprovacao (Dialog `aprovarOpen`):
- Adicionar campos `bancoDestinatario` e `chavePix` ao estado `fornecedoresPorPeca`
- Reordenar os campos: Fornecedor, Forma de Pagamento, Banco do Destinatario (visivel quando Pix), Chave Pix (visivel quando Pix)
- Remover o select de "Origem da Peca" e fixar o valor como "Fornecedor" automaticamente
- Remover a validacao de `origemPeca` obrigatoria (ja que sera sempre "Fornecedor")
- Manter o campo de Observacao

---

### 3. Comprovante nao Visualizavel na Conferencia do Gestor

**Problema:** Na aba de Conferencia do Gestor (`OSConferenciaGestor.tsx`), o comprovante aparece apenas como texto clicavel (nome do arquivo) mas nao exibe miniatura e nao abre ao clicar.

**Analise:** O componente `ComprovantePreview` esta sendo usado corretamente (linha 714). O problema provavel e que o `comprovante` armazenado no pagamento da OS e um dado base64 (`data:image/...`) que deveria renderizar como miniatura. Possiveis causas:
- O campo `comprovante` pode estar vazio ou corrompido na hora de salvar
- A renderizacao da miniatura pode estar sendo bloqueada pelo layout muito comprimido (texto truncado)

**Solucao:** Melhorar a exibicao do comprovante no painel lateral:
- Exibir a miniatura da imagem diretamente (thumbnail clicavel) em vez de apenas o componente ComprovantePreview inline
- Adicionar preview de imagem expandido ao clicar
- Garantir que o container tenha espaco suficiente para mostrar a miniatura
- Adicionar fallback visual caso o comprovante nao seja uma imagem valida

---

### Detalhes Tecnicos

**Arquivos a editar:**

| Arquivo | Alteracao |
|---|---|
| `src/pages/OSAssistenciaEditar.tsx` | Replicar quadro Pecas/Servicos completo da Nova Assistencia |
| `src/pages/OSSolicitacoesPecas.tsx` | Adicionar campos Banco/Chave Pix, fixar origem como Fornecedor |
| `src/pages/OSConferenciaGestor.tsx` | Melhorar exibicao de comprovantes com miniatura visivel |

**Dependencias:** Nenhuma nova dependencia necessaria. Todos os componentes ja existem no projeto.

