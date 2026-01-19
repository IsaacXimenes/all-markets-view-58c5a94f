import { useState, useMemo } from 'react';
import { useCadastroStore } from '@/store/cadastroStore';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { User, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type FiltroTipo = 'todos' | 'gestores' | 'vendedores' | 'estoquistas' | 'tecnicos' | 'motoboys';

interface AutocompleteColaboradorProps {
  value: string;
  onChange: (colaboradorId: string) => void;
  placeholder?: string;
  filtrarPorCargo?: string;
  filtrarPorTipo?: FiltroTipo;
  filtrarPorLoja?: string;
  apenasAtivos?: boolean;
  className?: string;
  disabled?: boolean;
}

export function AutocompleteColaborador({ 
  value, 
  onChange, 
  placeholder = 'Selecione um colaborador',
  filtrarPorCargo,
  filtrarPorTipo = 'todos',
  filtrarPorLoja,
  apenasAtivos = true,
  className,
  disabled = false
}: AutocompleteColaboradorProps) {
  const { 
    colaboradores, 
    obterColaboradorById, 
    obterNomeLoja,
    obterGestores,
    obterVendedores,
    obterEstoquistas,
    obterTecnicos,
    obterMotoboys
  } = useCadastroStore();
  
  const [filtro, setFiltro] = useState('');
  const [aberto, setAberto] = useState(false);

  const colaboradorSelecionado = useMemo(() => {
    if (!value) return null;
    return obterColaboradorById(value);
  }, [value, obterColaboradorById]);

  const colaboradoresFiltrados = useMemo(() => {
    let resultado = colaboradores;
    
    // Filtrar por tipo específico
    switch (filtrarPorTipo) {
      case 'gestores':
        resultado = obterGestores();
        break;
      case 'vendedores':
        resultado = obterVendedores();
        break;
      case 'estoquistas':
        resultado = obterEstoquistas();
        break;
      case 'tecnicos':
        resultado = obterTecnicos();
        break;
      case 'motoboys':
        resultado = obterMotoboys();
        break;
      default:
        if (apenasAtivos) {
          resultado = resultado.filter(col => col.ativo);
        }
    }
    
    if (filtrarPorCargo) {
      resultado = resultado.filter(col => 
        col.cargo.toLowerCase().includes(filtrarPorCargo.toLowerCase())
      );
    }
    
    if (filtrarPorLoja) {
      resultado = resultado.filter(col => col.loja_id === filtrarPorLoja);
    }
    
    if (filtro) {
      resultado = resultado.filter(col => 
        col.nome.toLowerCase().includes(filtro.toLowerCase()) ||
        col.cargo.toLowerCase().includes(filtro.toLowerCase())
      );
    }
    
    return resultado;
  }, [colaboradores, filtro, filtrarPorCargo, filtrarPorTipo, filtrarPorLoja, apenasAtivos, obterGestores, obterVendedores, obterEstoquistas, obterTecnicos, obterMotoboys]);

  const handleSelect = (colaboradorId: string) => {
    onChange(colaboradorId);
    setFiltro('');
    setAberto(false);
  };

  const handleClear = () => {
    onChange('');
    setFiltro('');
  };

  const getCargoBadgeColor = (cargo: string) => {
    const cargoLower = cargo.toLowerCase();
    if (cargoLower.includes('gestor') || cargoLower.includes('soci')) return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
    if (cargoLower.includes('vendedor')) return 'bg-green-500/10 text-green-600 border-green-500/30';
    if (cargoLower.includes('estoquista')) return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    if (cargoLower.includes('técnico')) return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
    if (cargoLower.includes('motoboy')) return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30';
    if (cargoLower.includes('financeiro') || cargoLower.includes('administrativo')) return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    return 'bg-muted text-muted-foreground';
  };

  if (colaboradorSelecionado && !aberto) {
    return (
      <div 
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2 border rounded-md bg-background cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={() => !disabled && setAberto(true)}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{colaboradorSelecionado.nome}</span>
          <Badge variant="outline" className={cn("text-xs", getCargoBadgeColor(colaboradorSelecionado.cargo))}>
            {colaboradorSelecionado.cargo}
          </Badge>
        </div>
        {!disabled && (
          <X 
            className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer flex-shrink-0" 
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        type="text"
        placeholder={placeholder}
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 200)}
        disabled={disabled}
      />
      
      {aberto && colaboradoresFiltrados.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
          <ScrollArea className="max-h-60">
            {colaboradoresFiltrados.map(col => (
              <div
                key={col.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer gap-2"
                onMouseDown={() => handleSelect(col.id)}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{col.nome}</span>
                  <span className="text-xs text-muted-foreground">{obterNomeLoja(col.loja_id)}</span>
                </div>
                <Badge variant="outline" className={cn("text-xs flex-shrink-0", getCargoBadgeColor(col.cargo))}>
                  {col.cargo}
                </Badge>
              </div>
            ))}
          </ScrollArea>
        </div>
      )}
      
      {aberto && colaboradoresFiltrados.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md p-3 text-sm text-muted-foreground">
          Nenhum colaborador encontrado
        </div>
      )}
    </div>
  );
}
