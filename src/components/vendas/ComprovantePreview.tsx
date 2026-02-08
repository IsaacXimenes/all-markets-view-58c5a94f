import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Image, FileText, ExternalLink } from 'lucide-react';

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

  const isImage = comprovante.startsWith('data:image/');
  const isPdf = comprovante.startsWith('data:application/pdf');
  const isUrl = comprovante.startsWith('http');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPdf || isUrl) {
      window.open(comprovante, '_blank');
    } else {
      setShowDialog(true);
    }
  };

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors cursor-pointer"
        title={comprovanteNome || 'Ver comprovante'}
      >
        {isImage ? (
          <img src={comprovante} alt="Comprovante" className="h-6 w-6 rounded object-cover border" />
        ) : isPdf ? (
          <FileText className={`${iconSize} text-red-500`} />
        ) : isUrl ? (
          <ExternalLink className={iconSize} />
        ) : (
          <Paperclip className={iconSize} />
        )}
        <span className="text-xs truncate max-w-[80px]">{comprovanteNome || 'Anexo'}</span>
      </button>

      {isImage && (
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
