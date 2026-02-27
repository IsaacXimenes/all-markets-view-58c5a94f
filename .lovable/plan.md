

# Plano: 5 Correções no Sistema

## 1. Adequar Movimentações de Acessórios ao modelo de Movimentações de Aparelhos

**Problema**: A aba de Movimentações de Acessórios (`EstoqueMovimentacoesAcessorios.tsx`) é simplificada comparada à de aparelhos. Falta: subtrair do estoque da origem ao registrar, somar no destino ao confirmar recebimento, e usar IDs de loja (não nomes) nos registros.

**Alterações**:
- `src/utils/acessoriosApi.ts`: Criar funções `transferirAcessorioOrigem(id, quantidade, lojaOrigem)` e `receberAcessorioDestino(id, quantidade, lojaDestino)` para movimentar estoque entre lojas
- `src/pages/EstoqueMovimentacoesAcessorios.tsx`:
  - Ao registrar movimentação: subtrair quantidade do estoque da loja de origem (validar estoque suficiente)
  - Ao confirmar recebimento: somar quantidade na loja de destino (ou criar novo registro de acessório nessa loja se não existir)
  - Gravar origem/destino usando IDs de loja (não nomes) para consistência
  - Filtrar acessórios no formulário pela loja de origem selecionada (mostrar apenas os que têm estoque naquela loja)

---

## 2. Filtrar acessórios por loja de venda na Venda Balcão

**Problema**: Em `VendasAcessorios.tsx` (linha 316-322), o filtro `acessoriosFiltrados` não considera a `lojaVenda`. O vendedor vê todos os acessórios de todas as lojas.

**Alteração**:
- `src/pages/VendasAcessorios.tsx`: Adicionar filtro `a.loja === lojaVenda` no `acessoriosFiltrados` (similar ao filtro de produtos por loja na Nova Venda), usando `getLojasPorPoolEstoque` para respeitar a regra de pool Online/Matriz
- Exibir a loja do acessório no modal de seleção para clareza

---

## 3. Pagamento Parcial não deve pagar valor total no primeiro ato

**Problema**: No `ModalFinalizarPagamento.tsx` (linha 109), o valor padrão para pagamento parcial é `saldoDevedor` (que no primeiro pagamento é o valor total). O campo é editável, mas o default induz ao erro.

**Alteração**:
- `src/components/estoque/ModalFinalizarPagamento.tsx`: Quando for pagamento parcial e o primeiro pagamento (`valorPago === 0`), inicializar `valorPagamento` como vazio (undefined/0) forçando o financeiro a digitar o valor desejado em vez de preencher automaticamente com o total
- Adicionar validação: se for primeiro pagamento parcial e o valor digitado for igual ao total, exibir alerta de confirmação ("Você está pagando o valor total. Para pagamento parcial, informe um valor menor.")

---

## 4. Aparelhos não são acrescentados ao estoque após finalização da nota de entrada

**Problema**: A migração de produtos para o estoque (`migrarProdutosConferidosPorCategoria`) só é chamada em `EstoqueNotaConferencia.tsx` (quando conferência atinge 100%). Quando a conferência é feita via `NotaDetalhesContent.tsx` (produto a produto), a migração nunca é disparada.

**Alterações**:
- `src/components/estoque/NotaDetalhesContent.tsx`:
  - Após cada `conferirProdutoSimples`, verificar se a conferência atingiu 100% (`qtdConferida === qtdInformada`)
  - Se sim, chamar `migrarProdutosConferidosPorCategoria` automaticamente para enviar os aparelhos ao estoque
  - Importar a função de `notaEntradaFluxoApi`
  - Exibir toast informando quantos produtos foram migrados (novos para Estoque, seminovos para Pendentes)

---

## 5. Habilitar conferência do gestor em lotes de stories

**Problema**: Em `GestaoAdmStoriesValidacao.tsx` (linhas 45-46), a variável `cannotValidate` verifica se `conferidoPor === user.colaborador.id`. Isso bloqueia o gestor se ele mesmo fez a conferência operacional. A regra de negócio impede a mesma pessoa de conferir e validar, mas o gestor deve poder validar lotes conferidos por outros.

**Alteração**:
- `src/pages/GestaoAdmStoriesValidacao.tsx`: A lógica já está correta conceitualmente (impede a mesma pessoa). O problema real é que provavelmente o usuário está logado como o mesmo colaborador que fez a conferência. Duas opções:
  - **Opção A**: Remover a restrição completamente (permitir que qualquer gestor valide qualquer lote)
  - **Opção B**: Manter a restrição mas adicionar um botão de override para gestores com permissão administrativa ("Validar mesmo assim")
  - **Recomendação**: Implementar opção B, adicionando um checkbox "Validar como gestor administrativo" que desbloqueia a ação quando `cannotValidate` é true, desde que o usuário tenha perfil de gestor

## Detalhes Técnicos

### Migração de Acessórios entre Lojas

```text
// Nova lógica no registro de movimentação:
1. Filtrar acessórios por loja de origem selecionada
2. Validar quantidade disponível na origem
3. Subtrair quantidade na origem (acessoriosApi)
4. Ao confirmar recebimento: buscar ou criar acessório na loja destino e somar quantidade
```

### Sequência de Implementação

1. `estoqueApi.ts` / `acessoriosApi.ts` - Funções de transferência de acessórios
2. `EstoqueMovimentacoesAcessorios.tsx` - Integrar transferência real
3. `VendasAcessorios.tsx` - Filtro por loja
4. `ModalFinalizarPagamento.tsx` - Corrigir default parcial
5. `NotaDetalhesContent.tsx` - Migração automática após conferência
6. `GestaoAdmStoriesValidacao.tsx` - Override de validação para gestores

