import jsPDF from 'jspdf';
import { Venda } from './vendasApi';
import { getClienteById } from './cadastrosApi';
import { formatCurrency } from './formatUtils';
import logoBase64Promise from './notaGarantiaLogo';

// Converte imagem importada para base64
const getLogoBase64 = async (): Promise<string> => {
  return logoBase64Promise;
};

/**
 * Gera a Nota de Garantia em PDF baseado no modelo Thiago Imports
 */
export const gerarNotaGarantiaPdf = async (venda: Venda) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Buscar dados do cliente
  const cliente = getClienteById(venda.clienteId);

  // Cores
  const preto = '#000000';
  const cinzaClaro = '#f0f0f0';
  const cinzaTexto = '#333333';

  // Helper: desenhar retângulo com borda
  const drawBox = (x: number, yPos: number, w: number, h: number) => {
    doc.setDrawColor(preto);
    doc.setLineWidth(0.3);
    doc.rect(x, yPos, w, h);
  };

  // Helper: campo label + valor
  const drawField = (label: string, value: string, x: number, yPos: number, w: number, h: number = 10) => {
    drawBox(x, yPos, w, h);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(cinzaTexto);
    doc.text(label, x + 1.5, yPos + 3.5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(preto);
    doc.text(value || '', x + 1.5, yPos + 7.5);
  };

  // Helper: cabeçalho de seção
  const drawSectionHeader = (title: string, yPos: number) => {
    doc.setFillColor(cinzaClaro);
    doc.rect(margin, yPos, contentWidth, 6, 'F');
    drawBox(margin, yPos, contentWidth, 6);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(preto);
    doc.text(title, margin + 2, yPos + 4);
    return yPos + 6;
  };

  // Formatar data
  const formatarData = (dataStr: string) => {
    const d = new Date(dataStr);
    return d.toLocaleDateString('pt-BR');
  };

  const formatarDataHora = (date: Date) => {
    return date.toLocaleString('pt-BR');
  };

  // ==========================================
  // CABEÇALHO
  // ==========================================
  const headerHeight = 28;
  drawBox(margin, y, contentWidth, headerHeight);

  // Logo
  try {
    const logoData = await getLogoBase64();
    if (logoData) {
      doc.addImage(logoData, 'PNG', margin + 2, y + 2, 24, 24);
    }
  } catch {
    // Logo não disponível
  }

  // Texto do cabeçalho
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('THIAGO IMPORTS', margin + 30, y + 8);
  doc.setFontSize(9);
  doc.text('FEIRA DOS IMPORTADOS', margin + 30, y + 13);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA DE GARANTIA', margin + 30, y + 19);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('BLOCO D, LOJA 433/434 – BRASÍLIA', margin + 30, y + 24);

  // Campos do lado direito: Nº, DATA, IDENTIFICAÇÃO
  const rightColX = margin + 140;
  const rightColW = contentWidth - 140;
  drawField('Nº', String(venda.numero || venda.id), rightColX, y, rightColW, 9);
  drawField('DATA', formatarData(venda.dataHora), rightColX, y + 9, rightColW, 9);
  drawField('IDENTIFICAÇÃO', venda.id, rightColX, y + 18, rightColW, 10);

  y += headerHeight;

  // ==========================================
  // EMITENTE
  // ==========================================
  y = drawSectionHeader('EMITENTE', y);

  const emitenteH = 10;
  const col1 = margin;
  const col1W = contentWidth * 0.5;
  const col2 = margin + col1W;
  const col2W = contentWidth * 0.25;
  const col3 = col2 + col2W;
  const col3W = contentWidth * 0.25;

  drawField('NOME / RAZÃO SOCIAL', 'THIAGO IMPORTS', col1, y, col1W, emitenteH);
  drawField('CNPJ / CPF', '46.197.533/0001-06', col2, y, col2W, emitenteH);
  drawField('EMAIL', 'acessoriathiagoimports@gmail.com', col3, y, col3W, emitenteH);
  y += emitenteH;

  drawField('CIDADE', 'BRASÍLIA', col1, y, col1W, emitenteH);
  drawField('CEP', '71208-900', col2, y, col2W, emitenteH);
  drawField('DATA DA EMISSÃO', formatarData(venda.dataHora), col3, y, col3W, emitenteH);
  y += emitenteH;

  // ==========================================
  // DESTINATÁRIO
  // ==========================================
  y = drawSectionHeader('DESTINATÁRIO', y);

  const destH = 10;
  const destCol1W = contentWidth * 0.45;
  const destCol2W = contentWidth * 0.25;
  const destCol3W = contentWidth * 0.30;

  // Linha 1
  drawField('NOME / RAZÃO SOCIAL', venda.clienteNome || '', col1, y, destCol1W, destH);
  drawField('CNPJ / CPF', venda.clienteCpf || '', col1 + destCol1W, y, destCol2W, destH);
  drawField('DATA DA SAÍDA', formatarData(venda.dataHora), col1 + destCol1W + destCol2W, y, destCol3W, destH);
  y += destH;

  // Linha 2
  const enderecoCompleto = cliente 
    ? `${cliente.endereco}${cliente.numero ? ', ' + cliente.numero : ''}` 
    : '';
  const bairro = cliente?.bairro || '';
  const cep = cliente?.cep || '';

  drawField('ENDEREÇO', enderecoCompleto, col1, y, destCol1W, destH);
  drawField('BAIRRO / DISTRITO', bairro, col1 + destCol1W, y, destCol2W, destH);
  drawField('CEP', cep, col1 + destCol1W + destCol2W, y, destCol3W, destH);
  y += destH;

  // Linha 3
  const municipio = cliente?.cidade || venda.clienteCidade || '';
  const uf = cliente?.estado || '';
  const telefone = venda.clienteTelefone || '';
  const email = venda.clienteEmail || '';

  const destL3Col1W = contentWidth * 0.30;
  const destL3Col2W = contentWidth * 0.10;
  const destL3Col3W = contentWidth * 0.25;
  const destL3Col4W = contentWidth * 0.35;

  drawField('MUNICÍPIO', municipio, col1, y, destL3Col1W, destH);
  drawField('UF', uf, col1 + destL3Col1W, y, destL3Col2W, destH);
  drawField('TELEFONE / FAX', telefone, col1 + destL3Col1W + destL3Col2W, y, destL3Col3W, destH);
  drawField('EMAIL', email, col1 + destL3Col1W + destL3Col2W + destL3Col3W, y, destL3Col4W, destH);
  y += destH;

  // ==========================================
  // FORMA DE PAGAMENTO
  // ==========================================
  y = drawSectionHeader('FORMA DE PAGAMENTO', y);

  // Cabeçalho da tabela
  const pagColDesc = margin;
  const pagColDescW = contentWidth * 0.7;
  const pagColValor = pagColDesc + pagColDescW;
  const pagColValorW = contentWidth * 0.3;
  const rowH = 7;

  doc.setFillColor(cinzaClaro);
  doc.rect(pagColDesc, y, pagColDescW, rowH, 'F');
  doc.rect(pagColValor, y, pagColValorW, rowH, 'F');
  drawBox(pagColDesc, y, pagColDescW, rowH);
  drawBox(pagColValor, y, pagColValorW, rowH);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIÇÃO', pagColDesc + 2, y + 5);
  doc.text('VALOR', pagColValor + 2, y + 5);
  y += rowH;

  // Linhas de pagamento
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  venda.pagamentos.forEach(pag => {
    let desc = pag.meioPagamento;
    if (pag.parcelas && pag.parcelas > 1) {
      desc += ` (${pag.parcelas}x)`;
    }
    drawBox(pagColDesc, y, pagColDescW, rowH);
    drawBox(pagColValor, y, pagColValorW, rowH);
    doc.text(desc, pagColDesc + 2, y + 5);
    doc.text(formatCurrency(pag.valor), pagColValor + 2, y + 5);
    y += rowH;
  });

  // Total dos pagamentos
  drawBox(pagColDesc, y, pagColDescW, rowH);
  drawBox(pagColValor, y, pagColValorW, rowH);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', pagColDesc + 2, y + 5);
  doc.text(formatCurrency(venda.total), pagColValor + 2, y + 5);
  y += rowH;

  // ==========================================
  // FRETE
  // ==========================================
  y = drawSectionHeader('FRETE', y);
  const freteH = 10;
  const temFrete = venda.tipoRetirada === 'Entrega';
  const freteCol1W = contentWidth * 0.15;
  const freteCol2W = contentWidth * 0.15;
  const freteCol3W = contentWidth * 0.70;

  drawField('SIM', temFrete ? 'X' : '', margin, y, freteCol1W, freteH);
  drawField('NÃO', !temFrete ? 'X' : '', margin + freteCol1W, y, freteCol2W, freteH);
  drawField('ENDEREÇO ENTREGA', temFrete ? (venda.localRetirada || 'Endereço de entrega') : '-', margin + freteCol1W + freteCol2W, y, freteCol3W, freteH);
  y += freteH;

  // ==========================================
  // DADOS DOS PRODUTOS
  // ==========================================
  y = drawSectionHeader('DADOS DOS PRODUTOS / SERVIÇOS', y);

  // Cabeçalho tabela produtos
  const prodColQtd = margin;
  const prodColQtdW = contentWidth * 0.08;
  const prodColDesc = prodColQtd + prodColQtdW;
  const prodColDescW = contentWidth * 0.57;
  const prodColTipo = prodColDesc + prodColDescW;
  const prodColTipoW = contentWidth * 0.15;
  const prodColValor = prodColTipo + prodColTipoW;
  const prodColValorW = contentWidth * 0.20;

  doc.setFillColor(cinzaClaro);
  doc.rect(prodColQtd, y, prodColQtdW, rowH, 'F');
  doc.rect(prodColDesc, y, prodColDescW, rowH, 'F');
  doc.rect(prodColTipo, y, prodColTipoW, rowH, 'F');
  doc.rect(prodColValor, y, prodColValorW, rowH, 'F');
  drawBox(prodColQtd, y, prodColQtdW, rowH);
  drawBox(prodColDesc, y, prodColDescW, rowH);
  drawBox(prodColTipo, y, prodColTipoW, rowH);
  drawBox(prodColValor, y, prodColValorW, rowH);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('QTD', prodColQtd + 2, y + 5);
  doc.text('DESCRIÇÃO DO PRODUTO / ACESSÓRIO', prodColDesc + 2, y + 5);
  doc.text('TIPO', prodColTipo + 2, y + 5);
  doc.text('VALOR', prodColValor + 2, y + 5);
  y += rowH;

  // Linhas de produtos
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  venda.itens.forEach(item => {
    const descProduto = item.imei ? `${item.produto} - IMEI: ${item.imei}` : item.produto;
    drawBox(prodColQtd, y, prodColQtdW, rowH);
    drawBox(prodColDesc, y, prodColDescW, rowH);
    drawBox(prodColTipo, y, prodColTipoW, rowH);
    drawBox(prodColValor, y, prodColValorW, rowH);
    doc.text(String(item.quantidade), prodColQtd + 2, y + 5);
    doc.text(descProduto.substring(0, 70), prodColDesc + 2, y + 5);
    doc.text(item.categoria || 'Aparelho', prodColTipo + 2, y + 5);
    doc.text(formatCurrency(item.valorVenda), prodColValor + 2, y + 5);
    y += rowH;
  });

  // Acessórios
  if (venda.acessorios && venda.acessorios.length > 0) {
    venda.acessorios.forEach(acc => {
      drawBox(prodColQtd, y, prodColQtdW, rowH);
      drawBox(prodColDesc, y, prodColDescW, rowH);
      drawBox(prodColTipo, y, prodColTipoW, rowH);
      drawBox(prodColValor, y, prodColValorW, rowH);
      doc.text(String(acc.quantidade || 1), prodColQtd + 2, y + 5);
      doc.text(acc.descricao || '', prodColDesc + 2, y + 5);
      doc.text('Acessório', prodColTipo + 2, y + 5);
      doc.text(formatCurrency(acc.valorUnitario || 0), prodColValor + 2, y + 5);
      y += rowH;
    });
  }

  // Total produtos
  drawBox(prodColQtd, y, prodColQtdW + prodColDescW + prodColTipoW, rowH);
  drawBox(prodColValor, y, prodColValorW, rowH);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', prodColQtd + 2, y + 5);
  doc.text(formatCurrency(venda.total), prodColValor + 2, y + 5);
  y += rowH;

  // ==========================================
  // DADOS ADICIONAIS
  // ==========================================
  y = drawSectionHeader('DADOS ADICIONAIS', y);
  const dadosAdH = 15;
  drawBox(margin, y, contentWidth, dadosAdH);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const obs = venda.observacoes || 'Sem observações';
  const obsLines = doc.splitTextToSize(obs, contentWidth - 4);
  doc.text(obsLines, margin + 2, y + 5);
  y += dadosAdH;

  // ==========================================
  // INFORMAÇÕES COMPLEMENTARES
  // ==========================================
  y = drawSectionHeader('INFORMAÇÕES COMPLEMENTARES', y);
  const infoH = 18;
  drawBox(margin, y, contentWidth, infoH);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPORTANTE', margin + 2, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('TODOS OS PRODUTOS DA LOJA CONTÊM 01 (UM) ANO DE GARANTIA PELA LOJA.', margin + 2, y + 10);
  doc.text('A GARANTIA NÃO COBRE MAU USO, QUEBRA OU APARELHO MOLHADO', margin + 2, y + 14);
  y += infoH;

  // ==========================================
  // RODAPÉ
  // ==========================================
  y += 4;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`DATA E HORA DA IMPRESSÃO: ${formatarDataHora(new Date())}`, margin, y + 4);
  doc.text('Sistema: Thiago Imports', margin + contentWidth - 40, y + 4);

  // Abrir em nova aba
  const pdfUrl = doc.output('bloburl');
  window.open(pdfUrl as unknown as string, '_blank');
};
