import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Camera, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  open: boolean;
  onScan: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ open, onScan, onClose }: BarcodeScannerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const startScanner = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Limpar scanner anterior se existir
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch (e) {
            // Ignorar erro ao parar scanner
          }
          scannerRef.current = null;
        }

        const scanner = new Html5Qrcode('barcode-scanner-container');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 100 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Código de barras lido com sucesso
            // Limpar apenas dígitos para IMEI
            const cleanCode = decodedText.replace(/\D/g, '');
            if (cleanCode.length >= 14 && cleanCode.length <= 16) {
              onScan(cleanCode);
              handleClose();
            }
          },
          () => {
            // Ignorar erros de leitura contínua
          }
        );

        setIsLoading(false);
      } catch (err: any) {
        console.error('Erro ao iniciar câmera:', err);
        setError(
          err.message?.includes('Permission')
            ? 'Permissão de câmera negada. Por favor, habilite o acesso à câmera.'
            : 'Não foi possível acessar a câmera. Verifique as permissões.'
        );
        setIsLoading(false);
      }
    };

    // Pequeno delay para garantir que o DOM esteja pronto
    const timeout = setTimeout(startScanner, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [open]);

  const handleClose = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        // Ignorar erro ao parar
      }
      scannerRef.current = null;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escanear Código de Barras
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          {/* Container do scanner */}
          <div
            id="barcode-scanner-container"
            ref={containerRef}
            className="w-full aspect-square bg-black"
          />

          {/* Linha guia horizontal */}
          {!isLoading && !error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-[280px] h-[100px] border-2 border-primary rounded-lg">
                {/* Linha horizontal animada */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary animate-pulse" />
                
                {/* Cantos destacados */}
                <div className="absolute top-0 left-0 w-4 h-4 border-l-4 border-t-4 border-primary rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-r-4 border-t-4 border-primary rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-4 border-b-4 border-primary rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-4 border-b-4 border-primary rounded-br" />
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Iniciando câmera...</p>
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
              <div className="text-center text-white">
                <p className="text-sm text-red-400 mb-4">{error}</p>
                <Button variant="outline" size="sm" onClick={handleClose}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Instruções */}
        <div className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Posicione o código de barras do IMEI na linha guia horizontal.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            O aparelho pode ter até 3 códigos - foque no código de 15 dígitos.
          </p>
          <Button 
            variant="outline" 
            onClick={handleClose} 
            className="mt-3"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
