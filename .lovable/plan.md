

## Plano: Meta Acessorios em R$ + Ocultar Resumo na Nova Venda

### 1. Meta Acessorios passa de unidades para R$ 

**Arquivos afetados**: `src/pages/CadastrosMetas.tsx`, `src/utils/metasApi.ts`, `src/components/vendas/PainelMetasLoja.tsx` (se exibir meta de acessorios)

Alteracoes:

- **Tabela** (`CadastrosMetas.tsx` linha 142): Trocar header "Meta Acessorios (un.)" para "Meta Acessorios"
- **Tabela** (linha 154-155): Exibir `formatarMoeda(meta.metaAcessorios)` ao inves do numero puro
- **Modal** (linhas 211-218): Trocar label "Meta Acessorios (unidades)" para "Meta Acessorios (R$)", trocar `type="number"` por input com `moedaMask`, e usar `parseMoeda` no handleSalvar
- **Editar** (linha 71): No `abrirEditar`, setar `setMetaAcessorios(formatarMoeda(meta.metaAcessorios))` ao inves de `String(meta.metaAcessorios)`
- **Salvar** (linha 82): Trocar `Number(metaAcessorios) || 0` por `parseMoeda(metaAcessorios)`
- **Defaults** (`metasApi.ts` linhas 25-45): Atualizar valores default de `metaAcessorios` de unidades (80, 60, 100) para valores em reais (ex: 5000, 3500, 8000)
- **PainelMetasLoja**: Ajustar exibicao para formatar como moeda ao inves de unidades

### 2. Ocultar o card "Resumo" na Nova Venda

**Arquivo afetado**: `src/pages/VendasNova.tsx`

- Envolver o bloco do Resumo (linhas 2283-2449, o Card inteiro com header "Resumo") com `{false && (...)}`  ou adicionar `hidden` / comentario condicional
- O Painel de Rentabilidade (linha 2451) permanece visivel
- Nao excluir o codigo, apenas ocultar da renderizacao

