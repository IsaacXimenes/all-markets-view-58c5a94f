

# Plano: Correcoes no Fluxo de Troca Direta e Botao de Nota na Aba Em Andamento

## Problemas Identificados

### 1. Status do aparelho nao muda apos aprovacao
Na funcao `getStatusConsolidado` em `estoqueApi.ts` (linha 498), quando o produto tem `bloqueadoEmTrocaGarantiaId`, o status retornado e **"Reservado para Troca"** em vez de **"Troca - Garantia"**. Isso ocorre tanto antes quanto depois da aprovacao, pois o campo usado e o mesmo.

### 2. Botao de Gerar Nota ausente na aba Em Andamento
A nota de venda e gerada automaticamente na funcao `aprovarTratativa`, mas nao ha nenhum botao na tabela de "Garantias em Andamento" para o usuario gerar/baixar o PDF da nota. O botao existe apenas em `VendaDetalhes.tsx`.

---

## Alteracoes

### Arquivo: `src/utils/estoqueApi.ts`

**Corrigir status consolidado (linha 498)**

Alterar o retorno de `'Reservado para Troca'` para `'Troca - Garantia'` quando `bloqueadoEmTrocaGarantiaId` esta presente e `quantidade === 0` (ou seja, ja foi aprovado e dado baixa).

Logica:
- Se `bloqueadoEmTrocaGarantiaId` e `quantidade === 0`: retornar `'Troca - Garantia'`
- Se `bloqueadoEmTrocaGarantiaId` e `quantidade > 0`: retornar `'Reservado para Troca'` (antes da aprovacao)

### Arquivo: `src/pages/GarantiasEmAndamento.tsx`

**Adicionar botao "Gerar Nota" na coluna de Acoes da tabela**

Para tratativas do tipo "Troca Direta" que ja foram aprovadas (status "Em Andamento"):
- Adicionar um botao com icone `FileText` na coluna de acoes
- Ao clicar, buscar a venda gerada automaticamente (filtrar vendas por `origemVenda === 'Troca Garantia'` e observacoes contendo o ID da garantia)
- Chamar `gerarNotaGarantiaPdf(venda)` para gerar o PDF
- Registrar na timeline que a nota foi baixada

Imports necessarios:
- `FileText` do lucide-react
- `gerarNotaGarantiaPdf` de `@/utils/gerarNotaGarantiaPdf`
- `getVendas` de `@/utils/vendasApi`

Posicao: apos o botao de "Registrar devolucao" (Package) e antes do botao de "Finalizar" (CheckCircle), na coluna de Acoes (linhas 425-459).

Condicao de exibicao: `tratativa?.tipo === 'Troca Direta' && tratativa?.status === 'Em Andamento'`

---

## Resumo

| Arquivo | Alteracao |
|---------|----------|
| `src/utils/estoqueApi.ts` | Diferenciar status "Reservado para Troca" vs "Troca - Garantia" baseado na quantidade |
| `src/pages/GarantiasEmAndamento.tsx` | Botao "Gerar Nota" para tratativas Troca Direta aprovadas |

