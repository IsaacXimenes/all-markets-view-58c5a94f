

## Validacao IMEI, Integracao Estoque-Financeiro e Padronizacao de Status

### Analise do Estado Atual

Apos exploracao detalhada do codigo, varias funcionalidades ja existem parcialmente. Este plano foca nas lacunas reais:

**JA IMPLEMENTADO:**
- Central de Decisao com Caminho Verde e Amarelo (EstoqueNotaConferencia.tsx)
- Status "Em Revisao Tecnica" no modelo de dados (estoqueApi.ts)
- Funcao getStatusAparelho reconhece "Em Revisao Tecnica"
- Sistema de Credito de Fornecedor (notaEntradaFluxoApi.ts)
- Icone de credito na tabela de notas (TabelaNotasPendencias.tsx)
- Matriz de abatimento no Financeiro (FinanceiroNotasAssistencia.tsx)
- Logistica reversa no loteRevisaoApi.ts
- Tag "Retorno de Assistencia" em EstoqueProdutosPendentes.tsx
- DNA da Peca com origens (Consignado, Estoque Thiago, Retirada, Fornecedor)
- Explosao de origem nos cards de custo

**O QUE PRECISA SER IMPLEMENTADO:**

---

### 1. Validacao de Unicidade de IMEI

**Arquivo: `src/utils/notaEntradaFluxoApi.ts`**
- Criar funcao `verificarImeiUnicoSistema(imei: string): { duplicado: boolean; localExistente?: string }` que verifica:
  - Produtos ativos no estoque (estoqueApi - produtos com status != Vendido)
  - Produtos pendentes (osApi - produtosPendentes)
  - Outras notas de entrada (notaEntradaFluxoApi - produtos com IMEI)
- Retornar informacao sobre onde o IMEI ja existe

**Arquivo: `src/pages/EstoqueNotaConferencia.tsx`**
- No campo de IMEI editavel (InputComMascara, linha ~466-472), adicionar validacao ao onChange:
  - Apos debounce de 500ms, chamar `verificarImeiUnicoSistema`
  - Se duplicado: borda vermelha no campo + tooltip com mensagem "IMEI ja cadastrado em [local]"
  - Bloquear botao de conferir para este item enquanto IMEI duplicado
- No handleSalvarConferencia: verificar novamente todos os IMEIs antes de salvar

**Arquivo: `src/pages/EstoqueNotaCadastrar.tsx`**
- Na tabela de produtos (campo IMEI), aplicar a mesma validacao com debounce
- Bloquear botao "Salvar Nota" se houver IMEIs duplicados

---

### 2. Integracao Estoque-Financeiro (Caminho Verde Completo)

**Arquivo: `src/utils/notaEntradaFluxoApi.ts`**
- Expandir `enviarDiretoAoFinanceiro`:
  - Atualizar status para "Conferencia Concluida" (se ainda nao estiver)
  - Para cada produto da nota, chamar uma funcao que atualiza status no estoque para "Disponivel"
  - Importar e utilizar `getProdutos` do estoqueApi para localizar produtos migrados e garantir status correto

**Arquivo: `src/utils/estoqueApi.ts`**
- Criar funcao `marcarProdutosComoDisponiveis(imeis: string[])` que localiza produtos por IMEI e garante que estejam com status disponivel (estoqueConferido = true, assistenciaConferida = true)

**Arquivo: `src/pages/FinanceiroConferenciaNotas.tsx`**
- Verificar se notas enviadas via "Caminho Verde" ja aparecem na lista. Se nao, adicionar filtro para incluir notas com `enviadoDiretoFinanceiro = true` e `atuacaoAtual === 'Financeiro'`

---

### 3. Geracao Automatica de Credito (Caminho Amarelo + Antecipado)

**Arquivo: `src/pages/EstoqueEncaminharAssistencia.tsx`**
- No handleConfirmarEncaminhamento (linha ~133):
  - Apos criar lote e encaminhar, verificar `notaSelecionada.tipoPagamento`
  - Se "Pagamento 100% Antecipado": chamar `gerarCreditoFornecedor` automaticamente com o valor total dos itens defeituosos
  - Exibir toast informando "Vale-Credito gerado: R$ X para fornecedor Y"
- Apos encaminhar, atualizar status dos produtos para "Em Revisao Tecnica" (chamar estoqueApi)

**Arquivo: `src/utils/estoqueApi.ts`**
- Criar funcao `marcarProdutosEmRevisaoTecnica(imeis: string[], loteRevisaoId: string)` que localiza produtos migrados no estoque por IMEI e seta `statusRevisaoTecnica = 'Em Revisao Tecnica'` e `loteRevisaoId`

---

### 4. Status "Em Revisao Tecnica" nos Badges de OS

**Arquivo: `src/pages/OSAssistencia.tsx`**
- No getStatusBadge (linha 101-142): adicionar case para "Aguardando Analise" com visual violeta/roxo para diferenciar OS de Lote de Revisao
- No filtro de status: adicionar opcao "Aguardando Analise" ao dropdown

**Arquivo: `src/pages/EstoqueEncaminharAssistencia.tsx`**
- No handleConfirmarEncaminhamento: chamar `marcarProdutosEmRevisaoTecnica` para cada IMEI encaminhado

---

### 5. Logistica Reversa - Conexao com Estoque

**Arquivo: `src/utils/loteRevisaoApi.ts`**
- Expandir `finalizarLoteComLogisticaReversa`:
  - Para itens "Consertado": importar estoqueApi e setar `tagRetornoAssistencia = true`, `statusRevisaoTecnica = null` no produto correspondente
  - Para itens "Devolucao ao Fornecedor": setar `statusRevisaoTecnica = null`, `quantidade = 0` ou status "Devolvido"
  - Chamar `gerarCreditoFornecedor` para devolucoes em notas antecipadas

**Arquivo: `src/pages/EstoqueProdutosPendentes.tsx`**
- Garantir que o filtro/badge "Retorno de Assistencia" funcione corretamente com produtos do estoque principal (nao apenas pendentes)
- Adicionar botao "Validar Retorno" que remove a tag e seta produto como Disponivel

---

### 6. Credito de Fornecedor - Visualizacao Contextual

**Arquivo: `src/components/estoque/TabelaNotasPendencias.tsx`**
- O icone de credito ja existe. Verificar se o modal abre corretamente com extrato completo
- Garantir que o icone apareca apenas quando `getTotalCreditosDisponiveis(fornecedor) > 0`

**Arquivo: `src/pages/FinanceiroNotasAssistencia.tsx`**
- No modal de conferencia, quando nota tem fornecedor com creditos disponiveis, exibir card informativo "Credito disponivel: R$ X" com opcao de aplicar ao pagamento

---

### Arquivos Afetados

1. `src/utils/notaEntradaFluxoApi.ts` - Funcao verificarImeiUnicoSistema + expansao enviarDiretoAoFinanceiro
2. `src/pages/EstoqueNotaConferencia.tsx` - Validacao IMEI em tempo real com debounce
3. `src/pages/EstoqueNotaCadastrar.tsx` - Validacao IMEI no cadastro
4. `src/utils/estoqueApi.ts` - Funcoes marcarProdutosComoDisponiveis e marcarProdutosEmRevisaoTecnica
5. `src/pages/EstoqueEncaminharAssistencia.tsx` - Credito automatico + status Em Revisao Tecnica
6. `src/pages/OSAssistencia.tsx` - Badge "Aguardando Analise" no getStatusBadge
7. `src/utils/loteRevisaoApi.ts` - Logistica reversa com integracao real no estoqueApi
8. `src/pages/EstoqueProdutosPendentes.tsx` - Botao "Validar Retorno"
9. `src/pages/FinanceiroNotasAssistencia.tsx` - Card de credito disponivel no modal
10. `src/pages/FinanceiroConferenciaNotas.tsx` - Verificar exibicao de notas "Caminho Verde"

### Resultado Esperado

- IMEIs duplicados sao detectados em tempo real no cadastro e na conferencia, bloqueando a operacao
- O Caminho Verde atualiza produtos para "Disponivel" e cria registro financeiro completo
- O Caminho Amarelo para notas antecipadas gera Vale-Credito automaticamente
- O status "Em Revisao Tecnica" e visivel e filtravel na Assistencia e no Estoque
- A logistica reversa atualiza fisicamente os produtos no estoque (retorno ou devolucao)
- Creditos de fornecedor sao exibidos contextualmente no Financeiro e no Estoque

