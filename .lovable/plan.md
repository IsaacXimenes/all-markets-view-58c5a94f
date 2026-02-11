

# Plano - Corrigir loja automática considerando rodízio ativo

## Problema

Ao selecionar um colaborador que está em rodízio na "Nova Venda" ou "Venda Balcão", o sistema preenche a "Loja de Venda" com a loja base do colaborador (`col.loja_id`) ao invés da loja onde ele está atualmente alocado via rodízio.

## Solução

Nos dois arquivos onde ocorre o auto-preenchimento da loja, verificar se o colaborador possui um rodízio ativo. Se sim, usar a `loja_destino_id` do rodízio. Caso contrário, manter o comportamento atual (`col.loja_id`).

## Alterações

### 1. `src/pages/VendasNova.tsx` (linha ~1108-1112)

- Importar `obterRodizioAtivoDoColaborador` do `useCadastroStore`
- No callback de seleção do responsável, verificar rodízio ativo antes de definir a loja:
  - Se houver rodízio ativo, usar `rodizio.loja_destino_id`
  - Senão, usar `col.loja_id`

### 2. `src/pages/VendasAcessorios.tsx` (linha ~497-502)

- Mesma correção: importar e verificar rodízio ativo antes de definir a loja

## Detalhes Técnicos

Lógica atualizada (ambos os arquivos):

```text
const col = obterColaboradorById(id);
if (col) {
  const rodizio = obterRodizioAtivoDoColaborador(col.id);
  setLojaVenda(rodizio ? rodizio.loja_destino_id : col.loja_id);
}
```

Nenhum outro arquivo será alterado.
