

## Cronometro de Produtividade, Desvinculacao Financeira e Automacao de Custos

**STATUS: IMPLEMENTADO**

### Implementado:

1. **Cronômetro de Produtividade** - Componente `CronometroOS.tsx` com display HH:MM:SS, botões Iniciar/Pausar/Retomar/Finalizar, edição manual por gestores. Integrado em OSAssistenciaEditar, OSAssistenciaNova, OSAnaliseGarantia (coluna Tempo) e OSAssistenciaDetalhes (somente leitura).

2. **Desvinculação Financeira** - Função `desvincularNotaDeLote` em solicitacaoPecasApi.ts. UI com botão "Desvincular" por item no detalhamento de lotes em FinanceiroNotasAssistencia, com confirmação em duas etapas (motivo + checkbox). Timeline registrada automaticamente.

3. **Automação de Custos** - Labels informativos de origem do custo ("Custo herdado do Lote CONS-XXX", "Custo herdado do desmonte", "Custo do estoque interno") adicionados nos badges DNA da peça em OSAssistenciaEditar e OSAssistenciaNova.
