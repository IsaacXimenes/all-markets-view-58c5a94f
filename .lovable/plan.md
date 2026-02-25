

## Plano: Reformular Tabela de Metas + Botao Editar no Quadro de Pagamentos

### 1. Reformular Tabela de Metas (`src/pages/CadastrosMetas.tsx`)

**Problema atual**: A tabela mostra apenas metas ja cadastradas, com coluna "Loja" generica. O usuario quer ver **uma linha por loja cadastrada** (do tipo "Loja"), independente de ter meta ou nao.

**Nova abordagem**:
- Remover filtro de Loja (desnecessario, todas aparecem sempre)
- Manter filtros de Mes e Ano
- A tabela tera uma linha fixa para cada loja retornada por `obterLojasTipoLoja()`
- Para cada loja, buscar a meta correspondente ao mes/ano selecionado via `getMetaByLojaEMes()`
- Se a meta existir, exibir os valores; se nao, exibir campos vazios/zerados
- Os botoes Editar/Excluir ficam na coluna de acoes
- Se nao houver meta, mostrar botao "Definir" que abre o modal pre-preenchido com a loja
- Remover o botao "Nova Meta" generico e o campo "Loja" do modal (a loja vem da linha clicada)
- A coluna "Mes/Ano" sai da tabela (ja esta nos filtros acima)

**Estrutura da tabela**:

| Loja | Meta Faturamento | Meta Acessorios (un.) | Meta Garantia | Acoes |
|------|------------------|-----------------------|---------------|-------|
| Centro | R$ 150.000 | 80 | R$ 12.000 | Editar / Excluir |
| Norte | R$ 120.000 | 60 | R$ 8.000 | Editar / Excluir |
| Online | - | - | - | Definir |

### 2. Botao Editar no Quadro de Pagamentos (`src/components/vendas/PagamentoQuadro.tsx`)

**Problema atual**: Cada pagamento tem apenas o botao de remover (X). Nao ha como editar um registro ja lancado.

**Solucao**:
- Adicionar estado `editandoPagamentoId` para rastrear qual pagamento esta sendo editado
- Adicionar botao de editar (icone Pencil) ao lado do botao de remover na tabela
- Ao clicar em Editar, abrir o mesmo modal de pagamento pre-preenchido com os dados do pagamento selecionado
- No `handleAddPagamento`, se `editandoPagamentoId` estiver setado, substituir o pagamento existente ao inves de adicionar um novo
- Resetar `editandoPagamentoId` ao fechar o modal

### Arquivos afetados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/CadastrosMetas.tsx` | Reformular tabela para exibir uma linha por loja, remover filtro de loja, ajustar modal para nao ter campo loja |
| `src/components/vendas/PagamentoQuadro.tsx` | Adicionar estado e logica de edicao de pagamento, botao Pencil na tabela |

