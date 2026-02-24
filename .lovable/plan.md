

# Ajustes no Quadro de Produtos e Comunicacao Assistencia-Nota de Entrada

## Resumo

Corrigir 5 problemas na tela de Nova Nota de Entrada e garantir a comunicacao bidirecional entre Assistencia e Nota de Entrada para refletir custos e pareceres.

---

## 1. Campo Modelo - Filtragem por Tipo de Produto (1.1)

**Arquivo:** `src/pages/EstoqueNotaCadastrar.tsx`

**Problema:** O autocomplete do campo Modelo ja filtra corretamente entre Aparelho (via `produtosCadastro`) e Acessorio (via `acessoriosCadastro`) nas linhas 801-828. Porem, `getProdutosCadastro()` retorna todos os registros de `ProdutoCadastro` sem filtrar por tipo. Se houver acessorios cadastrados como `ProdutoCadastro`, eles aparecerao no filtro de aparelhos.

**Correcao:** Na funcao `getModelosAparelhos`, adicionar filtragem para excluir itens que nao sejam aparelhos. A interface `ProdutoCadastro` tem campo `categoria` (ex: "Smartphone", "Tablet"). Garantir que a busca respeite o tipo selecionado. Se `ProdutoCadastro` mistura tipos, filtrar tambem pela `categoria` ou adicionar campo `tipo` na interface.

---

## 2. Campo Cor - Dropdown com Cores Cadastradas (1.2)

**Arquivo:** `src/pages/EstoqueNotaCadastrar.tsx`

**Problema:** O campo Cor (linha 874) e um `<Input>` de texto livre.

**Correcao:**
- Importar `getCores` de `src/utils/coresApi.ts`
- Substituir o `<Input>` por um `<Select>` populado com `getCores().filter(c => c.status === 'Ativo')`
- Cada opcao exibe o nome da cor e, opcionalmente, um indicador visual do hexadecimal (bolinha colorida)
- Manter `w-32` para consistencia de layout

---

## 3. Campo Saude da Bateria - Condicional por Categoria (1.3)

**Arquivo:** `src/pages/EstoqueNotaCadastrar.tsx`

**Alteracoes:**
- Adicionar campo `saudeBateria` na interface `ProdutoLinha` (tipo `number`, default 100)
- Adicionar coluna "Saude Bateria" na tabela de produtos (apos "Categoria")
- Exibir o campo apenas quando `!camposSimplificados` (mesma regra de IMEI/Cor/Categoria)
- Logica condicional:
  - Se `categoria === 'Novo'`: campo preenchido automaticamente com 100, read-only
  - Se `categoria === 'Seminovo'` ou `categoria === 'Usado'`: campo editavel (input numerico 0-100 com sufixo "%")
  - Se categoria vazia: campo desabilitado
- Adicionar "Usado" como opcao no Select de Categoria (atualmente so tem Novo/Seminovo)

---

## 4. Botao de Assistencia - Condicional por Categoria (1.4)

**Arquivo:** `src/pages/EstoqueNotaCadastrar.tsx`

**Problema:** O botao de Wrench (linha 940-954) esta habilitado para qualquer Aparelho com IMEI. Deveria ser apenas para Usado/Seminovo.

**Correcao:**
- Alterar condicao `disabled` de:
  ```
  disabled={produto.tipoProduto !== 'Aparelho' || !produto.imei?.trim()}
  ```
  para:
  ```
  disabled={
    produto.tipoProduto !== 'Aparelho' || 
    !produto.imei?.trim() || 
    produto.categoria === 'Novo' || 
    !produto.categoria
  }
  ```
- Atualizar tooltip para indicar que apenas Usado/Seminovo pode ser encaminhado

**Fluxo de migracao para segundo quadro:**
- Ao confirmar encaminhamento no modal, o item e movido para um segundo quadro "Aparelhos para Analise na Assistencia" na mesma tela
- O item permanece visualmente no quadro principal com badge "Assistencia" (ja implementado), mas tambem aparece no segundo quadro com motivo e dados
- Ao salvar, os itens do segundo quadro sao encaminhados via `encaminharParaAnaliseGarantia` (fluxo existente)

**Segundo quadro "Aparelhos para Analise na Assistencia":**
- Card adicional abaixo do quadro de produtos
- Tabela com colunas: Marca, Modelo, IMEI, Categoria, Motivo, Acoes (remover)
- Exibido apenas quando ha itens marcados para assistencia
- Titulo com icone Wrench e badge com contagem

---

## 5. Comunicacao Bidirecional Assistencia -> Nota de Entrada (2.1)

**Situacao atual:** A sincronizacao ja esta parcialmente implementada:
- `OSAssistenciaDetalhes.tsx` (linhas 376-401) ja chama `atualizarItemRevisao` e `sincronizarNotaComLote` ao finalizar OS
- `NotaDetalhesContent.tsx` (linhas 376-470) ja exibe a secao "Assistencia Tecnica" com tabela de itens e resumo financeiro
- `loteRevisaoApi.ts` ja possui `sincronizarNotaComLote` que atualiza `valorAbatimento` e `valorPendente`

**Problema residual:** O `NotaDetalhesContent` busca dados do lote em tempo real via `getLoteRevisaoByNotaId`, mas a atualizacao so aparece ao recarregar a pagina. Alem disso, a tabela na secao de Assistencia nao mostra o "Parecer" do tecnico.

**Correcao:**
- Na tabela de itens do lote em `NotaDetalhesContent.tsx`, adicionar coluna "Parecer" extraida do resumo da OS vinculada (via `osId` do item)
- Importar `getOrdemServicoById` de `assistenciaApi` para buscar o resumo da OS quando `item.osId` existir
- Exibir `os.resumo` ou "Aguardando" se a OS ainda nao foi finalizada

---

## Detalhes Tecnicos

### Arquivos alterados

| Arquivo | Alteracao |
|---|---|
| `src/pages/EstoqueNotaCadastrar.tsx` | Dropdown de Cor (getCores), campo Saude Bateria, condicao do botao Assistencia (Usado/Seminovo), segundo quadro de aparelhos para analise, opcao "Usado" na categoria |
| `src/components/estoque/NotaDetalhesContent.tsx` | Coluna "Parecer" na tabela de itens de assistencia (buscar resumo da OS vinculada) |

### Interface ProdutoLinha atualizada

```text
interface ProdutoLinha {
  // ... campos existentes
  saudeBateria: number;  // novo campo, default 100
}
```

### Categoria Select expandido

```text
Opcoes: Novo | Seminovo | Usado
```

### Dependencias

- `getCores` de `src/utils/coresApi.ts` (ja existe)
- `getOrdemServicoById` de `src/utils/assistenciaApi.ts` (ja existe)
- Sem novas dependencias npm

---

## Sequencia de Implementacao

1. `src/pages/EstoqueNotaCadastrar.tsx`:
   - Adicionar `saudeBateria` na interface e funcao vazia
   - Trocar Input de Cor por Select com `getCores()`
   - Adicionar coluna Saude Bateria condicional
   - Adicionar opcao "Usado" no Select de Categoria
   - Restringir botao assistencia para Usado/Seminovo
   - Criar segundo quadro "Aparelhos para Analise na Assistencia"

2. `src/components/estoque/NotaDetalhesContent.tsx`:
   - Adicionar coluna "Parecer" na tabela de assistencia tecnica

