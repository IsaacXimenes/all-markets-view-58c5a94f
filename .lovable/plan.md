

# Plano de Implementação: Imagens Temporárias no Detalhamento de Aparelho

## Objetivo

Adicionar funcionalidade de anexar imagens temporariamente na tela de detalhamento de produto (`EstoqueProdutoDetalhes.tsx`), permitindo upload, visualização, download e remoção de imagens que ficam apenas em memória (Blob URLs) e são descartadas ao atualizar/fechar a página.

---

## Arquitetura da Solução

A funcionalidade será implementada usando **Blob URLs** (`URL.createObjectURL`) ao invés de base64, garantindo melhor performance e menor uso de memória. O estado será mantido apenas no componente React, sem qualquer persistência.

```text
+---------------------------+
|   EstoqueProdutoDetalhes  |
|---------------------------|
|  useState<ImagemTemp[]>   |  <-- Estado em memória (volátil)
|        |                  |
|        v                  |
|  ImagensTemporarias       |  <-- Novo componente
|  (upload, grid, actions)  |
+---------------------------+
         |
         | onUnload: revokeObjectURL (limpeza)
         v
     [Descartado ao atualizar/fechar página]
```

---

## Etapas de Implementação

### 1. Criar Componente `ImagensTemporarias`

Criar um novo componente em `src/components/estoque/ImagensTemporarias.tsx` que gerencia:

- **Upload**: Botao e area de drag-and-drop para selecionar imagens
- **Visualizacao**: Grid de miniaturas das imagens carregadas
- **Acoes por imagem**: Botoes de download e remover
- **Limpeza de memoria**: Revoga Blob URLs ao desmontar o componente

**Interface do componente:**

```text
ImagensTemporarias
  Props:
    - imagens: ImagemTemporaria[]
    - onImagensChange: (imagens) => void
    - maxFiles?: number (padrao: 20)
    - maxSizeMB?: number (padrao: 10)

  ImagemTemporaria:
    - id: string
    - nome: string
    - tipo: string
    - tamanho: number
    - blobUrl: string (URL.createObjectURL)
    - file: File (referencia original para download)
```

### 2. Funcionalidades Detalhadas do Componente

**Upload:**
- Aceitar apenas imagens (`image/*`)
- Suporte a multiplos arquivos simultaneos
- Validacao de tamanho maximo por arquivo
- Compativel com desktop (file picker, drag-and-drop) e mobile (camera/galeria)
- Input com `accept="image/*"` para abrir camera em dispositivos moveis

**Visualizacao:**
- Grid responsivo de miniaturas (3-4 colunas em desktop, 2 em mobile)
- Preview usando Blob URL
- Nome do arquivo truncado com tooltip
- Tamanho formatado (KB/MB)

**Acoes:**
- **Download**: Cria link temporario e dispara download do arquivo original
- **Remover**: Remove do estado e revoga o Blob URL correspondente

**Aviso visual:**
- Badge ou alerta amarelo informando que as imagens sao temporarias
- Texto explicativo: "Estas imagens serao perdidas ao atualizar ou fechar a pagina"

### 3. Integrar na Pagina EstoqueProdutoDetalhes

**Alteracoes em `src/pages/EstoqueProdutoDetalhes.tsx`:**

1. Adicionar estado para imagens temporarias:
   ```text
   const [imagensTemporarias, setImagensTemporarias] = useState<ImagemTemporaria[]>([]);
   ```

2. Adicionar efeito para limpeza de Blob URLs ao desmontar:
   ```text
   useEffect(() => {
     return () => {
       imagensTemporarias.forEach(img => URL.revokeObjectURL(img.blobUrl));
     };
   }, [imagensTemporarias]);
   ```

3. Renderizar o novo Card ao final da pagina (apos "Historico de Preco de Custo"):
   - Titulo: "Imagens Anexadas Temporariamente"
   - Icone: Camera ou Image
   - Componente ImagensTemporarias integrado

### 4. Layout Visual do Componente

```text
+-------------------------------------------------------+
|  [Camera Icon] Imagens Anexadas Temporariamente   (3) |
+-------------------------------------------------------+
|  [!] Estas imagens serao perdidas ao atualizar        |
|      ou fechar a pagina.                              |
|-------------------------------------------------------|
|  [Selecionar Imagens]  [Tirar Foto]                   |
|  ou arraste arquivos aqui                             |
|-------------------------------------------------------|
|  +----------+  +----------+  +----------+             |
|  | [thumb]  |  | [thumb]  |  | [thumb]  |             |
|  | foto1.jpg|  | foto2.png|  | foto3.jpg|             |
|  | 1.2 MB   |  | 850 KB   |  | 2.1 MB   |             |
|  | [v] [x]  |  | [v] [x]  |  | [v] [x]  |             |
|  +----------+  +----------+  +----------+             |
+-------------------------------------------------------+
         [v] = Download    [x] = Remover
```

---

## Detalhes Tecnicos

### Uso de Blob URLs

- **Criacao**: `URL.createObjectURL(file)` ao carregar cada imagem
- **Limpeza**: `URL.revokeObjectURL(blobUrl)` ao remover ou desmontar componente
- **Vantagem**: Melhor performance que base64 para arquivos grandes

### Download de Imagens

```text
const handleDownload = (imagem: ImagemTemporaria) => {
  const link = document.createElement('a');
  link.href = imagem.blobUrl;
  link.download = imagem.nome;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

### Suporte a Camera Mobile

O input de arquivo com `accept="image/*"` permite que dispositivos moveis oferecam opcao de camera ou galeria nativamente.

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/estoque/ImagensTemporarias.tsx` | Criar (novo componente) |
| `src/pages/EstoqueProdutoDetalhes.tsx` | Modificar (adicionar estado e renderizar componente) |

---

## Consistencia Visual

O componente seguira os padroes ja estabelecidos no sistema:
- Cards do shadcn/ui
- Botoes com variantes outline e ghost
- Cores de alerta (amber) para avisos
- Grid responsivo com Container Queries
- Icones do lucide-react

---

## Comportamento Esperado

1. Usuario abre detalhes de um produto
2. Rola ate o final e ve o quadro "Imagens Anexadas Temporariamente"
3. Clica em "Selecionar Imagens" ou arrasta arquivos
4. Imagens aparecem como miniaturas no grid
5. Usuario pode baixar qualquer imagem clicando no icone de download
6. Usuario pode remover qualquer imagem clicando no X
7. Se atualizar (F5) ou fechar a pagina, todas as imagens sao perdidas

