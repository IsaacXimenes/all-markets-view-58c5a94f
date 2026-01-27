import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Banknote, 
  Package, 
  ShoppingCart, 
  Shield, 
  Wrench, 
  BarChart3, 
  Database,
  Plus,
  Store,
  User,
  Search
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useCadastroStore } from '@/store/cadastroStore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Dados estáticos de navegação
const navigationItems = [
  { name: 'Painel', href: '/', icon: Home, keywords: ['dashboard', 'inicio', 'home'] },
  { name: 'Recursos Humanos', href: '/rh', icon: Users, keywords: ['rh', 'funcionarios', 'equipe', 'colaboradores'] },
  { name: 'Financeiro', href: '/financeiro/conferencia', icon: Banknote, keywords: ['dinheiro', 'contas', 'pagamentos'] },
  { name: 'Estoque', href: '/estoque', icon: Package, keywords: ['produtos', 'inventario', 'notas'] },
  { name: 'Vendas', href: '/vendas', icon: ShoppingCart, keywords: ['pedidos', 'clientes', 'vender'] },
  { name: 'Garantias', href: '/garantias/nova', icon: Shield, keywords: ['troca', 'devolucao', 'garantia'] },
  { name: 'Assistência', href: '/os/produtos-analise', icon: Wrench, keywords: ['os', 'conserto', 'reparo'] },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3, keywords: ['graficos', 'dados', 'metricas'] },
  { name: 'Cadastros', href: '/cadastros', icon: Database, keywords: ['registros', 'configuracoes', 'lojas'] },
];

// Ações rápidas
const quickActions = [
  { name: 'Nova Venda', href: '/vendas/nova', icon: Plus, description: 'Iniciar uma nova venda' },
  { name: 'Nova Venda Digital', href: '/vendas/nova-digital', icon: Plus, description: 'Venda para cliente online' },
  { name: 'Nova OS', href: '/os/assistencia/nova', icon: Plus, description: 'Abrir ordem de serviço' },
  { name: 'Nova Garantia', href: '/garantias/nova', icon: Plus, description: 'Registrar garantia' },
  { name: 'Cadastrar Nota', href: '/estoque/nota/cadastrar', icon: Plus, description: 'Entrada de estoque' },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { lojas, colaboradores, obterNomeLoja } = useCadastroStore();

  // Atalho de teclado Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Filtrar navegação
  const filteredNavigation = useMemo(() => {
    if (!search) return navigationItems;
    const term = search.toLowerCase();
    return navigationItems.filter(item => 
      item.name.toLowerCase().includes(term) ||
      item.keywords.some(k => k.includes(term))
    );
  }, [search]);

  // Filtrar ações rápidas
  const filteredActions = useMemo(() => {
    if (!search) return quickActions;
    const term = search.toLowerCase();
    return quickActions.filter(item => 
      item.name.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term)
    );
  }, [search]);

  // Filtrar lojas (só quando há busca)
  const filteredLojas = useMemo(() => {
    if (!search || search.length < 2) return [];
    const term = search.toLowerCase();
    return lojas
      .filter(loja => 
        loja.nome.toLowerCase().includes(term) ||
        loja.tipo.toLowerCase().includes(term)
      )
      .slice(0, 5);
  }, [search, lojas]);

  // Filtrar colaboradores (só quando há busca)
  const filteredColaboradores = useMemo(() => {
    if (!search || search.length < 2) return [];
    const term = search.toLowerCase();
    return colaboradores
      .filter(col => 
        col.nome.toLowerCase().includes(term) ||
        col.cargo.toLowerCase().includes(term)
      )
      .slice(0, 5);
  }, [search, colaboradores]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setSearch('');
    navigate(href);
  };

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'Loja': return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'Estoque': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'Assistência': return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
      case 'Financeiro': return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      case 'Administrativo': return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
      default: return '';
    }
  };

  const hasResults = filteredNavigation.length > 0 || 
                     filteredActions.length > 0 || 
                     filteredLojas.length > 0 || 
                     filteredColaboradores.length > 0;

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-md bg-muted/50 text-sm text-muted-foreground hover:bg-muted/80 md:w-64 lg:w-80"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Buscar no sistema...</span>
        <span className="inline-flex lg:hidden">Buscar...</span>
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Digite para buscar módulos, ações, lojas, colaboradores..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          {!hasResults && (
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          )}

          {/* Navegação */}
          {filteredNavigation.length > 0 && (
            <CommandGroup heading="Navegação">
              {filteredNavigation.map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.name}
                  onSelect={() => handleSelect(item.href)}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Ações Rápidas */}
          {filteredActions.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Ações Rápidas">
                {filteredActions.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={item.name}
                    onSelect={() => handleSelect(item.href)}
                    className="cursor-pointer"
                  >
                    <item.icon className="mr-2 h-4 w-4 text-primary" />
                    <span>{item.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Lojas */}
          {filteredLojas.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Lojas">
                {filteredLojas.map((loja) => (
                  <CommandItem
                    key={loja.id}
                    value={`loja-${loja.nome}`}
                    onSelect={() => handleSelect('/cadastros/lojas')}
                    className="cursor-pointer"
                  >
                    <Store className="mr-2 h-4 w-4" />
                    <span>{loja.nome}</span>
                    <Badge 
                      variant="outline" 
                      className={cn("ml-auto text-xs", getTipoBadgeColor(loja.tipo))}
                    >
                      {loja.tipo}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Colaboradores */}
          {filteredColaboradores.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Colaboradores">
                {filteredColaboradores.map((col) => (
                  <CommandItem
                    key={col.id}
                    value={`colaborador-${col.nome}`}
                    onSelect={() => handleSelect(`/rh/funcionario/${col.id}`)}
                    className="cursor-pointer"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>{col.nome}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {col.cargo}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {obterNomeLoja(col.loja_id)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
