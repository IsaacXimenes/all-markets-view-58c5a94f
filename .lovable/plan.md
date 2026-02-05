
# Plano: Adicionar Redirecionamento para Produtos Pendentes

## Contexto Atual
Ao confirmar o recebimento de um trade-in na aba "Pendências - Base de Trocas":
1. O status é atualizado para "Recebido" (mantendo histórico)
2. O aparelho é migrado para Produtos Pendentes via `migrarParaProdutosPendentes`
3. A lista é atualizada removendo o item recebido
4. **Falta**: Redirecionamento automático para a aba de Produtos Pendentes

## Alteração Necessária

### Arquivo: `src/pages/EstoquePendenciasBaseTrocas.tsx`

#### 1. Adicionar import do useNavigate
```typescript
import { useNavigate } from 'react-router-dom';
```

#### 2. Adicionar hook de navegação
```typescript
const navigate = useNavigate();
```

#### 3. Adicionar redirecionamento após sucesso (linha ~148-158)
Após a migração bem-sucedida, redirecionar para a página de Produtos Pendentes:

```typescript
if (produtoMigrado) {
  toast.success('Recebimento registrado com sucesso!', {
    description: `Aparelho migrado para Produtos Pendentes (${produtoMigrado.id}). SLA de Tratativas iniciado.`
  });
  
  // Fechar modal e redirecionar
  setShowRecebimentoModal(false);
  navigate('/estoque/produtos-pendentes');
}
```

## Fluxo Atualizado

```text
1. Usuario clica em "Registrar Recebimento"
2. Anexa fotos do estado atual do aparelho
3. Clica em "Confirmar Recebimento"
4. Sistema:
   - Atualiza status para "Recebido" (mantem historico)
   - Migra para Produtos Pendentes (inicia SLA de Tratativas)
   - Exibe toast de sucesso
   - Redireciona automaticamente para /estoque/produtos-pendentes
```

## Beneficios
- UX mais fluida - usuario vai direto para a proxima etapa do fluxo
- Consistencia com outros modulos que redirecionam apos acao (ex: Parecer Encaminhamento)
- Historico preservado na lista de trade-ins com status "Recebido"
