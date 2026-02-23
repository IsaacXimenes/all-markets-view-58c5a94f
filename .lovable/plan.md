

# Correcao do Botao "Editar" na Conferencia do Gestor

## Problema

Atualmente, ao clicar em "Editar" no painel lateral da Conferencia do Gestor, o sistema navega para `/vendas/${id}` (pagina VendaDetalhes.tsx) com `modoConferencia: true`. Essa pagina e apenas de **visualizacao/detalhamento**, nao permite editar os dados do lancamento.

## Solucao

Alterar a navegacao do botao "Editar" para redirecionar a pagina de edicao correta: `/vendas/editar/${id}`.

## Detalhes Tecnicos

### Arquivo: `src/pages/VendasConferenciaGestor.tsx`

**Linha 874** - Alterar o `onClick` do botao "Editar":

- **De:** `navigate('/vendas/${vendaSelecionada.id}', { state: { modoConferencia: true } })`
- **Para:** `navigate('/vendas/editar/${vendaSelecionada.id}')`

Isso redirecionara o gestor para a tela `VendasEditar.tsx`, que possui o formulario completo de edicao do lancamento (itens, acessorios, trade-in, pagamentos, etc.).

