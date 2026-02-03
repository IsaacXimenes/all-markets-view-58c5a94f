

# Plano: Adicionar Background na Tela de Login

## Objetivo
Adicionar a imagem enviada (Thiago Imports com pessoa segurando celulares) como plano de fundo da tela de login, posicionada **atrás** do card branco que contém o celular 3D e o formulário.

---

## Resultado Visual Esperado

```text
+--------------------------------------------------+
|                                                  |
|     [IMAGEM DE FUNDO - THIAGO IMPORTS]          |
|                                                  |
|       +----------------------------------+       |
|       |                                  |       |
|       |    CARD BRANCO (centralizado)    |       |
|       |    - Celular 3D | Formulário     |       |
|       |                                  |       |
|       +----------------------------------+       |
|                                                  |
+--------------------------------------------------+
```

---

## Etapas de Implementação

### 1. Copiar a imagem para o projeto
- Copiar a imagem enviada para `src/assets/login-background.jpg`
- Isso permite usar import ES6 para melhor bundling e otimização

### 2. Modificar `LoginCard.tsx`
- Importar a imagem de background
- Alterar o container externo de `bg-white` para usar a imagem de fundo
- Aplicar estilos para:
  - `background-image` com a imagem
  - `background-size: cover` para cobrir toda a tela
  - `background-position: center` para centralizar
  - `background-repeat: no-repeat`
- O card branco interno permanece inalterado, flutuando sobre o background

---

## Detalhes Tecicos

**Arquivo modificado:** `src/components/login/LoginCard.tsx`

**Mudancas no codigo:**
- Linha 22: Trocar `bg-white` por classes de background-image inline style
- Adicionar import da imagem no topo do arquivo
- Manter o card branco com sua sombra atual para dar contraste com o fundo

**Estrutura apos a mudanca:**
```
div (min-h-screen, background-image)
  └── div (card branco com sombra - permanece igual)
        └── conteudo do login
```

