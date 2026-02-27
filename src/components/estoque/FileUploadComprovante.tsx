import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, X, FileText, Image, Link2, Camera } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadComprovanteProps {
  label: string;
  required?: boolean;
  value: string; // URL ou base64
  fileName?: string;
  onFileChange: (data: { 
    comprovante: string; 
    comprovanteNome: string; 
    comprovantePreview: string;
    isFile: boolean;
  }) => void;
  acceptedTypes?: string[];
  maxSizeMB?: number;
}

export function FileUploadComprovante({
  label,
  required = false,
  value,
  fileName = '',
  onFileChange,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  maxSizeMB = 5
}: FileUploadComprovanteProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileValidation = (file: File): boolean => {
    if (!acceptedTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG, WebP ou PDF.');
      return false;
    }
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo ${maxSizeMB}MB.`);
      return false;
    }
    
    return true;
  };

  const handleFileUpload = (file: File) => {
    if (!handleFileValidation(file)) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const isImage = file.type.startsWith('image/');
      
      onFileChange({
        comprovante: base64,
        comprovanteNome: file.name,
        comprovantePreview: isImage ? base64 : '',
        isFile: true
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleUrlConfirm = () => {
    if (!urlInput.trim()) {
      toast.error('Digite uma URL válida');
      return;
    }
    
    onFileChange({
      comprovante: urlInput,
      comprovanteNome: 'URL Externa',
      comprovantePreview: '',
      isFile: false
    });
    
    setShowUrlInput(false);
    setUrlInput('');
  };

  const handleRemove = () => {
    onFileChange({
      comprovante: '',
      comprovanteNome: '',
      comprovantePreview: '',
      isFile: false
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleCameraCapture = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // Se tem um arquivo selecionado, mostrar preview
  if (value) {
    const isImage = value.startsWith('data:image/');
    const isUrl = value.startsWith('http');
    const isViewable = isImage || isUrl;
    
    return (
      <div className="space-y-2">
        <Label>{label} {required && '*'}</Label>
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
          <div 
            className={`flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center ${isViewable ? 'cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all' : ''}`}
            onClick={() => isViewable && setShowPreviewDialog(true)}
          >
            {isImage ? (
              <img src={value} alt="Preview" className="w-full h-full object-cover rounded-lg" />
            ) : isUrl ? (
              <Link2 className="h-6 w-6 text-primary" />
            ) : (
              <FileText className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-sm font-medium truncate">{fileName || 'Arquivo'}</p>
            <p className="text-xs text-muted-foreground">
              {isUrl ? 'Link externo' : 'Arquivo carregado'}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isViewable && (
          <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{fileName || 'Comprovante'}</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center">
                <img src={value} alt="Comprovante" className="max-h-[70vh] object-contain rounded-lg" />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // Área de upload
  return (
    <div className="space-y-2">
      <Label>{label} {required && '*'}</Label>
      
      <div className="flex gap-2">
        {/* Área de drag and drop */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            flex-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
            ${isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />
          <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">
            Arraste ou <span className="text-primary font-medium">clique</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            PDF, JPG ou PNG (máx {maxSizeMB}MB)
          </p>
        </div>

        {/* Botão Câmera */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-1 w-20 border-2 border-dashed rounded-lg border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
          />
          <Camera className="h-6 w-6 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Câmera</span>
        </button>
      </div>

      {/* Separador ou */}
      <div className="flex items-center gap-2 py-1">
        <div className="flex-1 border-t border-muted-foreground/20" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="flex-1 border-t border-muted-foreground/20" />
      </div>

      {/* Input de URL */}
      {showUrlInput ? (
        <div className="flex gap-2">
          <Input
            placeholder="https://..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1"
          />
          <Button type="button" size="sm" onClick={handleUrlConfirm}>
            OK
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowUrlInput(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowUrlInput(true)}
        >
          <Link2 className="h-4 w-4 mr-2" />
          Colar URL do comprovante
        </Button>
      )}
    </div>
  );
}
