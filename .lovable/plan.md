

## Unificacao do Quadro de Pecas entre Nova Assistencia e Edicao de OS

### Resumo

A tela de Edicao (OSAssistenciaEditar.tsx, 1104 linhas) possui um quadro de pecas simplificado comparado a tela de Nova Assistencia (OSAssistenciaNova.tsx, 2074 linhas). Este plano alinha ambas as telas para oferecer a mesma experiencia.

---

### Diferencas Identificadas

| Funcionalidade | Nova Assistencia | Edicao de OS |
|---|---|---|
| Seletor de pecas do estoque | Modal colunado (Dialog) com busca, filtro por loja, separacao propria/outras lojas | Select simples sem busca |
| Campos V. Recomendado / V. Custo | Exibidos lado a lado (somente leitura) | Ausentes |
| Campo editavel Valor (R$) | Removido para pecas do estoque | Sempre visivel |
| Pecas consignadas [CONSIGNADO] | Injetadas na lista | Nao injetadas |
| Sync Unidade de Servico com Loja | useEffect sincroniza automaticamente | Ausente |
| Valor preenchido ao selecionar peca | Usa valorCusto | Usa valorRecomendado |
| Timeline de alteracoes de pecas | N/A (criacao) | Nao registra adicao/remocao de pecas |

---

### Alteracoes Planejadas

**Arquivo: `src/pages/OSAssistenciaEditar.tsx`**

**1. Adicionar modal de busca de pecas (mesmo da Nova)**
- Adicionar estados: `modalBuscaPecaOpen`, `modalBuscaPecaIndex`, `buscaPecaFiltro`, `buscaPecaLojaFiltro`
- Adicionar `useMemo` para `pecasFiltradasModal` com mesma logica de filtro
- Adicionar o Dialog completo de busca de pecas (copia do componente em Nova, linhas 1944-2071)
- Substituir o `<Select>` atual (linhas 637-681) por um `<Button>` que abre o modal (igual ao da Nova, linhas 1210-1225)

**2. Adicionar campos V. Recomendado e V. Custo (somente leitura)**
- Apos o bloco de selecao da peca do estoque, exibir os dois campos informativos lado a lado (grid 2 colunas)
- Copiar a logica da Nova (linhas 1275-1289)

**3. Remover campo editavel Valor (R$) para pecas do estoque**
- Condicionar o campo `Valor (R$)` com `{!peca.pecaNoEstoque && ...}` (igual a Nova, linha 1264)
- Para pecas do estoque, o valor e preenchido automaticamente com o valorCusto ao selecionar

**4. Injetar pecas consignadas na lista de selecao**
- A filtragem `pecasEstoque` ja puxa pecas disponiveis; verificar se o filtro `!p.statusMovimentacao` esta presente (alinhar com Nova, linha 146)

**5. Sincronizacao automatica de Unidade de Servico**
- Adicionar `useEffect` que atualiza `unidadeServico` das pecas quando `lojaId` muda (igual a Nova, linhas 168-175)

**6. Corrigir valor ao selecionar peca do estoque**
- No callback de selecao do modal, preencher `valor` com `p.valorCusto` (nao valorRecomendado)

**7. Timeline de auditoria para alteracoes de pecas**
- Na funcao `handleSave`, antes de salvar, comparar `osOriginal.pecas` com `pecasFormatadas`
- Registrar na timeline: pecas adicionadas, pecas removidas e pecas com valor alterado
- Incluir data/hora e nome do usuario responsavel

---

### Sequencia de Implementacao

1. Adicionar estados e logica do modal de busca de pecas
2. Adicionar o Dialog JSX do modal
3. Substituir o Select por Button que abre o modal
4. Adicionar campos V. Recomendado e V. Custo
5. Condicionar campo Valor (R$) para pecas do estoque
6. Adicionar useEffect de sync Unidade de Servico
7. Adicionar filtro `!p.statusMovimentacao` no pecasEstoque
8. Adicionar logica de diff de pecas na timeline do handleSave

### Arquivos Afetados

- `src/pages/OSAssistenciaEditar.tsx` (unico arquivo alterado)

