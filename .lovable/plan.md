

## Mapeamento Completo: Auto-preenchimento de "Responsavel" com Usuario Logado

### Objetivo
Todos os campos onde o usuario precisa selecionar manualmente um "Responsavel" passarao a ser preenchidos automaticamente com o colaborador logado no sistema (via `useAuthStore`). Os campos serao exibidos como somente leitura (disabled/read-only).

**Nota:** Campos que ja sao preenchidos automaticamente, campos usados como FILTRO de busca, e campos de selecao de tecnico/vendedor (que sao atribuicao a outra pessoa) NAO serao alterados.

---

### Campos Encontrados por Modulo

#### MODULO: Estoque

| Pagina | Campo | Estado Atual |
|---|---|---|
| `EstoqueMovimentacoes.tsx` | "Responsavel" (nova movimentacao) | Select manual (AutocompleteColaborador) |
| `EstoqueMovimentacoes.tsx` | "Responsavel" (confirmar recebimento) | Select manual |
| `EstoqueMovimentacoesAcessorios.tsx` | "Responsavel" (nova movimentacao) | Select manual |
| `EstoqueMovimentacoesAcessorios.tsx` | "Responsavel" (confirmar recebimento) | Select manual |
| `EstoqueNovaMovimentacaoMatriz.tsx` | "Responsavel pelo Lancamento" | Ja auto-preenchido (useEffect) - OK |
| `EstoqueMovimentacaoMatrizDetalhes.tsx` | "Responsavel pela Conferencia" (devolucao) | Select manual |
| `EstoqueNotaCadastrar.tsx` | "Responsavel pelo Lancamento" | Ja auto-preenchido com user.colaborador.id - OK |
| `EstoqueNotasUrgenciaPendentes.tsx` | "Responsavel Estoque" (inserir produtos) | Select manual |
| `EstoqueProdutosPendentes.tsx` | "Responsavel Conferencia" (validacao em lote) | Select manual |
| `EstoqueProdutos.tsx` | "Usuario que Informou" (valor recomendado) | AutocompleteColaborador manual |

#### MODULO: Financeiro

| Pagina | Campo | Estado Atual |
|---|---|---|
| `FinanceiroConferenciaNotas.tsx` | "Responsavel Financeiro" | Select manual |
| `FinanceiroNotasAssistencia.tsx` | "Responsavel Financeiro" | AutocompleteColaborador manual |
| `ModalFinalizarPagamento.tsx` | "Responsavel" (finalizar pagamento nota) | Select manual |

#### MODULO: OS / Assistencia

| Pagina | Campo | Estado Atual |
|---|---|---|
| `OSMovimentacaoPecas.tsx` | "Responsavel" (movimentacao de pecas) | AutocompleteColaborador manual |
| `OSSolicitacoesPecas.tsx` | "Responsavel pela Compra" | AutocompleteColaborador manual |
| `OSProdutoDetalhes.tsx` | "Responsavel" (parecer) | Select manual |

#### MODULO: Garantias

| Pagina | Campo | Estado Atual |
|---|---|---|
| `GarantiaExtendidaDetalhes.tsx` | "Responsavel" (confirmacao adesao) | Select manual |

#### MODULO: Vendas

| Pagina | Campo | Estado Atual |
|---|---|---|
| `VendasNovaDigital.tsx` | "Responsavel pela Venda" | Select manual |

---

### Total: 16 campos a alterar (2 ja estao corretos)

---

### Implementacao Tecnica

Para cada campo listado acima (exceto os ja auto-preenchidos):

1. **Importar** `useAuthStore` no componente (se ainda nao importado)
2. **Inicializar** o estado com o ID ou nome do colaborador logado:
   ```typescript
   const { user } = useAuthStore();
   // Para campos que usam ID:
   const [responsavel, setResponsavel] = useState(user?.colaborador?.id || '');
   // Para campos que usam nome:
   const [responsavel, setResponsavel] = useState(user?.colaborador?.nome || '');
   ```
3. **Substituir** o componente Select/Autocomplete por um campo `Input` somente leitura exibindo o nome do colaborador logado:
   ```typescript
   <Input
     value={user?.colaborador?.nome || 'Nao identificado'}
     disabled
     className="bg-muted"
   />
   ```
4. **Manter** o valor no state para envio nos dados do formulario

### Arquivos a editar (14 arquivos)

1. `src/pages/EstoqueMovimentacoes.tsx` - 2 campos
2. `src/pages/EstoqueMovimentacoesAcessorios.tsx` - 2 campos
3. `src/pages/EstoqueMovimentacaoMatrizDetalhes.tsx` - 1 campo
4. `src/pages/EstoqueNotasUrgenciaPendentes.tsx` - 1 campo
5. `src/pages/EstoqueProdutosPendentes.tsx` - 1 campo
6. `src/pages/EstoqueProdutos.tsx` - 1 campo
7. `src/pages/FinanceiroConferenciaNotas.tsx` - 1 campo
8. `src/pages/FinanceiroNotasAssistencia.tsx` - 1 campo
9. `src/components/estoque/ModalFinalizarPagamento.tsx` - 1 campo
10. `src/pages/OSMovimentacaoPecas.tsx` - 1 campo
11. `src/pages/OSSolicitacoesPecas.tsx` - 1 campo
12. `src/pages/OSProdutoDetalhes.tsx` - 1 campo
13. `src/pages/GarantiaExtendidaDetalhes.tsx` - 1 campo
14. `src/pages/VendasNovaDigital.tsx` - 1 campo

