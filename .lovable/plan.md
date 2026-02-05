
# Plano: Corrigir Migração e Adicionar Coluna Data/Hora

## Problema Identificado

Após análise do código, identifiquei que:

1. **A migração está funcionando parcialmente** - A função `migrarParaProdutosPendentes` chama `addProdutoPendente` corretamente
2. **O IMEI está sendo passado com hífens removidos** mas o formato original do mock (`99-888777-666555-4`) pode causar problemas na remoção
3. **Falta coluna de Data/Hora** na tabela de Base de Trocas

### Causa Raiz da Não-Migração

Na linha 218 de `baseTrocasPendentesApi.ts`:
```typescript
imei: tradeIn.tradeIn.imei?.replace(/-/g, '') || ''
```

O IMEI no mock é `99-888777-666555-4` (17 caracteres com hífens). Após `replace(/-/g, '')` fica `998887776665554` (15 dígitos) - correto!

O problema real é que os dados mockados da osApi já podem conter IMEIs que estão conflitando, OU a verificação de IMEI na `addProdutoPendente` está encontrando duplicata e retornando o existente sem adicionar.

## Alterações Necessárias

### Arquivo 1: `src/pages/EstoquePendenciasBaseTrocas.tsx`

#### 1.1 Adicionar coluna "Data/Hora" na tabela

| Linha | Alteração |
|-------|-----------|
| 283-294 | Adicionar `<TableHead>Data/Hora</TableHead>` após "Loja" |
| 310-320 | Adicionar célula com data formatada |

**Estrutura atualizada da tabela:**
```text
| Modelo | IMEI | Cliente | ID Venda | Loja | Data/Hora | Vendedor | Valor | SLA | Status | Ações |
```

#### 1.2 Formatar data/hora
Usar `formatDateTime` de `formatUtils.ts` para exibir `dataVenda` como "05/02/2025 10:30"

### Arquivo 2: `src/utils/baseTrocasPendentesApi.ts`

#### 2.1 Melhorar log de debug na migração

Adicionar console.log para debug do IMEI sendo passado:
```typescript
const imeiLimpo = tradeIn.tradeIn.imei?.replace(/-/g, '') || '';
console.log(`[BaseTrocasAPI] Migrando IMEI: ${imeiLimpo} (original: ${tradeIn.tradeIn.imei})`);
```

### Arquivo 3: `src/utils/osApi.ts`

#### 3.1 Forçar criação mesmo com IMEI existente (flag opcional)

Modificar `addProdutoPendente` para aceitar um parâmetro `forcarCriacao` que ignora a verificação de duplicata quando vindo de Base de Troca:

```typescript
export const addProdutoPendente = (
  produto: Omit<ProdutoPendente, 'id' | 'timeline' | ...>,
  forcarCriacao: boolean = false
): ProdutoPendente => {
  // Verificar duplicatas APENAS se não for forçado
  if (!forcarCriacao && produto.imei) {
    const jaExiste = produtosPendentes.find(p => p.imei === produto.imei);
    if (jaExiste) {
      console.log(`[OS API] IMEI ${produto.imei} já existe, retornando existente.`);
      return jaExiste;
    }
  }
  // ... resto do código de criação
}
```

E na chamada em `migrarParaProdutosPendentes`:
```typescript
const produtoPendente = addProdutoPendente({...}, true); // força criação
```

## Resumo das Mudanças

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| EstoquePendenciasBaseTrocas.tsx | UI | Adicionar coluna Data/Hora formatada |
| baseTrocasPendentesApi.ts | Debug | Melhorar logs de debug na migração |
| osApi.ts | Lógica | Adicionar flag `forcarCriacao` em `addProdutoPendente` |

## Fluxo Corrigido

```text
1. Usuário clica "Registrar Recebimento"
2. Anexa fotos e confirma
3. Sistema:
   a. Atualiza status para "Recebido" (mantém histórico com Data/Hora visível)
   b. Chama migrarParaProdutosPendentes com forcarCriacao=true
   c. Produto é SEMPRE criado em Produtos Pendentes
   d. Redireciona para /estoque/produtos-pendentes
```
