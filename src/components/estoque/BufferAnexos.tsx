import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paperclip, Upload, X, File, Image, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export interface AnexoTemporario {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  dataUrl: string; // Base64
}

interface BufferAnexosProps {
  anexos: AnexoTemporario[];
  onAnexosChange: (anexos: AnexoTemporario[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  disabled?: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (tipo: string) => {
  if (tipo.startsWith('image/')) return <Image className="h-4 w-4" />;
  if (tipo === 'application/pdf') return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
};

export function BufferAnexos({
  anexos,
  onAnexosChange,
  maxFiles = 10,
  maxSizeMB = 5,
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
  disabled = false
}: BufferAnexosProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (anexos.length + files.length > maxFiles) {
      toast.error(`Máximo de ${maxFiles} arquivos permitidos`);
      return;
    }

    setIsLoading(true);
    const novosAnexos: AnexoTemporario[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Verificar tamanho
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`Arquivo ${file.name} excede ${maxSizeMB}MB`);
        continue;
      }

      // Converter para Base64
      try {
        const dataUrl = await readFileAsDataURL(file);
        novosAnexos.push({
          id: `anexo-${Date.now()}-${i}`,
          nome: file.name,
          tipo: file.type,
          tamanho: file.size,
          dataUrl
        });
      } catch (error) {
        toast.error(`Erro ao ler arquivo ${file.name}`);
      }
    }

    onAnexosChange([...anexos, ...novosAnexos]);
    setIsLoading(false);

    // Limpar input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAnexo = (id: string) => {
    onAnexosChange(anexos.filter(a => a.id !== id));
    toast.success('Anexo removido');
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          Anexos
          {anexos.length > 0 && (
            <Badge variant="secondary">{anexos.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Botão de Upload */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || anexos.length >= maxFiles}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleClick}
            disabled={disabled || anexos.length >= maxFiles || isLoading}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {isLoading ? 'Carregando...' : 'Selecionar Arquivos'}
          </Button>
          <span className="text-xs text-muted-foreground">
            Máx. {maxFiles} arquivos, {maxSizeMB}MB cada
          </span>
        </div>

        {/* Aviso sobre persistência */}
        {anexos.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Estes arquivos serão salvos apenas quando você confirmar o cadastro da nota.
            </p>
          </div>
        )}

        {/* Lista de Anexos */}
        {anexos.length > 0 ? (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {anexos.map(anexo => (
                <div
                  key={anexo.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border"
                >
                  {/* Preview para imagens */}
                  {anexo.tipo.startsWith('image/') ? (
                    <img
                      src={anexo.dataUrl}
                      alt={anexo.nome}
                      className="w-12 h-12 object-cover rounded border"
                    />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-muted rounded border">
                      {getFileIcon(anexo.tipo)}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={anexo.nome}>
                      {anexo.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(anexo.tamanho)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAnexo(anexo.id)}
                    disabled={disabled}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
            <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum anexo selecionado</p>
            <p className="text-xs">Clique no botão acima para adicionar</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
