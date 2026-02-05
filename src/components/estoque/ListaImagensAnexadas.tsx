 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Download, Trash2, FileImage, List } from 'lucide-react';
 import { toast } from 'sonner';
 import { ImagemTemporaria } from './ImagensTemporarias';
 
 interface ListaImagensAnexadasProps {
   imagens: ImagemTemporaria[];
   onRemove: (id: string) => void;
 }
 
 const formatFileSize = (bytes: number): string => {
   if (bytes < 1024) return `${bytes} B`;
   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
   return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
 };
 
 const truncateFileName = (name: string, maxLength: number = 30): string => {
   if (name.length <= maxLength) return name;
   const ext = name.split('.').pop() || '';
   const nameWithoutExt = name.slice(0, name.lastIndexOf('.'));
   const truncated = nameWithoutExt.slice(0, maxLength - ext.length - 4) + '...';
   return `${truncated}.${ext}`;
 };
 
 export function ListaImagensAnexadas({ imagens, onRemove }: ListaImagensAnexadasProps) {
   const handleDownload = (imagem: ImagemTemporaria) => {
     const link = document.createElement('a');
     link.href = imagem.blobUrl;
     link.download = imagem.nome;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     toast.success(`${imagem.nome} baixado`);
   };
 
   const handleRemove = (imagem: ImagemTemporaria) => {
     URL.revokeObjectURL(imagem.blobUrl);
     onRemove(imagem.id);
     toast.info('Imagem removida');
   };
 
   if (imagens.length === 0) {
     return null;
   }
 
   return (
     <Card>
       <CardHeader className="pb-3">
         <CardTitle className="flex items-center gap-2 text-base">
           <List className="h-4 w-4" />
           Imagens Anexadas
           <span className="ml-auto text-sm font-normal text-muted-foreground">
             ({imagens.length})
           </span>
         </CardTitle>
       </CardHeader>
       <CardContent className="pt-0">
         <div className="divide-y">
           {imagens.map((imagem) => (
             <div
               key={imagem.id}
               className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
             >
               <FileImage className="h-4 w-4 text-muted-foreground shrink-0" />
               <div className="flex-1 min-w-0">
                 <p 
                   className="text-sm font-medium truncate" 
                   title={imagem.nome}
                 >
                   {truncateFileName(imagem.nome)}
                 </p>
                 <p className="text-xs text-muted-foreground">
                   {formatFileSize(imagem.tamanho)}
                 </p>
               </div>
               <div className="flex gap-1 shrink-0">
                 <Button
                   size="icon"
                   variant="ghost"
                   className="h-8 w-8"
                   onClick={() => handleDownload(imagem)}
                   title="Download"
                 >
                   <Download className="h-4 w-4" />
                 </Button>
                 <Button
                   size="icon"
                   variant="ghost"
                   className="h-8 w-8 text-destructive hover:text-destructive"
                   onClick={() => handleRemove(imagem)}
                   title="Remover"
                 >
                   <Trash2 className="h-4 w-4" />
                 </Button>
               </div>
             </div>
           ))}
         </div>
       </CardContent>
     </Card>
   );
 }