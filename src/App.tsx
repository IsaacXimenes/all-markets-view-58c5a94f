
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationSystem } from "@/components/notifications/NotificationSystem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Stocks from "./pages/Stocks";
import Markets from "./pages/Markets";
import Currencies from "./pages/Currencies";
import Global from "./pages/Global";
import Portfolio from "./pages/Portfolio";
import Performance from "./pages/Performance";
import Analysis from "./pages/Analysis";
import Settings from "./pages/Settings";
import RecursosHumanos from "./pages/RecursosHumanos";
import LojaRH from "./pages/LojaRH";
import FuncionarioDetalhes from "./pages/FuncionarioDetalhes";
import RHFeedback from "./pages/RHFeedback";
import FinanceiroConferencia from "./pages/FinanceiroConferencia";
import FinanceiroDespesasFixas from "./pages/FinanceiroDespesasFixas";
import FinanceiroDespesasVariaveis from "./pages/FinanceiroDespesasVariaveis";
import FinanceiroConferenciaNotas from "./pages/FinanceiroConferenciaNotas";
import Estoque from "./pages/Estoque";
import EstoqueProdutos from "./pages/EstoqueProdutos";
import EstoqueProdutoDetalhes from "./pages/EstoqueProdutoDetalhes";
import EstoqueProdutosPendentes from "./pages/EstoqueProdutosPendentes";
import EstoqueProdutoPendenteDetalhes from "./pages/EstoqueProdutoPendenteDetalhes";
import EstoqueNotasCompra from "./pages/EstoqueNotasCompra";
import EstoqueNotaDetalhes from "./pages/EstoqueNotaDetalhes";
import EstoqueNotaCadastrar from "./pages/EstoqueNotaCadastrar";
import EstoqueMovimentacoes from "./pages/EstoqueMovimentacoes";
import Cadastros from "./pages/Cadastros";
import CadastrosLojas from "./pages/CadastrosLojas";
import CadastrosClientes from "./pages/CadastrosClientes";
import CadastrosColaboradores from "./pages/CadastrosColaboradores";
import CadastrosFornecedores from "./pages/CadastrosFornecedores";
import CadastrosOrigensVenda from "./pages/CadastrosOrigensVenda";
import CadastrosProdutos from "./pages/CadastrosProdutos";
import CadastrosTiposDesconto from "./pages/CadastrosTiposDesconto";
import CadastrosCargos from "./pages/CadastrosCargos";
import CadastrosModelosPagamento from "./pages/CadastrosModelosPagamento";
import CadastrosContasFinanceiras from "./pages/CadastrosContasFinanceiras";
import Vendas from "./pages/Vendas";
import VendasNova from "./pages/VendasNova";
import VendaDetalhes from "./pages/VendaDetalhes";
import VendasNovaDigital from "./pages/VendasNovaDigital";
import VendasPendentesDigitais from "./pages/VendasPendentesDigitais";
import VendasFinalizarDigital from "./pages/VendasFinalizarDigital";
import VendasAcessorios from "./pages/VendasAcessorios";
import EstoqueAcessorios from "./pages/EstoqueAcessorios";
import OSProdutosAnalise from "./pages/OSProdutosAnalise";
import OSProdutoDetalhes from "./pages/OSProdutoDetalhes";
import OSAssistencia from "./pages/OSAssistencia";
import OSAssistenciaNova from "./pages/OSAssistenciaNova";
import OSAssistenciaDetalhes from "./pages/OSAssistenciaDetalhes";
import OSSolicitacoesPecas from "./pages/OSSolicitacoesPecas";
import FinanceiroNotasAssistencia from "./pages/FinanceiroNotasAssistencia";
import Relatorios from "./pages/Relatorios";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <NotificationSystem />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/stocks" element={<Stocks />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/currencies" element={<Currencies />} />
          <Route path="/global" element={<Global />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/rh" element={<RecursosHumanos />} />
          <Route path="/rh/loja/:id" element={<LojaRH />} />
          <Route path="/rh/funcionario/:id" element={<FuncionarioDetalhes />} />
          <Route path="/rh/feedback" element={<RHFeedback />} />
          <Route path="/financeiro/conferencia" element={<FinanceiroConferencia />} />
          <Route path="/financeiro/despesas-fixas" element={<FinanceiroDespesasFixas />} />
          <Route path="/financeiro/despesas-variaveis" element={<FinanceiroDespesasVariaveis />} />
          <Route path="/financeiro/conferencia-notas-entrada" element={<FinanceiroConferenciaNotas />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/estoque/produtos" element={<EstoqueProdutos />} />
          <Route path="/estoque/produto/:id" element={<EstoqueProdutoDetalhes />} />
          <Route path="/estoque/produtos-pendentes" element={<EstoqueProdutosPendentes />} />
          <Route path="/estoque/produto-pendente/:id" element={<EstoqueProdutoPendenteDetalhes />} />
          <Route path="/estoque/notas-compra" element={<EstoqueNotasCompra />} />
          <Route path="/estoque/nota/:id" element={<EstoqueNotaDetalhes />} />
          <Route path="/estoque/nota/cadastrar" element={<EstoqueNotaCadastrar />} />
          <Route path="/estoque/movimentacoes" element={<EstoqueMovimentacoes />} />
          <Route path="/estoque/acessorios" element={<EstoqueAcessorios />} />
          <Route path="/estoque/solicitacoes-pecas" element={<OSSolicitacoesPecas />} />
          <Route path="/os/produtos-analise" element={<OSProdutosAnalise />} />
          <Route path="/os/produto/:id" element={<OSProdutoDetalhes />} />
          <Route path="/os/assistencia" element={<OSAssistencia />} />
          <Route path="/os/assistencia/nova" element={<OSAssistenciaNova />} />
          <Route path="/os/assistencia/:id" element={<OSAssistenciaDetalhes />} />
          <Route path="/financeiro/notas-assistencia" element={<FinanceiroNotasAssistencia />} />
          <Route path="/cadastros" element={<Cadastros />} />
          <Route path="/cadastros/lojas" element={<CadastrosLojas />} />
          <Route path="/cadastros/clientes" element={<CadastrosClientes />} />
          <Route path="/cadastros/colaboradores" element={<CadastrosColaboradores />} />
          <Route path="/cadastros/fornecedores" element={<CadastrosFornecedores />} />
          <Route path="/cadastros/origens-venda" element={<CadastrosOrigensVenda />} />
          <Route path="/cadastros/produtos" element={<CadastrosProdutos />} />
          <Route path="/cadastros/tipos-desconto" element={<CadastrosTiposDesconto />} />
          <Route path="/cadastros/cargos" element={<CadastrosCargos />} />
          <Route path="/cadastros/modelos-pagamento" element={<CadastrosModelosPagamento />} />
          <Route path="/cadastros/contas-financeiras" element={<CadastrosContasFinanceiras />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/vendas/nova" element={<VendasNova />} />
          <Route path="/vendas/nova-digital" element={<VendasNovaDigital />} />
          <Route path="/vendas/pendentes-digitais" element={<VendasPendentesDigitais />} />
          <Route path="/vendas/finalizar-digital/:id" element={<VendasFinalizarDigital />} />
          <Route path="/vendas/acessorios" element={<VendasAcessorios />} />
          <Route path="/vendas/:id" element={<VendaDetalhes />} />
          <Route path="/relatorios" element={<Relatorios />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
