import { useState, useMemo } from 'react';
import { useCadastroStore } from '@/store/cadastroStore';
import { TipoLoja } from '@/types/mockData';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Store, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutocompleteLojaProps {
  value: string;
  onChange: (lojaId: string) => void;
  placeholder?: string;
  filtrarPorTipo?: TipoLoja;
  apenasAtivas?: boolean;
  className?: string;
  disabled?: boolean;
}

export function AutocompleteLoja({ 
  value, 
  onChange, 
  placeholder = 'Selecione uma loja',
  filtrarPorTipo,
  apenasAtivas = true,
  className,
  disabled = false
}: AutocompleteLojaProps) {
  const { lojas, obterLojaById } = useCadastroStore();
  const [filtro, setFiltro] = useState('');
  const [aberto, setAberto] = useState(false);

  const lojaSelecionada = useMemo(() => {
    if (!value) return null;
    return obterLojaById(value);
  }, [value, obterLojaById]);

  const lojasFiltradas = useMemo(() => {
    let resultado = lojas;
    
    if (apenasAtivas) {
      resultado = resultado.filter(loja => loja.ativa);
    }
    
    if (filtrarPorTipo) {
      resultado = resultado.filter(loja => loja.tipo === filtrarPorTipo);
    }
    
    if (filtro) {
      resultado = resultado.filter(loja => 
        loja.nome.toLowerCase().includes(filtro.toLowerCase())
      );
    }
    
    return resultado;
  }, [lojas, filtro, filtrarPorTipo, apenasAtivas]);

  const handleSelect = (lojaId: string) => {
    onChange(lojaId);
    setFiltro('');
    setAberto(false);
  };

  const handleClear = () => {
    onChange('');
    setFiltro('');
  };

  const getTipoBadgeColor = (tipo: TipoLoja) => {
    switch (tipo) {
      case 'Loja': return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'Estoque': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'Assistência': return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
      case 'Financeiro': return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      case 'Administrativo': return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
      default: return '';
    }
  };

  if (lojaSelecionada && !aberto) {
    return (
      <div 
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2 border rounded-md bg-background cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={() => !disabled && setAberto(true)}
      >
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{lojaSelecionada.nome}</span>
          <Badge variant="outline" className={cn("text-xs", getTipoBadgeColor(lojaSelecionada.tipo))}>
            {lojaSelecionada.tipo}
          </Badge>
        </div>
        {!disabled && (
          <X 
            className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" 
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
      
      {aberto && lojasFiltradas.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
          <ScrollArea className="max-h-60">
            {lojasFiltradas.map(loja => (
              <div
                key={loja.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer"
                onMouseDown={() => handleSelect(loja.id)}
              >
                <span className="text-sm">{loja.nome}</span>
                <Badge variant="outline" className={cn("text-xs", getTipoBadgeColor(loja.tipo))}>
                  {loja.tipo}
                </Badge>
              </div>
            ))}
          </ScrollArea>
        </div>
      )}
      
      {aberto && lojasFiltradas.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md p-3 text-sm text-muted-foreground">
          Nenhuma loja encontrada
        </div>
      )}
    </div>
  );
}
