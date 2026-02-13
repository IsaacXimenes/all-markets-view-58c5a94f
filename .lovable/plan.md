

## Detalhes da Nota como Modal (mesma visao, sem navegacao)

### Objetivo
Ao clicar no olho em **Financeiro > Notas Pendentes**, abrir um **Dialog (modal)** com exatamente a mesma visao da pagina de detalhes do Estoque, sem navegar para outra rota.

### Abordagem

1. **Extrair componente reutilizavel** `NotaDetalhesContent`
   - Mover todo o conteudo visual de `EstoqueNotaDetalhes.tsx` (cards de status, alertas, informacoes, produtos, timeline, pagamentos) para um componente independente em `src/components/estoque/NotaDetalhesContent.tsx`
   - O componente recebe a `nota: NotaEntrada` como prop (sem depender de `useParams`)
   - O botao "Voltar" e os botoes de acao (Cadastrar Produtos, Conferir) ficam condicionais via prop `showActions?: boolean`

2. **Atualizar `EstoqueNotaDetalhes.tsx`**
   - Importar e renderizar `NotaDetalhesContent` passando a nota carregada via `useParams`
   - Manter o layout com `EstoqueLayout` e o botao de voltar

3. **Atualizar `FinanceiroNotasPendencias.tsx`**
   - Reverter o `navigate()` para abrir um Dialog em tela cheia (`max-w-5xl`)
   - Dentro do Dialog, renderizar `NotaDetalhesContent` com a nota selecionada
   - Incluir botao de pagamento no rodape do modal quando aplicavel
   - Prop `showActions={false}` para ocultar botoes de acao do estoque

### Resultado
O usuario ve exatamente a mesma interface de detalhes (cards, produtos, timeline, pagamentos) tanto no Estoque quanto no Financeiro, sem sair da pagina do Financeiro.

### Detalhes tecnicos

**Novo arquivo:** `src/components/estoque/NotaDetalhesContent.tsx`
- Props: `nota: NotaEntrada`, `showActions?: boolean`
- Contem: cards de status/atuacao/pagamento/progresso, alertas, info detalhada, tabela de produtos (colapsavel), timeline (colapsavel), historico de pagamentos

**Arquivo:** `src/pages/EstoqueNotaDetalhes.tsx`
- Importa `NotaDetalhesContent` e passa `nota` + `showActions={true}`
- Mantem logica de carregamento e botao voltar

**Arquivo:** `src/pages/FinanceiroNotasPendencias.tsx`
- Adiciona estado `dialogDetalhes` (boolean)
- `handleVerDetalhes` seta a nota e abre o dialog
- Renderiza `Dialog` com `NotaDetalhesContent` dentro, com `showActions={false}`
- Botao de pagamento no rodape do modal

