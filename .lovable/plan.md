

## Duas Correções na Aba de Serviços (Assistência)

### 1. Adicionar coluna "Técnico" na tabela da aba Serviços

**Arquivo: `src/pages/OSOficina.tsx`**

- Adicionar uma coluna "Técnico" no cabeçalho da tabela (entre "Loja" e "Status")
- Renderizar o nome do técnico usando `obterNomeColaborador(os.tecnicoId)` que já está disponível no componente
- Atualizar o `colSpan` da mensagem de "nenhuma OS" de 8 para 9

### 2. Corrigir quebra de casas decimais no campo Valor do quadro Peças/Serviços (edição de OS)

**Problema:** No arquivo `src/pages/OSAssistenciaEditar.tsx`, o valor da peça é carregado na linha 168 como string formatada via `toLocaleString('pt-BR')` (ex: "1.234,56"). Porém, a função `calcularValorTotalPeca` (linha 210-214) faz `parseFloat(peca.valor.replace(/\D/g, '')) / 100`, que remove pontos e vírgulas, tratando "1.234,56" como "123456" / 100 = 1234.56.

O problema ocorre quando o `InputComMascara` com máscara `moeda` recebe essa string diretamente. O `getDisplayValue` retorna a string como está, mas ao interagir com o campo, a máscara reprocessa o valor, podendo gerar inconsistências nas casas decimais.

**Arquivo: `src/pages/OSAssistenciaEditar.tsx`**

- Na linha 168 (carregamento inicial das peças), converter o valor numérico usando `moedaMask` em vez de `toLocaleString`, garantindo formato consistente com o que o `InputComMascara` espera
- Importar `moedaMask` de `@/utils/formatUtils` (já importado o `InputComMascara` que usa essas funções)

Alteração na conversão:
```
// De:
valor: p.valor > 0 ? p.valor.toLocaleString('pt-BR', {...}) : ''

// Para:
valor: p.valor > 0 ? moedaMask(p.valor) : ''
```

A função `moedaMask(number)` converte corretamente um número para a string formatada que o `InputComMascara` espera, mantendo consistência no ciclo de formatação/parsing.

---

### Resumo de Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/OSOficina.tsx` | Adicionar coluna "Técnico" na tabela + colSpan |
| `src/pages/OSAssistenciaEditar.tsx` | Importar `moedaMask` e usar no carregamento do valor da peça |

