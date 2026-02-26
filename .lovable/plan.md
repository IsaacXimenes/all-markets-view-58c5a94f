

# Plano: Substituir Quadro de Resumo pelo Painel de Rentabilidade em todas as abas de Vendas

## Contexto

O componente `PainelRentabilidadeVenda` ja esta implementado e funcional na aba "Nova Venda" (`VendasNova.tsx`). Ele calcula margens, lucro real, taxas de cartao, comissoes hibridas e inclui o Coach de Vendas. O objetivo e replicar esse padrao em todas as outras telas de vendas que ainda usam o quadro de "Resumo" antigo.

## Telas Afetadas

| Tela | Arquivo | Situacao Atual |
|------|---------|---------------|
| Venda Balcao | `VendasAcessorios.tsx` | Quadro "Resumo da Venda" simples (linhas 798-874) |
| Finalizar Digital | `VendasFinalizarDigital.tsx` | Quadro "Resumo" extenso (linhas 1964-2100+) |
| Conferencia Lancamento | `VendasConferenciaLancamento.tsx` | Nao tem resumo individual (lista de vendas) |
| Conferencia Gestor (Painel Lateral) | `VendasConferenciaGestor.tsx` | Usa `VendaResumoCompleto` no painel lateral (linha 800) |
| Conferencia Gestor (Detalhes) | `VendasConferenciaGestorDetalhes.tsx` | Quadro "Resumo" basico no sidebar (linhas 186-207) |

## Alteracoes por Arquivo

### 1. VendasFinalizarDigital.tsx (Finalizar Venda Digital)

- **Remover** o card "Resumo" completo (linhas ~1964-2120)
- **Adicionar** o componente `PainelRentabilidadeVenda` no mesmo local, passando as props ja existentes (`itens`, `acessoriosVenda`, `tradeIns`, `garantiaExtendida`, `taxaEntrega`, `localEntregaId`, `lojaVenda`, `pagamentos`, `total`)
- **Manter** os cards especiais de Downgrade e Sinal abaixo do Painel de Rentabilidade, pois sao alertas criticos
- **Manter** os botoes de acao (Cancelar / Finalizar Venda) que estao no final da pagina
- Importar `PainelRentabilidadeVenda`

### 2. VendasAcessorios.tsx (Venda Balcao)

- **Remover** o card "Resumo da Venda" (linhas ~798-874)
- **Adaptar** o `PainelRentabilidadeVenda`: como Venda Balcao so vende acessorios (sem aparelhos, trade-in ou garantia extendida), passar `itens={[]}`, `tradeIns={[]}`, `garantiaExtendida={null}`, `localEntregaId={''}` e os acessorios reais
- **Mover** os botoes de acao (Cancelar / Registrar Venda) para fora do card removido
- Importar `PainelRentabilidadeVenda`

### 3. VendasConferenciaGestorDetalhes.tsx (Detalhes Conferencia Gestor)

- **Substituir** o card "Resumo" na coluna lateral (linhas 186-207) pelo `PainelRentabilidadeVenda`
- Os dados vem de `venda.dadosVenda` - sera necessario mapear os campos para o formato esperado pelo componente (`ItemVenda[]`, `VendaAcessorio[]`, `ItemTradeIn[]`, `Pagamento[]`)
- Importar `PainelRentabilidadeVenda` e as interfaces de tipos necessarias

### 4. VendasConferenciaGestor.tsx (Painel Lateral)

- **Substituir** o `VendaResumoCompleto` (linha 800) pelo `PainelRentabilidadeVenda`
- Os dados vem de `vendaSelecionada` (tipo `VendaComFluxo`) - mapear para as props do componente
- **Manter** a validacao de pagamentos e campo de observacao do gestor abaixo do painel
- Importar `PainelRentabilidadeVenda`

### 5. VendasConferenciaLancamento.tsx

- Esta tela e uma listagem de vendas, nao tem quadro de resumo individual para substituir
- **Nenhuma alteracao necessaria**

## Detalhes Tecnicos

### Mapeamento de dados para o PainelRentabilidadeVenda

O componente espera estas props:

```text
itens: ItemVenda[]           -> produto, valorCusto, valorVenda, id
acessoriosVenda: VendaAcessorio[] -> acessorioId, descricao, quantidade, valorTotal
tradeIns: ItemTradeIn[]      -> modelo, valorCompraUsado, id
garantiaExtendida: { planoNome, valor } | null
taxaEntrega: number
localEntregaId: string
lojaVenda: string
pagamentos: Pagamento[]      -> valor, parcelas, meioPagamento
total: number
```

Para as telas de conferencia, os dados vem em formatos ligeiramente diferentes (ex: `dadosVenda.itens` com campos como `produto`, `valorVenda`). Sera feito mapeamento inline para compatibilidade.

### Venda Balcao (caso especial)

Como so vende acessorios, o painel mostrara apenas o bloco de "Acessorios" e o "Resumo Consolidado" - os blocos de Aparelhos, Trade-In e Garantia Extendida ficarao ocultos automaticamente pela logica interna do componente.

## Sequencia de Implementacao

1. VendasFinalizarDigital.tsx - substituir Resumo por PainelRentabilidadeVenda
2. VendasAcessorios.tsx - adaptar para venda somente de acessorios
3. VendasConferenciaGestorDetalhes.tsx - substituir Resumo no sidebar
4. VendasConferenciaGestor.tsx - substituir VendaResumoCompleto no painel lateral

