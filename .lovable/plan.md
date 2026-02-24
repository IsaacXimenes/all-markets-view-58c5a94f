
# Correcoes na Nova Nota de Entrada e Vinculo de Assistencia

## Resumo

Corrigir 4 problemas identificados: (1) campo Modelo retornando acessorios quando Tipo = Aparelho, (2) remover opcao "Usado" da categoria, (3) ao salvar nota com produtos marcados para assistencia, criar automaticamente o lote de revisao para que o detalhamento da nota exiba a secao de Assistencia Tecnica, (4) draft/rascunho ja esta implementado.

---

## Problema 1: Campo Modelo retornando acessorios

**Causa-raiz:** A funcao `getModelosAparelhos` (linha 197) filtra `produtosCadastro` apenas por `marca`, sem excluir itens que possam ser acessorios. A lista `produtosCadastro` mistura categorias como "iPhone", "Samsung Galaxy", "Apple Watch", "AirPods" etc. Quando o usuario seleciona Marca = Apple com Tipo = Aparelho, aparecem Apple Watch, AirPods e outros acessorios Apple.

**Correcao em `src/pages/EstoqueNotaCadastrar.tsx`:**
- Filtrar `getModelosAparelhos` para excluir categorias que sao acessorios (ex: "Apple Watch", "AirPods", "Beats")
- Verificar as categorias existentes em `produtosCadastro` e definir uma lista de categorias de aparelhos validas (iPhone, Samsung Galaxy, Xiaomi, Motorola, etc.)

---

## Problema 2: Remover opcao "Usado" da Categoria

**Correcao em `src/pages/EstoqueNotaCadastrar.tsx`:**
- Remover `<SelectItem value="Usado">Usado</SelectItem>` do Select de Categoria (linha 927)
- Manter apenas Novo e Seminovo
- Ajustar condicao do botao de assistencia: remover referencia a "Usado"
- Ajustar campo Saude Bateria: remover condicao de "Usado"

---

## Problema 3 (Critico): Assistencia nao aparece nos detalhes da nota

**Causa-raiz:** Ao salvar a nota, o `handleSalvar` (linha 420-441) chama `encaminharParaAnaliseGarantia` individualmente para cada produto marcado, mas NAO cria um `LoteRevisao`. A tela de detalhes (`NotaDetalhesContent`) verifica `getLoteRevisaoByNotaId(nota.id)` que retorna `null` porque nenhum lote foi criado. Portanto, a secao "Assistencia Tecnica" nao aparece.

**Correcao em `src/pages/EstoqueNotaCadastrar.tsx`:**
- Ao salvar, se ha produtos marcados para assistencia:
  1. Criar um lote de revisao via `criarLoteRevisao(novaNota.id, itens, responsavel)` com os itens marcados
  2. Encaminhar o lote via `encaminharLoteParaAssistencia(loteId, responsavel)`
  3. Vincular o lote a nota (`nota.loteRevisaoId = lote.id`)
- Remover chamadas individuais a `encaminharParaAnaliseGarantia` (substituidas pelo lote)
- Importar `criarLoteRevisao` e `encaminharLoteParaAssistencia` de `loteRevisaoApi`

**Correcao em `src/utils/notaEntradaFluxoApi.ts`:**
- Na interface de `criarNotaEntrada`, aceitar `categoria: 'Novo' | 'Seminovo' | 'Usado'` (expandir para compatibilidade, embora Usado seja removido da UI)
- Garantir que `nota.loteRevisaoId` seja atribuivel apos a criacao

**Correcao em `src/utils/loteRevisaoApi.ts`:**
- Na funcao `criarLoteRevisao`, apos criar o lote, vincular automaticamente `nota.loteRevisaoId = lote.id` na nota de entrada

---

## Problema 4: Draft/Rascunho

**Status:** Ja implementado. O botao "Salvar Rascunho" (linha 1132) e "Descartar Rascunho" (linha 1137) ja existem. O indicador de draft carregado aparece quando ha rascunho salvo. Nenhuma alteracao necessaria.

---

## Detalhes Tecnicos

### Arquivos alterados

| Arquivo | Alteracao |
|---|---|
| `src/pages/EstoqueNotaCadastrar.tsx` | Filtrar modelos por categorias de aparelhos; remover "Usado" da categoria; criar lote de revisao ao salvar com assistencia |
| `src/utils/loteRevisaoApi.ts` | Vincular `nota.loteRevisaoId` automaticamente ao criar lote |

### Categorias de acessorios a excluir do filtro de Aparelhos

Com base nos dados de `produtosCadastro`, as categorias que NAO sao aparelhos incluem: "Apple Watch", "AirPods", "Beats", "HomePod", "iPad" (depende do contexto - verificar). A filtragem sera feita excluindo categorias conhecidas de acessorios ou incluindo apenas categorias de smartphones.

### Fluxo corrigido de salvamento com assistencia

```text
1. Usuario marca produtos para assistencia no quadro de produtos
2. Produtos aparecem no segundo quadro "Aparelhos para Analise na Assistencia"
3. Ao clicar "Salvar Lancamento Inicial":
   a. criarNotaEntrada() cria a nota com produtos
   b. criarLoteRevisao(notaId, itensAssistencia, responsavel) cria o lote
   c. encaminharLoteParaAssistencia(loteId, responsavel) envia para Analise de Tratativas
   d. nota.loteRevisaoId = lote.id (vinculo)
4. Ao abrir detalhes da nota:
   - getLoteRevisaoByNotaId(nota.id) retorna o lote criado
   - Secao "Assistencia Tecnica" aparece com itens e status
```

### Sequencia de implementacao

1. `src/utils/loteRevisaoApi.ts` - vincular nota ao criar lote
2. `src/pages/EstoqueNotaCadastrar.tsx` - filtro de modelos, remover "Usado", criar lote ao salvar
