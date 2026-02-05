
# Plano: Corrigir Scroll do Modal de Recebimento

## Problema Identificado
O modal de "Registrar Recebimento" nao permite scroll porque:
1. O `DialogContent` usa `display: grid` por padrao (linha 139 do dialog.tsx)
2. O `flex-col` esta sendo sobrescrito pelo `grid`
3. O `ScrollArea` precisa de altura definida para funcionar corretamente

## Solucao

### Arquivo: `src/pages/EstoquePendenciasBaseTrocas.tsx`

Substituir a estrutura do modal para:
1. Adicionar `!flex` com important para sobrescrever o grid
2. Definir altura explicita no ScrollArea
3. Usar `overflow-y-auto` nativo ao inves do ScrollArea do Radix (mais confiavel)

### Alteracoes (linhas 333-518)

**Antes:**
```tsx
<DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] flex flex-col overflow-hidden">
  <DialogHeader className="flex-shrink-0">
    ...
  </DialogHeader>
  
  {tradeInSelecionado && (
    <ScrollArea className="flex-1 min-h-0 pr-4">
      <div className="space-y-6">
        ...
      </div>
    </ScrollArea>
  )}

  <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
    ...
  </DialogFooter>
</DialogContent>
```

**Depois:**
```tsx
<DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] !flex !flex-col overflow-hidden p-0">
  <DialogHeader className="flex-shrink-0 p-6 pb-4">
    ...
  </DialogHeader>
  
  {tradeInSelecionado && (
    <div className="flex-1 overflow-y-auto px-6">
      <div className="space-y-6 pb-4">
        ...
      </div>
    </div>
  )}

  <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t bg-background">
    ...
  </DialogFooter>
</DialogContent>
```

### Mudancas Tecnicas

| Elemento | Antes | Depois |
|----------|-------|--------|
| DialogContent | `flex flex-col` | `!flex !flex-col p-0` (important para sobrescrever grid) |
| DialogHeader | `flex-shrink-0` | `flex-shrink-0 p-6 pb-4` (padding manual) |
| ScrollArea | `<ScrollArea className="flex-1 min-h-0 pr-4">` | `<div className="flex-1 overflow-y-auto px-6">` (scroll nativo) |
| DialogFooter | `flex-shrink-0 mt-4 pt-4 border-t` | `flex-shrink-0 p-6 pt-4 border-t bg-background` |

### Por que usar scroll nativo?
O `ScrollArea` do Radix depende de altura explicita calculada, o que pode falhar em layouts flex dentro de modais. O `overflow-y-auto` nativo funciona de forma mais confiavel quando combinado com `flex-1`.

## Beneficios
1. **Scroll funcional** - Conteudo completo acessivel
2. **Layout estavel** - Header e Footer fixos, area central scrollavel
3. **Compatibilidade** - Funciona em todos os tamanhos de tela
4. **UX melhorada** - Usuario consegue anexar fotos e confirmar recebimento
