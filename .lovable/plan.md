
# Plano: Persistir acessorios na venda e exibi-los na Conferencia de Lancamento

## Problema

Ao criar uma Nova Venda com acessorios, eles nao sao enviados para a API porque o campo `acessorios` nao e incluido no objeto `vendaData`. A interface `Venda` em `vendasApi.ts` ja suporta o campo `acessorios?: VendaAcessorio[]`, mas ele nunca e preenchido. Alem disso, o modal de conferencia nao exibe acessorios.

## Alteracoes

### 1. Salvar acessorios ao registrar venda (`src/pages/VendasNova.tsx`)

Adicionar `acessorios: acessoriosVenda` ao objeto `vendaData` em dois locais:

- **Venda normal** (linha ~963, dentro de `handleConfirmarVenda`): adicionar `acessorios: acessoriosVenda,` apos a linha `itens,`
- **Venda com sinal** (linha ~881, dentro de `handleSalvarComSinal`): adicionar `acessorios: acessoriosVenda,` apos a linha `itens,`

### 2. Exibir acessorios no modal de conferencia (`src/pages/VendasConferenciaLancamento.tsx`)

Adicionar uma secao no modal de aprovacao (apos os dados basicos e antes dos comprovantes) que lista os itens (produtos) e acessorios da venda:

- **Secao "Produtos"**: listar `vendaSelecionada.itens` com modelo, IMEI e valor
- **Secao "Acessorios"**: listar `vendaSelecionada.acessorios` com descricao, quantidade, valor unitario e valor total
- Ambas as secoes so aparecem se houver dados

Sera necessario importar `VendaAcessorio` ou acessar os campos diretamente do objeto venda.

## Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/VendasNova.tsx` | Adicionar `acessorios: acessoriosVenda` no vendaData (2 locais) |
| `src/pages/VendasConferenciaLancamento.tsx` | Exibir secoes de Produtos e Acessorios no modal de conferencia |
