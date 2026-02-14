import { DadosSistemaAntigoLayout } from '@/components/layout/DadosSistemaAntigoLayout';
import { DadosAntigoTable } from '@/components/dados-antigo/DadosAntigoTable';
import { Package } from 'lucide-react';
import { useXlsxData } from '@/hooks/useXlsxData';

export default function DadosAntigoVendasProdutos() {
  const { data, headers, loading, error } = useXlsxData({
    url: '/data/vendas-produtos.xlsx',
  });

  return (
    <DadosSistemaAntigoLayout title="Dados - Sistema Antigo">
      <DadosAntigoTable
        icon={<Package className="h-5 w-5" />}
        title="Vendas Produtos"
        headers={headers}
        data={data as Record<string, any>[]}
        loading={loading}
        error={error}
      />
    </DadosSistemaAntigoLayout>
  );
}
