

# Plano: Filtro padrao por semana atual (Domingo a Sabado)

## Objetivo

Ao abrir a aba de Conferencia Diaria, os campos "Data Inicio" e "Data Fim" ja virao preenchidos automaticamente com a semana atual (domingo a sabado), mas continuam editaveis pelo usuario.

Exemplo: Se hoje e segunda 09/02/2026, o filtro inicia com:
- Data Inicio: 08/02/2026 (domingo)
- Data Fim: 14/02/2026 (sabado)

## Alteracao

**Arquivo:** `src/pages/GestaoAdministrativa.tsx`

1. Adicionar imports `startOfWeek` e `endOfWeek` de `date-fns` (linha 24)
2. Alterar a inicializacao dos estados `dataInicio` e `dataFim` (linhas 55-56) de `undefined` para a semana atual:

```text
// De:
const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
const [dataFim, setDataFim] = useState<Date | undefined>(undefined);

// Para:
const [dataInicio, setDataInicio] = useState<Date | undefined>(
  startOfWeek(new Date(), { weekStartsOn: 0 })
);
const [dataFim, setDataFim] = useState<Date | undefined>(
  endOfWeek(new Date(), { weekStartsOn: 0 })
);
```

Os DatePickers existentes continuam funcionando normalmente para edicao manual. Nenhum outro arquivo precisa ser alterado.

