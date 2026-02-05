 /**
  * API para gerenciamento de imagens de produtos
  * 
  * CENÁRIO ATUAL: Imagens temporárias em memória (Blob URLs)
  * FUTURO: Integrar com Lovable Cloud Storage para persistência
  * 
  * Quando for integrar com o banco:
  * 1. Criar bucket no Lovable Cloud Storage (ex: "product-images")
  * 2. Fazer upload do File para o storage
  * 3. Salvar a URL retornada na tabela de imagens do produto
  * 4. Substituir blobUrl por storageUrl nas funções abaixo
  */
 
 export interface ImagemProduto {
   id: string;
   produtoId: string;
   nome: string;
   tipo: string;
   tamanho: number;
   // Temporário: URL blob em memória (será perdido ao atualizar página)
   blobUrl?: string;
   // Futuro: URL do storage (persistente)
   storageUrl?: string;
   // Futuro: path no bucket do storage
   storagePath?: string;
   // Metadados
   criadoEm: Date;
   criadoPor?: string;
 }
 
 export interface UploadImagemParams {
   produtoId: string;
   file: File;
   criadoPor?: string;
 }
 
 export interface UploadImagemResult {
   success: boolean;
   imagem?: ImagemProduto;
   error?: string;
 }
 
 /**
  * Gera um ID único para a imagem
  */
 const gerarImagemId = (): string => {
   return `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
 };
 
 /**
  * Upload de imagem do produto
  * 
  * ATUAL: Cria Blob URL temporário
  * FUTURO: Fazer upload para Lovable Cloud Storage e salvar referência no banco
  * 
  * @example Futuro (com Supabase Storage):
  * ```
  * const { data, error } = await supabase.storage
  *   .from('product-images')
  *   .upload(`${produtoId}/${fileName}`, file);
  * 
  * const publicUrl = supabase.storage
  *   .from('product-images')
  *   .getPublicUrl(data.path).data.publicUrl;
  * 
  * // Salvar referência na tabela
  * await supabase.from('produto_imagens').insert({
  *   produto_id: produtoId,
  *   storage_path: data.path,
  *   storage_url: publicUrl,
  *   nome: file.name,
  *   tipo: file.type,
  *   tamanho: file.size
  * });
  * ```
  */
 export async function uploadImagemProduto(
   params: UploadImagemParams
 ): Promise<UploadImagemResult> {
   const { produtoId, file, criadoPor } = params;
 
   try {
     // Validações
     if (!file.type.startsWith('image/')) {
       return { success: false, error: 'Arquivo não é uma imagem válida' };
     }
 
     const maxSizeBytes = 10 * 1024 * 1024; // 10MB
     if (file.size > maxSizeBytes) {
       return { success: false, error: 'Arquivo excede 10MB' };
     }
 
     // TEMPORÁRIO: Criar Blob URL
     const blobUrl = URL.createObjectURL(file);
 
     // FUTURO: Substituir por upload ao storage
     // const storageUrl = await uploadToStorage(produtoId, file);
 
     const imagem: ImagemProduto = {
       id: gerarImagemId(),
       produtoId,
       nome: file.name,
       tipo: file.type,
       tamanho: file.size,
       blobUrl, // Temporário
       // storageUrl, // Futuro
       criadoEm: new Date(),
       criadoPor
     };
 
     return { success: true, imagem };
   } catch (error) {
     console.error('Erro ao fazer upload da imagem:', error);
     return { 
       success: false, 
       error: error instanceof Error ? error.message : 'Erro desconhecido' 
     };
   }
 }
 
 /**
  * Remove uma imagem do produto
  * 
  * ATUAL: Revoga Blob URL
  * FUTURO: Remover do storage e da tabela do banco
  * 
  * @example Futuro (com Supabase):
  * ```
  * // Remover do storage
  * await supabase.storage
  *   .from('product-images')
  *   .remove([imagem.storagePath]);
  * 
  * // Remover da tabela
  * await supabase
  *   .from('produto_imagens')
  *   .delete()
  *   .eq('id', imagemId);
  * ```
  */
 export async function removerImagemProduto(
   imagem: ImagemProduto
 ): Promise<{ success: boolean; error?: string }> {
   try {
     // TEMPORÁRIO: Revogar Blob URL para liberar memória
     if (imagem.blobUrl) {
       URL.revokeObjectURL(imagem.blobUrl);
     }
 
     // FUTURO: Remover do storage e banco
     // await deleteFromStorage(imagem.storagePath);
     // await deleteFromDatabase(imagem.id);
 
     return { success: true };
   } catch (error) {
     console.error('Erro ao remover imagem:', error);
     return { 
       success: false, 
       error: error instanceof Error ? error.message : 'Erro desconhecido' 
     };
   }
 }
 
 /**
  * Busca todas as imagens de um produto
  * 
  * ATUAL: Não implementado (imagens ficam em estado local)
  * FUTURO: Buscar do banco de dados
  * 
  * @example Futuro (com Supabase):
  * ```
  * const { data, error } = await supabase
  *   .from('produto_imagens')
  *   .select('*')
  *   .eq('produto_id', produtoId)
  *   .order('criado_em', { ascending: false });
  * 
  * return data;
  * ```
  */
 export async function buscarImagensProduto(
   produtoId: string
 ): Promise<ImagemProduto[]> {
   // FUTURO: Buscar do banco
   // const { data } = await supabase
   //   .from('produto_imagens')
   //   .select('*')
   //   .eq('produto_id', produtoId);
   // return data || [];
 
   // ATUAL: Retorna vazio (imagens são gerenciadas localmente)
   console.log(`[imagensProdutoApi] buscarImagensProduto chamado para ${produtoId} - sem persistência ainda`);
   return [];
 }
 
 /**
  * Obtém a URL de visualização da imagem
  * Prioriza storageUrl (persistente) sobre blobUrl (temporário)
  */
 export function obterUrlImagem(imagem: ImagemProduto): string | null {
   return imagem.storageUrl || imagem.blobUrl || null;
 }
 
 /**
  * Verifica se a imagem está persistida no storage
  */
 export function imagemPersistida(imagem: ImagemProduto): boolean {
   return !!imagem.storageUrl;
 }
 
 /**
  * Converte ImagemTemporaria (componente atual) para ImagemProduto (API)
  * Útil durante a transição
  */
 export function converterParaImagemProduto(
   imagemTemp: { id: string; nome: string; tipo: string; tamanho: number; blobUrl: string },
   produtoId: string
 ): ImagemProduto {
   return {
     id: imagemTemp.id,
     produtoId,
     nome: imagemTemp.nome,
     tipo: imagemTemp.tipo,
     tamanho: imagemTemp.tamanho,
     blobUrl: imagemTemp.blobUrl,
     criadoEm: new Date()
   };
 }
 
 /**
  * ============================================================
  * SCHEMA SUGERIDO PARA TABELA NO BANCO (Lovable Cloud/Supabase)
  * ============================================================
  * 
  * CREATE TABLE produto_imagens (
  *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  *   produto_id TEXT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  *   nome TEXT NOT NULL,
  *   tipo TEXT NOT NULL,
  *   tamanho INTEGER NOT NULL,
  *   storage_path TEXT NOT NULL,
  *   storage_url TEXT NOT NULL,
  *   criado_em TIMESTAMPTZ DEFAULT NOW(),
  *   criado_por UUID REFERENCES auth.users(id),
  *   
  *   -- Índices
  *   CONSTRAINT fk_produto FOREIGN KEY (produto_id) REFERENCES produtos(id)
  * );
  * 
  * -- Índice para busca por produto
  * CREATE INDEX idx_produto_imagens_produto_id ON produto_imagens(produto_id);
  * 
  * -- RLS Policies
  * ALTER TABLE produto_imagens ENABLE ROW LEVEL SECURITY;
  * 
  * CREATE POLICY "Usuários autenticados podem ver imagens"
  *   ON produto_imagens FOR SELECT
  *   TO authenticated
  *   USING (true);
  * 
  * CREATE POLICY "Usuários autenticados podem inserir imagens"
  *   ON produto_imagens FOR INSERT
  *   TO authenticated
  *   WITH CHECK (true);
  * 
  * CREATE POLICY "Usuários autenticados podem deletar imagens"
  *   ON produto_imagens FOR DELETE
  *   TO authenticated
  *   USING (true);
  * 
  * ============================================================
  * BUCKET DE STORAGE SUGERIDO
  * ============================================================
  * 
  * Nome: product-images
  * Público: true (ou false se precisar de autenticação)
  * Políticas:
  *   - authenticated users can upload
  *   - authenticated users can delete own files
  *   - public can read (se bucket público)
  * 
  * Estrutura de pastas sugerida:
  *   product-images/
  *     └── {produto_id}/
  *         ├── img-123456.jpg
  *         ├── img-789012.png
  *         └── ...
  */