

## Renomear "Oficina" para "Laboratório" e Desbloquear Valor Recomendado

### 1. Renomear "Oficina" para "Laboratório"

Todos os textos visíveis ao usuário que contenham "Oficina" serão substituídos por "Laboratório":

| Arquivo | Texto atual | Texto novo |
|---------|-------------|------------|
| `src/pages/EstoqueProdutoPendenteDetalhes.tsx` | "Retrabalho - Devolver para Oficina" (aparece em ~6 locais: SelectItem, validações, placeholders, toasts) | "Retrabalho - Devolver para Laboratório" |
| `src/utils/osApi.ts` | "Serviço Concluído na Oficina" (timeline) | "Serviço Concluído no Laboratório" |
| `src/utils/osApi.ts` | Comentário "validação pós-oficina" | "validação pós-laboratório" |

Os tabs de navegação já mostram "Serviços" (não "Oficina"), então não precisam de alteração.

### 2. Desbloquear botão "Informar Valor Recomendado"

**Problema**: Na aba de Aparelhos (`EstoqueProdutos.tsx`, linha 418), o botão "Informar Valor" só aparece clicável quando `produto.statusNota === 'Pendente'`. Para os demais produtos, aparece apenas o texto estático "Pendente" sem ação.

**Correção**: Tornar o botão "Informar Valor" sempre clicável para todos os produtos que ainda não têm `vendaRecomendada` definida, independentemente do `statusNota`. Isso permite que o usuário atual (João Gestor) preencha o valor.

**Arquivo: `src/pages/EstoqueProdutos.tsx` (linhas 416-435)**

Substituir a lógica condicional por um botão único que sempre permite informar o valor:

```text
ANTES:
  if statusNota === 'Pendente' -> botão clicável
  else -> texto estático "Pendente"

DEPOIS:
  Botão sempre clicável para qualquer produto sem vendaRecomendada
```

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/EstoqueProdutoPendenteDetalhes.tsx` | Renomear "Oficina" para "Laboratório" em todos os textos |
| `src/utils/osApi.ts` | Renomear "Oficina" para "Laboratório" nas timelines e comentários |
| `src/pages/EstoqueProdutos.tsx` | Remover condição de `statusNota` no botão "Informar Valor" |

