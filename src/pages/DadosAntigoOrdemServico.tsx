import { DadosSistemaAntigoLayout } from '@/components/layout/DadosSistemaAntigoLayout';
import { DadosAntigoTable } from '@/components/dados-antigo/DadosAntigoTable';
import { Wrench } from 'lucide-react';
import { useXlsxData } from '@/hooks/useXlsxData';

const HEADER_MAP: Record<string, string> = {
  'DATA': 'Data',
  'TELEFONE': 'Telefone',
  'APARELHO': 'Aparelho',
  'IMEI': 'IMEI',
  'DEFEITO': 'Defeito',
  'TÉCNICO': 'Técnico',
  'TIMESTAMP': 'Registro',
};

export default function DadosAntigoOrdemServico() {
  const { data, headers, loading, error } = useXlsxData({
    url: '/data/ordem-servico.xlsx',
    headerMap: HEADER_MAP,
    dateColumns: ['Data'],
  });

  return (
    <DadosSistemaAntigoLayout title="Dados - Sistema Antigo">
      <DadosAntigoTable
        icon={<Wrench className="h-5 w-5" />}
        title="Ordem de Serviço"
        headers={headers}
        data={data as Record<string, any>[]}
        loading={loading}
        error={error}
      />
    </DadosSistemaAntigoLayout>
  );
}
