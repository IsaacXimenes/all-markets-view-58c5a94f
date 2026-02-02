
# Plano: Menu de LogOff + Ajustes na Tela de Login

## Visao Geral

Implementar tres melhorias:
1. Adicionar menu dropdown no icone do usuario (Navbar) com opcao de LogOff
2. Simplificar painel esquerdo da tela de login (remover logo e texto "Thiago Imports")
3. Suavizar a animacao de flutuacao do celular 3D

---

## Alteracoes Detalhadas

### 1. Menu de LogOff no Navbar

**Arquivo:** `src/components/layout/Navbar.tsx`

Transformar o Avatar em um trigger de DropdownMenu:

| Antes | Depois |
|-------|--------|
| Avatar simples sem interacao | Avatar clicavel que abre menu dropdown |

**Estrutura do Menu:**

```text
+------------------+
| Minha Conta      |  <- Label (usuario logado)
|------------------|
| Sair             |  <- LogOff (icone LogOut)
+------------------+
```

**Funcionamento:**
- Clicar no Avatar abre o dropdown
- Opcao "Sair" chama `logout()` do authStore
- Apos logout, usuario e redirecionado automaticamente para `/login` (via ProtectedRoute)

---

### 2. Simplificar Tela de Login

**Arquivo:** `src/components/login/LoginCard.tsx`

| Remover | Manter/Alterar |
|---------|----------------|
| Logo (imagem) | Celular 3D |
| Texto "THIAGO IMPORTS" | Texto de descricao simplificado |
| "de importacoes" no texto | Manter apenas "Sua plataforma completa de gestao" |

**Texto Final:**
> "Sua plataforma completa de gestao. Acesse sua conta para continuar."

---

### 3. Suavizar Animacao do Celular

**Arquivo:** `tailwind.config.ts`

Ajustar keyframe `float` para movimento mais suave:

| Antes | Depois |
|-------|--------|
| `translateY(-5px)` em 50% | `translateY(-8px)` em 50% |
| Duracao: 3s | Duracao: 6s |
| Timing: ease-in-out | Timing: ease-in-out (mantido) |

A animacao mais lenta e com amplitude ligeiramente maior cria uma sensacao de flutuacao mais suave e elegante.

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/layout/Navbar.tsx` | Adicionar DropdownMenu com opcao LogOff |
| `src/components/login/LoginCard.tsx` | Remover logo, texto "THIAGO IMPORTS" e "de importacoes" |
| `tailwind.config.ts` | Ajustar keyframe `float` para movimento mais suave |

---

## Imports Necessarios (Navbar.tsx)

```typescript
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
```

---

## Fluxo de LogOff

```text
[Usuario clica no Avatar]
         |
         v
[Dropdown abre com opcoes]
         |
         v
[Usuario clica em "Sair"]
         |
         v
[authStore.logout() chamado]
         |
         v
[isAuthenticated = false]
         |
         v
[ProtectedRoute detecta]
         |
         v
[Redireciona para /login]
```

---

## Resultado Esperado

1. **Navbar:** Avatar com dropdown funcional, opcao "Sair" que desloga e retorna ao login
2. **Login:** Painel esquerdo mais limpo, apenas com celular 3D e texto simplificado
3. **Animacao:** Celular flutua de forma mais suave e elegante (6 segundos de ciclo)
