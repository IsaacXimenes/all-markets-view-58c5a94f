 import { useState, useRef, useCallback, useEffect } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Alert, AlertDescription } from '@/components/ui/alert';
 import { Camera, Upload, Download, Trash2, AlertTriangle, ImageIcon, X } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { toast } from 'sonner';
 
 export interface ImagemTemporaria {
   id: string;
   nome: string;
   tipo: string;
   tamanho: number;
   blobUrl: string;
   file: File;
 }
 
 interface ImagensTemporariasProps {
   imagens: ImagemTemporaria[];
   onImagensChange: (imagens: ImagemTemporaria[]) => void;
   maxFiles?: number;
   maxSizeMB?: number;
 }
 
 const formatFileSize = (bytes: number): string => {
   if (bytes < 1024) return `${bytes} B`;
   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
   return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
 };
 
 const truncateFileName = (name: string, maxLength: number = 20): string => {
   if (name.length <= maxLength) return name;
   const ext = name.split('.').pop() || '';
   const nameWithoutExt = name.slice(0, name.lastIndexOf('.'));
   const truncated = nameWithoutExt.slice(0, maxLength - ext.length - 4) + '...';
   return `${truncated}.${ext}`;
 };
 
 export function ImagensTemporarias({
   imagens,
   onImagensChange,
   maxFiles = 20,
   maxSizeMB = 10
 }: ImagensTemporariasProps) {
   const [isDragging, setIsDragging] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const cameraInputRef = useRef<HTMLInputElement>(null);
 
   // Cleanup blob URLs when images are removed
   useEffect(() => {
     return () => {
       // Cleanup is handled by parent component
     };
   }, []);
 
   const processFiles = useCallback((files: FileList | File[]) => {
     const fileArray = Array.from(files);
     const maxSizeBytes = maxSizeMB * 1024 * 1024;
     
     const validFiles: ImagemTemporaria[] = [];
     const errors: string[] = [];
 
     for (const file of fileArray) {
       // Check if it's an image
       if (!file.type.startsWith('image/')) {
         errors.push(`${file.name}: não é uma imagem válida`);
         continue;
       }
 
       // Check file size
       if (file.size > maxSizeBytes) {
         errors.push(`${file.name}: excede ${maxSizeMB}MB`);
         continue;
       }
 
       // Check max files limit
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
       e.target.value = ''; // Reset input
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
 
   const handleDownload = (imagem: ImagemTemporaria) => {
     const link = document.createElement('a');
     link.href = imagem.blobUrl;
     link.download = imagem.nome;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
   };
 
   const handleRemove = (imagemId: string) => {
     const imagem = imagens.find(img => img.id === imagemId);
     if (imagem) {
       URL.revokeObjectURL(imagem.blobUrl);
     }
     onImagensChange(imagens.filter(img => img.id !== imagemId));
     toast.info('Imagem removida');
   };
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <Camera className="h-5 w-5" />
           Imagens Anexadas Temporariamente
           {imagens.length > 0 && (
             <span className="ml-2 text-sm font-normal text-muted-foreground">
               ({imagens.length})
             </span>
           )}
         </CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
         {/* Warning Alert */}
         <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
           <AlertTriangle className="h-4 w-4 text-amber-600" />
           <AlertDescription className="text-amber-700 dark:text-amber-400">
             Estas imagens serão perdidas ao atualizar ou fechar a página. 
             Use o botão de download para salvar localmente.
           </AlertDescription>
         </Alert>
 
         {/* Upload Area */}
         <div
           className={cn(
             "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
             isDragging 
               ? "border-primary bg-primary/5" 
               : "border-muted-foreground/25 hover:border-muted-foreground/50"
           )}
           onDragOver={handleDragOver}
           onDragLeave={handleDragLeave}
           onDrop={handleDrop}
         >
           <div className="flex flex-col items-center gap-3">
             <div className="flex gap-2">
               <Button
                 type="button"
                 variant="outline"
                 onClick={() => fileInputRef.current?.click()}
               >
                 <Upload className="mr-2 h-4 w-4" />
                 Selecionar Imagens
               </Button>
               <Button
                 type="button"
                 variant="outline"
                 onClick={() => cameraInputRef.current?.click()}
                 className="md:hidden"
               >
                 <Camera className="mr-2 h-4 w-4" />
                 Tirar Foto
               </Button>
             </div>
             <p className="text-sm text-muted-foreground">
               ou arraste arquivos aqui
             </p>
             <p className="text-xs text-muted-foreground">
               Máximo {maxFiles} imagens, {maxSizeMB}MB cada
             </p>
           </div>
 
           {/* Hidden file inputs */}
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
 
         {/* Images Grid */}
         {imagens.length > 0 && (
           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
             {imagens.map((imagem) => (
               <div
                 key={imagem.id}
                 className="relative group rounded-lg border bg-muted/30 overflow-hidden"
               >
                 {/* Thumbnail */}
                 <div className="aspect-square relative">
                   <img
                     src={imagem.blobUrl}
                     alt={imagem.nome}
                     className="w-full h-full object-cover"
                   />
                   
                   {/* Overlay with actions */}
                   <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                     <Button
                       size="icon"
                       variant="secondary"
                       className="h-8 w-8"
                       onClick={() => handleDownload(imagem)}
                       title="Download"
                     >
                       <Download className="h-4 w-4" />
                     </Button>
                     <Button
                       size="icon"
                       variant="destructive"
                       className="h-8 w-8"
                       onClick={() => handleRemove(imagem.id)}
                       title="Remover"
                     >
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </div>
 
                   {/* Quick remove button (always visible on mobile) */}
                   <Button
                     size="icon"
                     variant="destructive"
                     className="absolute top-1 right-1 h-6 w-6 opacity-70 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                     onClick={() => handleRemove(imagem.id)}
                   >
                     <X className="h-3 w-3" />
                   </Button>
                 </div>
 
                 {/* File info */}
                 <div className="p-2">
                   <p 
                     className="text-xs font-medium truncate" 
                     title={imagem.nome}
                   >
                     {truncateFileName(imagem.nome)}
                   </p>
                   <p className="text-xs text-muted-foreground">
                     {formatFileSize(imagem.tamanho)}
                   </p>
                 </div>
               </div>
             ))}
           </div>
         )}
 
         {/* Empty state */}
         {imagens.length === 0 && (
           <div className="text-center py-8 text-muted-foreground">
             <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
             <p>Nenhuma imagem anexada</p>
           </div>
         )}
       </CardContent>
     </Card>
   );
 }