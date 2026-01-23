import React, { useState, useEffect } from 'react';
import { useMobilePreviewMode, MobilePreviewContext } from '@/hooks/useMobilePreviewMode';
import { X, Clock, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VendasNova from '@/pages/VendasNova';

export function MobilePreviewContainer() {
  const { isMobilePreview, setMobilePreview } = useMobilePreviewMode();

  if (!isMobilePreview) return null;

  return (
    <MobilePreviewContext.Provider value={true}>
      <div className="fixed inset-0 z-[100] bg-foreground/70 flex items-center justify-center p-4">
        {/* Moldura do celular */}
        <div className="relative bg-muted-foreground rounded-[3rem] p-3 shadow-2xl">
          {/* Notch */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-6 bg-foreground rounded-full z-10" />
          
          {/* Botão de fechar */}
          <Button
            variant="destructive"
            size="icon"
            onClick={() => setMobilePreview(false)}
            className="absolute -top-4 -right-4 rounded-full z-20"
          >
            <X className="h-4 w-4" />
          </Button>
          
          {/* Tela do celular - iPhone 14 Pro dimensions */}
          <div className="w-[390px] h-[844px] bg-background rounded-[2.5rem] overflow-hidden flex flex-col">
            {/* Conteúdo scrollável */}
            <div className="flex-1 overflow-y-auto pt-8">
              <VendasNova />
            </div>
          </div>
          
          {/* Home indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-muted-foreground/60 rounded-full" />
        </div>
      </div>
    </MobilePreviewContext.Provider>
  );
}
