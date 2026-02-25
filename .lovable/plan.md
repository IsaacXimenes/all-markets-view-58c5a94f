

## Plano: Cabecalho Condicional na Nota de Garantia + Anexo PDF Fixo

### Contexto
A Nota de Garantia gerada pelo sistema atualmente usa um cabecalho fixo ("THIAGO IMPORTS / FEIRA DOS IMPORTADOS / BLOCO D, LOJA 433/434 - BRASILIA"). O cabecalho precisa variar conforme a loja da venda, e o PDF do Termo de Garantia (arquivo enviado pelo usuario) deve ser anexado automaticamente como segunda pagina.

### 1. Copiar o PDF do Termo de Garantia para o projeto

- Copiar o arquivo `Recibo_Modelo_-_Garantia.pdf` para `public/docs/termo-garantia.pdf`
- Ficara acessivel via URL estatica para ser carregado em runtime

### 2. Cabecalho condicional por loja (`src/utils/gerarNotaGarantiaPdf.ts`)

Substituir o bloco fixo de cabecalho (linhas 88-99) por logica condicional baseada em `venda.lojaVenda`:

```text
Mapeamento loja -> cabecalho:

Matriz (3ac7e00c) e Online (fcc78c1a):
  Linha 2: "FEIRA DOS IMPORTADOS"
  Linha 4: "BLOCO D, LOJA 433/434 - BRASILIA"

Shopping Sul (5b9446d5):
  Linha 2: "SHOPPING SUL"
  Linha 4: "BR-040 - Parque Esplanada III, Valparaiso de Goias"

Aguas Lindas (0d06e7db):
  Linha 2: "SHOPPING AGUAS LINDAS"
  Linha 4: "BR-070 - Mansoes Centroeste, Aguas Lindas de Goias"

JK Shopping (db894e7d):
  Linha 2: "JK SHOPPING"
  Linha 4: "St. M Norte QNM 34 Area especial 01 - Taguatinga"
```

- Criar funcao `getCabecalhoLoja(lojaId: string)` que retorna `{ subtitulo: string; endereco: string }`
- Usar `getLojaById` como fallback para lojas nao mapeadas (exibindo nome da loja + endereco generico)

### 3. Anexar PDF fixo do Termo de Garantia como segunda pagina

- Usar a biblioteca `jspdf` que ja esta instalada
- Apos gerar a primeira pagina (nota de garantia com cabecalho condicional), carregar o PDF do Termo via `fetch('/docs/termo-garantia.pdf')`
- Converter cada pagina do PDF em imagem (via canvas) e adiciona-las como paginas adicionais no documento jsPDF
- Alternativa mais simples: usar a abordagem de renderizar o PDF como imagem full-page usando um canvas offscreen, ja que o Termo tem apenas 2 paginas
- O resultado final sera um PDF unico com 3 paginas: Nota de Garantia + 2 paginas do Termo

### 4. Registro na Timeline da Venda

- No ponto de chamada (`VendaDetalhes.tsx`, linha 170), apos chamar `gerarNotaGarantiaPdf`, registrar entrada na timeline da venda informando:
  - Qual cabecalho foi utilizado (nome da loja)
  - Que o PDF fixo do Termo de Garantia foi anexado
- Usar funcao existente de timeline (pattern do `TimelineVenda`)

### Resumo de arquivos a modificar

1. **Copiar arquivo**: `user-uploads://Recibo_Modelo_-_Garantia.pdf` -> `public/docs/termo-garantia.pdf`
2. **`src/utils/gerarNotaGarantiaPdf.ts`**: Cabecalho condicional + anexar PDF do Termo como paginas adicionais
3. **`src/pages/VendaDetalhes.tsx`**: Registrar na timeline apos gerar a nota

### Detalhe tecnico

```typescript
// gerarNotaGarantiaPdf.ts - mapeamento de cabecalhos
const getCabecalhoLoja = (lojaId: string) => {
  const mapa: Record<string, { subtitulo: string; endereco: string }> = {
    '3ac7e00c': { subtitulo: 'FEIRA DOS IMPORTADOS', endereco: 'BLOCO D, LOJA 433/434 – BRASÍLIA' },
    'fcc78c1a': { subtitulo: 'FEIRA DOS IMPORTADOS', endereco: 'BLOCO D, LOJA 433/434 – BRASÍLIA' },
    '5b9446d5': { subtitulo: 'SHOPPING SUL', endereco: 'BR-040 – Parque Esplanada III, Valparaíso de Goiás' },
    '0d06e7db': { subtitulo: 'SHOPPING ÁGUAS LINDAS', endereco: 'BR-070 – Mansões Centroeste, Águas Lindas de Goiás' },
    'db894e7d': { subtitulo: 'JK SHOPPING', endereco: 'St. M Norte QNM 34 Área especial 01 – Taguatinga' },
  };
  return mapa[lojaId] || { subtitulo: 'FEIRA DOS IMPORTADOS', endereco: 'BLOCO D, LOJA 433/434 – BRASÍLIA' };
};

// Anexar PDF do Termo de Garantia
// Carregar como ArrayBuffer, renderizar paginas via pdf.js ou canvas, adicionar ao doc
const anexarTermoGarantia = async (doc: jsPDF) => {
  const response = await fetch('/docs/termo-garantia.pdf');
  const arrayBuffer = await response.arrayBuffer();
  // Usar pdfjsLib para renderizar cada pagina em canvas e adicionar como imagem
};
```

**Nota sobre a renderizacao do PDF anexo:** Como o projeto nao tem `pdfjs-dist` instalado, a abordagem sera converter o PDF do Termo em imagens PNG em build-time (extraidas do parse do documento) e salva-las como assets estaticos. Isso evita dependencia adicional e garante renderizacao perfeita. As 2 paginas do Termo serao salvas como `public/docs/termo-garantia-p1.png` e `public/docs/termo-garantia-p2.png`, e adicionadas ao jsPDF via `addImage`.
