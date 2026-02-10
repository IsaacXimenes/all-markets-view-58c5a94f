

# Plano: Filtro IMEI em Produtos para Analise + Permitir Desmonte com Prejuizo

## Resumo

Duas correcoes:
1. Filtro de IMEI na aba "Produtos para Analise" (OS) nao funciona com mascara
2. API de Retirada de Pecas bloqueia finalizacao quando valor das pecas e menor que custo do aparelho

---

## 1. Filtro de IMEI em Produtos para Analise

### Arquivo: `src/pages/OSProdutosAnalise.tsx`
- Linha 88: a comparacao atual e `produto.imei.toLowerCase().includes(filters.imei.toLowerCase())` - nao remove mascara
- Correcao: importar `unformatIMEI` de `@/utils/imeiMask` e comparar usando `unformatIMEI(produto.imei).includes(unformatIMEI(filters.imei))`
- Tambem aplicar `formatIMEI` no input de IMEI (linha 308) para exibir mascara enquanto digita (consistencia com outras telas)

---

## 2. Permitir Finalizacao de Desmonte com Prejuizo

### Arquivo: `src/utils/retiradaPecasApi.ts`
- Linhas 337-345: remover o bloqueio que impede finalizacao quando `validacao.valido === false`
- A validacao de custo (`validarCustoRetirada`) permanece como funcao informativa (usada pelo card de prejuizo), mas nao bloqueia mais a finalizacao
- Manter a validacao de pecas vazias (linha 333) como bloqueio obrigatorio

---

## Arquivos a editar

- `src/pages/OSProdutosAnalise.tsx` - correcao filtro IMEI com `unformatIMEI`
- `src/utils/retiradaPecasApi.ts` - remover bloqueio de custo na finalizacao

Nenhum arquivo novo sera criado.

