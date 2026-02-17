

## Ajuste: Trocar Checkboxes por Listas Suspensas (Select) no Quadro de Pecas/Servicos

### Problema
Os checkboxes (flags) de "Peca no estoque", "Fornecedor" e "Servico Terceirizado" estao com comportamento inconsistente -- as vezes marcam, as vezes nao. Isso ocorre por conflitos na propagacao de eventos do componente `Checkbox` do Radix UI dentro do layout de cards.

### Solucao
Substituir os 3 checkboxes por um unico campo **Select (lista suspensa)** com as opcoes de origem/tipo da peca. Isso resolve o bug e melhora a usabilidade.

O Select tera as seguintes opcoes:
- **Nenhum** (valor padrao -- peca manual sem flags)
- **Peca no estoque** (ativa selecao de peca do estoque)
- **Fornecedor** (ativa campo de fornecedor)
- **Servico Terceirizado** (ativa campos de terceirizado)

### Arquivos a Editar (3 arquivos)

| Arquivo | Alteracao |
|---|---|
| `src/pages/OSAssistenciaNova.tsx` | Substituir 3 checkboxes por 1 Select de "Origem da Peca" |
| `src/pages/OSAssistenciaEditar.tsx` | Mesmo ajuste |
| `src/pages/OSAssistenciaDetalhes.tsx` | Mesmo ajuste (modo edicao inline) |

### Detalhes Tecnicos

Em cada arquivo, os 3 checkboxes serao substituidos por um unico `Select`:

```text
Antes (3 checkboxes):
[x] Peca no estoque  [ ] Fornecedor  [ ] Servico Terceirizado

Depois (1 Select):
Origem da Peca: [ Selecione... v ]
  - Nenhum
  - Peca no estoque
  - Fornecedor
  - Servico Terceirizado
```

A logica interna sera mantida: ao selecionar uma opcao, os campos `pecaNoEstoque`, `pecaDeFornecedor` e `servicoTerceirizado` serao atualizados automaticamente (marcando o selecionado como `true` e os demais como `false`), garantindo que os campos condicionais continuem aparecendo corretamente.

