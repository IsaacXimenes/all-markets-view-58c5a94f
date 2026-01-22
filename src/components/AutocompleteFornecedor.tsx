import { useState, useMemo } from 'react';
import { getFornecedores, Fornecedor } from '@/utils/cadastrosApi';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Building2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutocompleteFornecedorProps {
  value: string;
  onChange: (fornecedorId: string) => void;
  placeholder?: string;
  apenasAtivos?: boolean;
  className?: string;
  disabled?: boolean;
}

export function AutocompleteFornecedor({ 
  value, 
  onChange, 
  placeholder = 'Selecione um fornecedor',
  apenasAtivos = true,
  className,
  disabled = false
}: AutocompleteFornecedorProps) {
  const fornecedores = getFornecedores();
  const [filtro, setFiltro] = useState('');
  const [aberto, setAberto] = useState(false);

  const fornecedorSelecionado = useMemo(() => {
    if (!value) return null;
    return fornecedores.find(f => f.id === value || f.nome === value);
  }, [value, fornecedores]);

  const fornecedoresFiltrados = useMemo(() => {
    let resultado = fornecedores;
    
    if (apenasAtivos) {
      resultado = resultado.filter(f => f.status === 'Ativo');
    }
    
    if (filtro) {
      const busca = filtro.toLowerCase();
      resultado = resultado.filter(f => 
        f.nome.toLowerCase().includes(busca) ||
        f.cnpj.includes(filtro)
      );
    }
    
    return resultado;
  }, [fornecedores, filtro, apenasAtivos]);

  const handleSelect = (fornecedorId: string) => {
    onChange(fornecedorId);
    setFiltro('');
    setAberto(false);
  };

  const handleClear = () => {
    onChange('');
    setFiltro('');
  };

  if (fornecedorSelecionado && !aberto) {
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
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-sm">{fornecedorSelecionado.nome}</span>
            <span className="text-xs text-muted-foreground">{fornecedorSelecionado.cnpj}</span>
          </div>
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
      
      {aberto && fornecedoresFiltrados.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
          <ScrollArea className="max-h-60">
            {fornecedoresFiltrados.map(fornecedor => (
              <div
                key={fornecedor.id}
                className="flex flex-col px-3 py-2 hover:bg-accent cursor-pointer"
                onMouseDown={() => handleSelect(fornecedor.id)}
              >
                <span className="text-sm font-medium">{fornecedor.nome}</span>
                <span className="text-xs text-muted-foreground">{fornecedor.cnpj}</span>
              </div>
            ))}
          </ScrollArea>
        </div>
      )}
      
      {aberto && fornecedoresFiltrados.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md p-3 text-sm text-muted-foreground">
          Nenhum fornecedor encontrado
        </div>
      )}
    </div>
  );
}
