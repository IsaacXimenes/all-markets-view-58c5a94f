 import { useState, useRef, useCallback, useEffect } from 'react';
 import { Button } from '@/components/ui/button';
 import { Alert, AlertDescription } from '@/components/ui/alert';
 import {
   Carousel,
   CarouselContent,
   CarouselItem,
   CarouselPrevious,
   CarouselNext,
   type CarouselApi
 } from '@/components/ui/carousel';
 import { Camera, Upload, AlertTriangle, ImageIcon } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { toast } from 'sonner';
 import { ImagemTemporaria } from './ImagensTemporarias';
 
 interface CarrosselImagensProdutoProps {
   imagens: ImagemTemporaria[];
   onImagensChange: (imagens: ImagemTemporaria[]) => void;
   maxFiles?: number;
   maxSizeMB?: number;
 }
 
 export function CarrosselImagensProduto({
   imagens,
   onImagensChange,
   maxFiles = 20,
   maxSizeMB = 10
 }: CarrosselImagensProdutoProps) {
   const [isDragging, setIsDragging] = useState(false);
   const [api, setApi] = useState<CarouselApi>();
   const [currentIndex, setCurrentIndex] = useState(0);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const cameraInputRef = useRef<HTMLInputElement>(null);
 
   // Update current index when carousel changes
   useEffect(() => {
     if (!api) return;
 
     const onSelect = () => {
       setCurrentIndex(api.selectedScrollSnap());
     };
 
     api.on('select', onSelect);
     onSelect();
 
     return () => {
       api.off('select', onSelect);
     };
   }, [api]);
 
   const processFiles = useCallback((files: FileList | File[]) => {
     const fileArray = Array.from(files);
     const maxSizeBytes = maxSizeMB * 1024 * 1024;
     
     const validFiles: ImagemTemporaria[] = [];
     const errors: string[] = [];
 
     for (const file of fileArray) {
       if (!file.type.startsWith('image/')) {
         errors.push(`${file.name}: não é uma imagem válida`);
         continue;
       }
 
       if (file.size > maxSizeBytes) {
         errors.push(`${file.name}: excede ${maxSizeMB}MB`);
         continue;
       }
 
       if (imagens.length + validFiles.length >= maxFiles) {
         errors.push(`Limite de ${maxFiles} imagens atingido`);
         break;
       }
 
       validFiles.push({
         id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
         nome: file.name,
         tipo: file.type,
         tamanho: file.size,
         blobUrl: URL.createObjectURL(file),
         file
       });
     }
 
     if (errors.length > 0) {
       toast.error(errors.join('\n'));
     }
 
     if (validFiles.length > 0) {
       onImagensChange([...imagens, ...validFiles]);
       toast.success(`${validFiles.length} imagem(ns) adicionada(s)`);
     }
   }, [imagens, maxFiles, maxSizeMB, onImagensChange]);
 
   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files.length > 0) {
       processFiles(e.target.files);
       e.target.value = '';
     }
   };
 
   const handleDragOver = (e: React.DragEvent) => {
     e.preventDefault();
     setIsDragging(true);
   };
 
   const handleDragLeave = (e: React.DragEvent) => {
     e.preventDefault();
     setIsDragging(false);
   };
 
   const handleDrop = (e: React.DragEvent) => {
     e.preventDefault();
     setIsDragging(false);
     
     if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
       processFiles(e.dataTransfer.files);
     }
   };
 
   const handleDotClick = (index: number) => {
     api?.scrollTo(index);
   };
 
   return (
     <div className="space-y-4">
       {/* Carousel */}
       <Carousel className="w-full" setApi={setApi}>
         <CarouselContent>
           {imagens.length === 0 ? (
             <CarouselItem>
               <div className="aspect-square bg-muted rounded-lg flex flex-col items-center justify-center gap-2">
                 <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                 <span className="text-muted-foreground">Imagem do produto</span>
               </div>
             </CarouselItem>
           ) : (
             imagens.map((img) => (
               <CarouselItem key={img.id}>
                 <div className="aspect-square relative">
                   <img
                     src={img.blobUrl}
                     alt={img.nome}
                     className="w-full h-full object-cover rounded-lg"
                   />
                 </div>
               </CarouselItem>
             ))
           )}
         </CarouselContent>
         {imagens.length > 1 && (
           <>
             <CarouselPrevious className="left-2" />
             <CarouselNext className="right-2" />
           </>
         )}
       </Carousel>
 
       {/* Dot indicators */}
       {imagens.length > 1 && (
         <div className="flex justify-center gap-2">
           {imagens.map((_, index) => (
             <button
               key={index}
               type="button"
               className={cn(
                 "h-2 w-2 rounded-full transition-colors",
                 currentIndex === index ? "bg-primary" : "bg-muted-foreground/30"
               )}
               onClick={() => handleDotClick(index)}
               aria-label={`Ir para imagem ${index + 1}`}
             />
           ))}
         </div>
       )}
 
       {/* Warning Alert */}
       {imagens.length > 0 && (
         <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
           <AlertTriangle className="h-4 w-4 text-amber-600" />
           <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
             Imagens temporárias - serão perdidas ao atualizar ou fechar a página.
           </AlertDescription>
         </Alert>
       )}
 
       {/* Upload Area */}
       <div
         className={cn(
           "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
           isDragging 
             ? "border-primary bg-primary/5" 
             : "border-muted-foreground/25 hover:border-muted-foreground/50"
         )}
         onDragOver={handleDragOver}
         onDragLeave={handleDragLeave}
         onDrop={handleDrop}
       >
         <div className="flex flex-col items-center gap-2">
           <div className="flex gap-2 flex-wrap justify-center">
             <Button
               type="button"
               variant="outline"
               size="sm"
               onClick={() => fileInputRef.current?.click()}
             >
               <Upload className="mr-2 h-4 w-4" />
               Selecionar Imagens
             </Button>
             <Button
               type="button"
               variant="outline"
               size="sm"
               onClick={() => cameraInputRef.current?.click()}
               className="md:hidden"
             >
               <Camera className="mr-2 h-4 w-4" />
               Tirar Foto
             </Button>
           </div>
           <p className="text-xs text-muted-foreground">
             ou arraste arquivos aqui
           </p>
         </div>
 
         <input
           ref={fileInputRef}
           type="file"
           accept="image/*"
           multiple
           className="hidden"
           onChange={handleFileSelect}
         />
         <input
           ref={cameraInputRef}
           type="file"
           accept="image/*"
           capture="environment"
           className="hidden"
           onChange={handleFileSelect}
         />
       </div>
     </div>
   );
 }