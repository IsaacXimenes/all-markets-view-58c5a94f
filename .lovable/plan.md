

## Correcao: Dados Sumindo ao Editar e Finalizar OS na Aba de Servicos

### Diagnostico

O problema tem duas causas raiz:

1. **OSOficina (`handleFinalizar`)**: Usa `osParaFinalizar.timeline` que e uma referencia potencialmente obsoleta do estado do componente. Quando o usuario edita a OS em outra pagina e depois finaliza pelo modal do OSOficina, a timeline passada pode sobrescrever dados mais recentes. Precisa fazer "fresh fetch" antes de atualizar.

2. **OSAssistenciaDetalhes (`handleSaveChanges`)**: Apos salvar, `setOS(updatedOS)` atualiza o estado `os`, mas os estados de edicao (`editPecas`, `editPagamentosQuadro`, `valorCustoTecnico`, `valorVendaTecnico`) NAO sao re-sincronizados com o novo `os`. Isso causa:
   - Se o usuario clicar "Editar OS" novamente, `editPecas` tera dados stale do useEffect original (que so roda em `[id]`)
   - Se o usuario editar e salvar DUAS vezes na mesma sessao, a segunda edicao pode sobrescrever com dados parciais

3. **Uso de `os.timeline` stale em varios handlers**: `handleValidarFinanceiro` (linha 329) e o handler de confirmar recebimento (linha 874) usam `os.timeline` do estado local em vez de buscar os dados frescos do store.

### Correcoes

**Arquivo 1: `src/pages/OSOficina.tsx`**

Na funcao `handleFinalizar` (linhas 117-153):
- Adicionar fresh fetch via `getOrdemServicoById(osParaFinalizar.id)` antes de chamar `updateOrdemServico`
- Usar a timeline fresca em vez de `osParaFinalizar.timeline`

Codigo corrigido:
```typescript
const handleFinalizar = () => {
    if (!osParaFinalizar) return;
    // validacoes existentes...

    // Fresh fetch para evitar dados obsoletos
    const osFresh = getOrdemServicoById(osParaFinalizar.id);
    if (!osFresh) return;

    updateOrdemServico(osParaFinalizar.id, {
      status: 'Servico concluido',
      proximaAtuacao: 'Atendente',
      resumoConclusao,
      valorCustoTecnico: valorCustoRaw,
      valorVendaTecnico: valorVendaRaw,
      timeline: [...osFresh.timeline, { /* entrada de conclusao */ }]
    });
    // resto igual...
};
```

**Arquivo 2: `src/pages/OSAssistenciaDetalhes.tsx`**

1. Na funcao `handleSaveChanges` (linhas 109-167): Apos salvar e atualizar `os`, re-sincronizar os estados de edicao:
```typescript
    // Apos setOS(updatedOS):
    if (updatedOS) {
      setEditPecas([...updatedOS.pecas]);
      setEditClienteId(updatedOS.clienteId);
      setEditLojaId(updatedOS.lojaId);
      setEditTecnicoId(updatedOS.tecnicoId);
      setEditStatus(updatedOS.status);
      setEditSetor(updatedOS.setor);
      setEditDescricao(updatedOS.descricao || '');
      setValorCustoTecnico(updatedOS.valorCustoTecnico || 0);
      setValorVendaTecnico(updatedOS.valorVendaTecnico || 0);
    }
```

2. Na funcao `handleValidarFinanceiro` (linhas 324-339): Fresh fetch antes de atualizar:
```typescript
    const osFresh = getOrdemServicoById(os.id);
    if (!osFresh) return;
    updateOrdemServico(os.id, {
      status: 'Liquidado',
      proximaAtuacao: '-',
      timeline: [...osFresh.timeline, { /* entrada */ }]
    });
```

3. No handler de confirmar recebimento (linhas 871-884): Usar fresh fetch para timeline:
```typescript
    const osFresh = getOrdemServicoById(os.id);
    if (!osFresh) return;
    updateOrdemServico(os.id, {
      status: 'Em servico',
      proximaAtuacao: 'Tecnico',
      timeline: [...osFresh.timeline, { /* entrada */ }]
    });
```

### Resumo de Arquivos

| Arquivo | Alteracao |
|---|---|
| `src/pages/OSOficina.tsx` | Fresh fetch em handleFinalizar para evitar timeline stale |
| `src/pages/OSAssistenciaDetalhes.tsx` | Re-sincronizar estados de edicao apos save; fresh fetch em handleValidarFinanceiro e confirmar recebimento |

