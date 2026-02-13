

## Plano: Destaque do Saldo no Card de Conta

### Alteracao

**Arquivo:** `src/pages/FinanceiroExtratoContas.tsx`

Reorganizar o layout do card de cada conta financeira para dar mais destaque ao saldo, movendo-o para logo abaixo da informacao da loja e acima das barras de Entradas/Saidas.

**Layout atual:**
```text
Nome da Conta          [icone olho]
Loja - Nome da Loja
Entradas               R$ X.XXX,XX
[barra verde]
Saidas                 R$ X.XXX,XX
[barra vermelha]
---
Saldo Atual            R$ X.XXX,XX
```

**Layout novo:**
```text
Nome da Conta          [icone olho]
Loja - Nome da Loja
SALDO DA CONTA: R$ X.XXX,XX
Entradas               R$ X.XXX,XX
[barra verde]
Saidas                 R$ X.XXX,XX
[barra vermelha]
```

### Detalhes tecnicos

- Mover o bloco de "Saldo" (linhas 342-350) para dentro do `CardHeader`, logo apos a linha da loja (apos linha 309)
- Estilizar com fonte maior e em destaque (ex: `text-lg font-bold`)
- Label "SALDO DA CONTA:" em texto uppercase/semibold
- Remover o bloco antigo de saldo do final do `CardContent` (eliminar a divisoria `border-t`)
- Manter a logica de calculo: `(conta.saldoInicial || 0) + entradas - saidas`
- Manter cor condicional (verde positivo, vermelho negativo)

