import { DadosSistemaAntigoLayout } from '@/components/layout/DadosSistemaAntigoLayout';
import { DadosAntigoTable } from '@/components/dados-antigo/DadosAntigoTable';
import { Hammer } from 'lucide-react';
import { useXlsxData } from '@/hooks/useXlsxData';

const HEADER_MAP: Record<string, string> = {
  'Reparos': 'Reparo',
  'Quantidade': 'Qtd',
  'Custo': 'Custo',
  'Valor': 'Valor',
};

export default function DadosAntigoReparos() {
  const { data, headers, loading, error } = useXlsxData({
    url: '/data/reparos.xlsx',
    headerMap: HEADER_MAP,
  });

  return (
    <DadosSistemaAntigoLayout title="Dados - Sistema Antigo">
      <DadosAntigoTable
        icon={<Hammer className="h-5 w-5" />}
        title="Reparos"
        headers={headers}
        data={data as Record<string, any>[]}
        loading={loading}
        error={error}
      />
    </DadosSistemaAntigoLayout>
  );
}
