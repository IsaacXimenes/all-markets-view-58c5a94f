
## Correção: Peças/Serviços desaparecendo ao editar OS

### Problema identificado
Na tela de detalhes da OS (`OSAssistenciaDetalhes.tsx`), ao clicar em "Editar OS", o quadro de Peças/Serviços mostra o item existente, porém o campo **Descrição** aparece vazio quando a peça tem origem "Peça no estoque" (`pecaNoEstoque: true`).

Isso acontece porque o campo Descrição renderiza como um `<Select>` com opções vindas do estoque atual (peças disponíveis com quantidade > 0). Se o valor salvo (ex: "Troca de bateria") não corresponde a nenhuma `descricao` das peças em estoque, o Select não consegue exibir o valor e aparece em branco.

### Solução

**Arquivo: `src/pages/OSAssistenciaDetalhes.tsx`**

1. No `<Select>` de descrição da peça (quando `pecaNoEstoque` é true), incluir o valor já salvo como uma opção no dropdown caso ele não exista na lista de peças disponíveis no estoque. Isso garante que a descrição previamente cadastrada continue visível e selecionada ao entrar no modo de edição.

2. Alternativa mais simples e robusta: quando a peça já tem uma descrição preenchida e está marcada como "Peça no estoque", exibir a descrição atual como opção fixa no Select, mesmo que a peça não esteja mais disponível no estoque.

### Detalhes Técnicos

No trecho do Select de descrição (linhas 699-733), antes de renderizar as opções do estoque, verificar se `peca.peca` (valor atual) já possui um valor e se esse valor **não** está na lista `pecasEstoque`. Caso positivo, incluir um `<SelectItem>` extra com o valor atual para que o Select consiga exibi-lo corretamente.

```text
Antes:
  <SelectContent>
    {pecasEstoque.filter(...).map(p => <SelectItem value={p.descricao}>...)}
  </SelectContent>

Depois:
  <SelectContent>
    {/* Incluir valor atual se não estiver na lista */}
    {peca.peca && !pecasEstoque.some(p => p.descricao === peca.peca && p.status === 'Disponível' && p.quantidade > 0) && (
      <SelectItem value={peca.peca}>{peca.peca} (salvo anteriormente)</SelectItem>
    )}
    {pecasEstoque.filter(...).map(p => <SelectItem value={p.descricao}>...)}
  </SelectContent>
```

Essa alteracao e pontual (apenas no arquivo `OSAssistenciaDetalhes.tsx`, na secao de renderizacao do Select de descricao) e resolve o problema sem impactar outros fluxos.
