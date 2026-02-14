

## Correcoes no Modulo de Assistencia e Financeiro

### Problemas Identificados

1. **Detalhes da OS (olho) - Checkbox "Estoque" nao lista pecas**: Na tela `OSAssistenciaDetalhes.tsx`, ao marcar a flag "Estoque" na secao Pecas/Servicos, o Select carrega pecas de `getPecas()` filtradas por `editLojaId`, mas a filtragem pode nao retornar resultados se o `lojaId` da OS nao bater com as pecas disponiveis. Precisa ajustar para mostrar todas as pecas disponiveis da assistencia.

2. **Solicitacao de peca nao altera status da OS**: Na tela `OSAssistenciaDetalhes.tsx`, ao registrar uma solicitacao de peca (linhas 773-795), a funcao `addSolicitacao` e chamada mas o status da OS NAO e atualizado para "Solicitacao de Peca" (diferente do que ocorre em `OSOficina.tsx` que atualiza corretamente).

3. **Avaliacao Tecnica sem mascara R$**: Na tela `OSAssistenciaDetalhes.tsx` (linhas 812-833), os campos "Valor de Custo" e "Valor de Venda" usam `Input type="number"` sem mascara monetaria. Devem usar `InputComMascara mascara="moeda"`.

4. **Financeiro > Notas Assistencia sem comprovante**: A tela `FinanceiroNotasAssistencia.tsx` nao possui campo de anexo de comprovante/camera no modal de conferencia. Deve usar o componente `FileUploadComprovante`.

5. **Registro sumindo ao finalizar na aba Servicos**: O `OSOficina.tsx` ja tem a logica de `osFinalizadas` para manter registros visiveis, mas o `recarregar()` na linha 152 reseta o estado. Verificar se o problema persiste - pode ser que o filtro `osTecnico` nao inclua os com `proximaAtuacao: 'Atendente'` mesmo com `osFinalizadas`.

6. **Fluxo pos-finalizacao - botao de pagamento na Nova Assistencia**: Quando o tecnico finaliza (status "Aguardando Pagamento", atuacao "Atendente"), na aba Nova Assistencia deve ter uma acao para abrir tela full com o quadro de pagamento habilitado.

---

### Plano de Implementacao

#### 1. Corrigir dropdown de pecas do estoque (OSAssistenciaDetalhes.tsx)

- Remover o filtro `p.lojaId === editLojaId` do Select de pecas ou tornar opcional
- Filtrar apenas pecas com `status === 'Disponivel'` e `quantidade > 0`
- Mostrar a loja de origem na descricao do item para referencia

#### 2. Atualizar status da OS ao solicitar peca (OSAssistenciaDetalhes.tsx)

- No handler de "Adicionar Solicitacao" (linha 773), apos chamar `addSolicitacao`, adicionar chamada a `updateOrdemServico` para mudar status para `'Solicitacao de Peca'` e `proximaAtuacao` para `'Gestor (Suprimentos)'`
- Adicionar entrada na timeline
- Recarregar a OS com `getOrdemServicoById`

#### 3. Mascara R$ nos campos de Avaliacao Tecnica (OSAssistenciaDetalhes.tsx)

- Importar `InputComMascara` de `@/components/ui/InputComMascara`
- Substituir os dois `<Input type="number">` (linhas 813-830) por `<InputComMascara mascara="moeda">`
- Ajustar handlers para usar `onChange(formatted, raw)`

#### 4. Adicionar FileUploadComprovante no Financeiro (FinanceiroNotasAssistencia.tsx)

- Importar `FileUploadComprovante` de `@/components/estoque/FileUploadComprovante`
- Adicionar estado `comprovante` e `comprovanteNome`
- Inserir o componente na secao de pagamento do modal de conferencia (entre Responsavel Financeiro e Valor Total)
- Tornar o comprovante obrigatorio na validacao de `botaoDesabilitado`

#### 5. Manter registro visivel ao finalizar (OSOficina.tsx)

- Verificar que apos `recarregar()`, as OS com IDs em `osFinalizadas` permanecem visiveis. O filtro atual (linha 57-65) ja inclui `osFinalizadas` - confirmar que funciona corretamente apos a chamada `recarregar()`
- Se o problema for de timing (estado desatualizado), mover o `recarregar()` para ocorrer apos a atualizacao de `osFinalizadas` usando um callback ou ajustando a ordem

#### 6. Botao "Registrar Pagamento" na aba Nova Assistencia (OSAssistencia.tsx)

- Na tabela de acoes (linhas 560-588), quando `os.status === 'Aguardando Pagamento'` e `os.proximaAtuacao === 'Atendente'`, adicionar botao "Registrar Pagamento" (icone CreditCard)
- Ao clicar, navegar para a tela de detalhes da OS com um parametro especial: `navigate(/os/assistencia/${os.id}?pagamento=true)`

#### 7. Tela full de pagamento (OSAssistenciaDetalhes.tsx)

- Detectar parametro `pagamento=true` via `useSearchParams`
- Quando ativo, renderizar a tela com o quadro de pagamento habilitado (PagamentoQuadro) e os demais quadros em modo somente leitura
- A condicao de exibicao do PagamentoQuadro (linha 852) deve incluir `proximaAtuacao === 'Atendente'` alem dos valores existentes

---

### Detalhes Tecnicos

**OSAssistenciaDetalhes.tsx:**
- Importar `InputComMascara`
- Adicionar estados: `valorCustoFormatado`, `valorVendaFormatado` (strings para mascara)
- Alterar filtro de pecas do estoque: remover `!editLojaId || p.lojaId === editLojaId`, mostrar todas disponiveis
- No handler de solicitacao: adicionar `updateOrdemServico` com status `'Solicitacao de Peca'`
- Na condicao do PagamentoQuadro (linha 852): adicionar `os.proximaAtuacao === 'Atendente'`
- Detectar `searchParams.get('pagamento') === 'true'` para abrir em modo pagamento

**FinanceiroNotasAssistencia.tsx:**
- Importar `FileUploadComprovante`
- Adicionar estados: `comprovante: string`, `comprovanteNome: string`
- Inserir componente entre o campo de Responsavel e Valor Total
- Atualizar `botaoDesabilitado` para incluir `!comprovante`

**OSAssistencia.tsx:**
- Na celula de Acoes, adicionar condicao: se `os.status === 'Aguardando Pagamento' && os.proximaAtuacao === 'Atendente'`, mostrar botao "Pagamento" que navega para detalhes com `?pagamento=true`
- Adicionar "Aguardando Pagamento" ao filtro de Status

**OSOficina.tsx:**
- Verificar e corrigir a ordem de atualizacao de `osFinalizadas` vs `recarregar()` para garantir que o registro permanece visivel

