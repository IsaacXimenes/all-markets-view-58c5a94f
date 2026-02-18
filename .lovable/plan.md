

## Correcao: Sincronizacao entre Finalizacao da OS e Aparelhos Pendentes no Estoque

### Problema Identificado

Quando o tecnico finaliza a OS com origem "Estoque" na pagina `OSAssistenciaDetalhes.tsx`, o sistema atualiza o status da OS para "Servico Concluido - Validar Aparelho", mas **nao chama a funcao `atualizarStatusProdutoPendente`** para sincronizar essa mudanca com o registro do produto na aba Aparelhos Pendentes do Estoque.

A funcao ja existe em `osApi.ts` (linha 331), mas nunca e importada nem invocada no fluxo de finalizacao.

### Correcao

**Arquivo: `src/pages/OSAssistenciaDetalhes.tsx`**

1. Adicionar import da funcao `atualizarStatusProdutoPendente` de `@/utils/osApi`
2. Na funcao `handleConfirmarFinalizacao` (linha 321), apos o `updateOrdemServico`, quando `isEstoque === true`, chamar:

```typescript
atualizarStatusProdutoPendente(osFresh.imeiAparelho, 'Serviço Concluído - Validar Aparelho', {
  osId: os.id,
  resumo: descMsg,
  custoPecas: valorCustoTecnico,
  responsavel: user?.colaborador?.nome || tecnico?.nome || 'Técnico'
});
```

Isso garante que:
- O status do produto pendente muda para "Servico Concluido - Validar Aparelho"
- O custo das pecas e registrado no campo `custoAssistencia` do produto
- Uma entrada na timeline do produto e criada automaticamente com os dados do servico
- O Gestor de Estoque vera o produto atualizado ao acessar a aba Aparelhos Pendentes

### Detalhes Tecnicos

Alteracao em um unico arquivo:

**`src/pages/OSAssistenciaDetalhes.tsx`**

- Linha 23: Adicionar `import { atualizarStatusProdutoPendente } from '@/utils/osApi';`
- Linha 349 (apos `setOS(updatedOS || null);`): Inserir bloco condicional `if (isEstoque && osFresh.imeiAparelho)` que chama `atualizarStatusProdutoPendente`

Nenhum outro arquivo precisa ser alterado. A funcao `atualizarStatusProdutoPendente` em `osApi.ts` ja trata a atualizacao de status, custo e timeline corretamente.

