import { useState, useMemo } from 'react';
import { useCadastroStore } from '@/store/cadastroStore';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { User, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type FiltroTipo = 'todos' | 'gestores' | 'vendedores' | 'vendedoresEGestores' | 'estoquistas' | 'tecnicos' | 'motoboys';

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
    obterMotoboys,
    obterRodizioAtivoDoColaborador,
    colaboradorEmRodizio
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
      case 'vendedoresEGestores':
        // Inclui vendedores E gestores
        resultado = colaboradores.filter(col => (col.eh_vendedor || col.eh_gestor) && col.ativo);
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
      resultado = resultado.filter(col => {
        // Verificar loja base
        if (col.loja_id === filtrarPorLoja) return true;
        
        // Verificar se está em rodízio ativo para esta loja
        const rodizio = obterRodizioAtivoDoColaborador(col.id);
        if (rodizio && rodizio.loja_destino_id === filtrarPorLoja) return true;
        
        return false;
      });
    }
    
    if (filtro) {
      resultado = resultado.filter(col => 
        col.nome.toLowerCase().includes(filtro.toLowerCase()) ||
        col.cargo.toLowerCase().includes(filtro.toLowerCase())
      );
    }
    
    // Ordenar: Vendedores primeiro, depois Gestores, depois outros, alfabético dentro de cada grupo
    resultado.sort((a, b) => {
      // Vendedores primeiro
      if (a.eh_vendedor && !b.eh_vendedor) return -1;
      if (!a.eh_vendedor && b.eh_vendedor) return 1;
      // Depois gestores
      if (a.eh_gestor && !b.eh_gestor) return -1;
      if (!a.eh_gestor && b.eh_gestor) return 1;
      // Ordem alfabética
      return a.nome.localeCompare(b.nome);
    });
    
    return resultado;
  }, [colaboradores, filtro, filtrarPorCargo, filtrarPorTipo, filtrarPorLoja, apenasAtivos, obterGestores, obterVendedores, obterEstoquistas, obterTecnicos, obterMotoboys, obterRodizioAtivoDoColaborador]);

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

  const selecionadoEmRodizio = colaboradorSelecionado ? colaboradorEmRodizio(colaboradorSelecionado.id) : false;

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
          {selecionadoEmRodizio && (
            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
              <RefreshCw className="h-3 w-3 mr-1" />
              Rodízio
            </Badge>
          )}
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
    <div className="relative">
      <Input
        type="text"
        placeholder={placeholder}
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 200)}
        disabled={disabled}
        className={className}
      />
      
      {aberto && colaboradoresFiltrados.length > 0 && (
        <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {colaboradoresFiltrados.map(col => {
              const emRodizio = colaboradorEmRodizio(col.id);
              const rodizio = obterRodizioAtivoDoColaborador(col.id);
              
              return (
                <div
                  key={col.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer gap-2"
                  onMouseDown={() => handleSelect(col.id)}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{col.nome}</span>
                      {emRodizio && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                          <RefreshCw className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {obterNomeLoja(col.loja_id)}
                      {emRodizio && rodizio && ` → ${obterNomeLoja(rodizio.loja_destino_id)}`}
                    </span>
                  </div>
                  <Badge variant="outline" className={cn("text-xs flex-shrink-0", getCargoBadgeColor(col.cargo))}>
                    {col.cargo}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {aberto && colaboradoresFiltrados.length === 0 && (
        <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
          Nenhum colaborador encontrado
        </div>
      )}
    </div>
  );
}
