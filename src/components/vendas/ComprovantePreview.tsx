import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Image, FileText, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComprovantePreviewProps {
  comprovante?: string;
  comprovanteNome?: string;
  size?: 'sm' | 'md';
}

export function ComprovantePreview({ comprovante, comprovanteNome, size = 'sm' }: ComprovantePreviewProps) {
  const [showDialog, setShowDialog] = useState(false);

  if (!comprovante) {
    return <span className="text-muted-foreground">-</span>;
  }

  const isBase64Image = comprovante.startsWith('data:image/');
  const isPdf = comprovante.startsWith('data:application/pdf');
  const isUrl = comprovante.startsWith('http');
  const isViewableImage = isBase64Image || isUrl;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPdf) {
      window.open(comprovante, '_blank');
    } else {
      setShowDialog(true);
    }
  };

  const thumbSize = size === 'sm' ? 'h-10 w-10' : 'h-16 w-16';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors cursor-pointer group"
        title={comprovanteNome || 'Ver comprovante'}
      >
        {isViewableImage ? (
          <img
            src={comprovante}
            alt="Comprovante"
            className={cn(
              "rounded object-cover border shadow-sm group-hover:shadow-md group-hover:ring-2 group-hover:ring-primary/40 transition-all",
              thumbSize
            )}
          />
        ) : isPdf ? (
          <FileText className={`${iconSize} text-red-500`} />
        ) : (
          <Paperclip className={iconSize} />
        )}
        <span className={cn("truncate", size === 'sm' ? 'text-xs max-w-[80px]' : 'text-sm max-w-[150px]')}>
          {comprovanteNome || 'Anexo'}
        </span>
      </button>

      {isViewableImage && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{comprovanteNome || 'Comprovante'}</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img src={comprovante} alt="Comprovante" className="max-h-[70vh] object-contain rounded-lg" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function ComprovanteBadgeSemAnexo() {
  return (
    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700 text-xs">
      Sem anexo
    </Badge>
  );
}
