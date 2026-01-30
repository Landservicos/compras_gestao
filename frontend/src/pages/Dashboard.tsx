import React, { useState, useEffect } from "react";
import api from "../services/api";
import {
  DollarSign,
  CheckCircle,
  Clock,
  Archive,
  PieChart,
  AlertCircle,
  BarChart2,
  TrendingUp,
  Activity,
  User,
  AlertTriangle,
  XCircle,
  Filter,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import "../styles/dashboard.css";
import ProcessosModal from "../components/ProcessosModal";
import "../styles/ProcessosModal.css";
import { Processo } from "./Processos";
import toast from "react-hot-toast"; // Importar toast para feedback

// --- Interfaces de Resposta da API ---

interface StatsData {
  total_processos: number;
  concluidos: number;
  em_andamento: number;
  parcial: number;
  arquivados: number;
  cancelados: number;
}

interface ExtraStatsData {
  tempo_medio_dias: number;
  stagnant_count: number;
  top_crdiis: { name: string; total: number }[];
  top_users: { username: string; total: number }[];
  recent_activity: {
    id: number;
    usuario: string;
    processo: string;
    status_novo: string;
    data: string;
  }[];
}

interface ChartDataPoint {
    name: string;
    criados: number;
    concluidos: number;
}

interface DashboardResponse {
  stats: StatsData;
  extra_stats: ExtraStatsData;
  chart_data: ChartDataPoint[];
}

interface CRDII {
    id: number;
    nome: string;
}

// --- Componentes Auxiliares ---

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass: string;
  onClick?: () => void; // Garantir que onClick seja opcional na interface
  clickable?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  colorClass,
  onClick,
  clickable = false
}) => (
  <div 
    className={`stat-card ${colorClass} ${clickable ? 'clickable-card' : ''}`} 
    onClick={clickable ? onClick : undefined}
    style={clickable ? { cursor: 'pointer' } : {}}
  >
    <div className="stat-card-icon">{icon}</div>
    <div className="stat-card-info">
      <span className="stat-card-value">{value}</span>
      <span className="stat-card-title">{title}</span>
    </div>
  </div>
);

interface DashboardProps {
    context?: 'COMPRAS' | 'DIVERSOS';
}

const Dashboard: React.FC<DashboardProps> = ({ context = 'COMPRAS' }) => {
  // Dados do Dashboard
  const [stats, setStats] = useState<StatsData | null>(null);
  const [extraStats, setExtraStats] = useState<ExtraStatsData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  
  // Dados para Filtros (Opções)
  const [availableCrdiis, setAvailableCrdiis] = useState<CRDII[]>([]);
  
  // Filtros Selecionados
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterCrdii, setFilterCrdii] = useState<string>("");

  // Estado de UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    processos: Processo[];
  } | null>(null);
  
  // Busca inicial de opções de filtro
  useEffect(() => {
      api.get<CRDII[]>('crdiis/').then(res => setAvailableCrdiis(res.data)).catch(console.error);
  }, []);

  // Busca de dados do Dashboard (Reage aos filtros)
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
        const params = new URLSearchParams();
        params.append('tipo', context);
        if (filterYear) params.append('year', filterYear);
        if (filterMonth) params.append('month', filterMonth);
        if (filterCrdii) params.append('crdii', filterCrdii);

        const response = await api.get<DashboardResponse>(`dashboard/stats/?${params.toString()}`);
        setStats(response.data.stats);
        setExtraStats(response.data.extra_stats);
        setChartData(response.data.chart_data);

    } catch (err: any) {
        console.error("Erro ao carregar dashboard:", err);
        // Tenta mostrar mensagem do backend se existir
        const msg = err.response?.data?.detail || "Não foi possível carregar os dados.";
        setError(msg);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
      fetchDashboardData();
  }, [filterYear, filterMonth, filterCrdii, context]);


  // --- Lógica do Modal ---
  const handleCardClick = async (statusKey: string, title: string) => {
      if (loadingModal) return;
      setLoadingModal(true);
      
      const toastId = toast.loading("Carregando detalhes...");

      try {
          // Busca processos filtrados pelo status clicado
          // Passamos também os filtros globais (Ano, Mês, CRDII) para manter consistência
          const params = new URLSearchParams();
          params.append('tipo', context);
          
          if (statusKey !== 'total') {
              params.append('status', statusKey);
          }
          
          // Nota: O endpoint /processos/ usa 'crdii' (ID), 'criado_por', etc.
          // Filtro de DATA no /processos/ é mais complexo se for por ano/mês específico.
          // O backend (ProcessoViewSet) não tem filtro nativo 'year'/'month' no django-filter configurado ainda,
          // apenas 'status', 'crdii', 'criado_por'.
          // Se eu mandar 'year', ele vai ignorar. 
          // Para uma solução rápida, filtramos por Status e CRDII que já funcionam.
          if (filterCrdii) params.append('crdii', filterCrdii);
          
          // Limite para não travar o modal (top 100 mais recentes)
          params.append('page_size', '100'); 
          
          const response = await api.get<{ results: Processo[] }>(`processos/?${params.toString()}`);
          
          // Filtragem manual de Ano/Mês no front (já que baixamos 100 itens, é leve filtrar aqui para garantir consistência visual)
          let filteredResults = response.data.results;
          if (filterYear || filterMonth) {
              filteredResults = filteredResults.filter(p => {
                  const d = new Date(p.data_criacao);
                  const yearMatch = filterYear ? d.getFullYear().toString() === filterYear : true;
                  const monthMatch = filterMonth ? (d.getMonth() + 1).toString() === filterMonth : true;
                  return yearMatch && monthMatch;
              });
          }

          setModalContent({
              title: title,
              processos: filteredResults
          });
          setIsModalOpen(true);
          toast.dismiss(toastId);

      } catch (err) {
          console.error("Erro ao abrir modal:", err);
          toast.error("Erro ao carregar detalhes.", { id: toastId });
      } finally {
          setLoadingModal(false);
      }
  };


  // Helper para cores de status
  const getStatusColorClass = (status: string) => {
    if (!status) return "";
    const s = status.toLowerCase();
    if (s.includes("andamento") || s.includes("nao") || s.includes("não")) return "nao_concluido";
    if (s.includes("conclu")) return "concluido";
    if (s.includes("parcial")) return "parcial";
    if (s.includes("arquiv")) return "arquivado";
    if (s.includes("cancel")) return "cancelado";
    return s.replace(/\s+/g, "_");
  };

  const pieChartData = stats
    ? [
        { name: "Concluídos", value: stats.concluidos, color: "#10B981" },
        { name: "Em Andamento", value: stats.em_andamento, color: "#F59E0B" },
        { name: "Parcial", value: stats.parcial, color: "#8B5CF6" },
        { name: "Arquivados", value: stats.arquivados, color: "#6B7280" },
        { name: "Cancelados", value: stats.cancelados, color: "#EF4444" },
      ]
    : [];

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return percent > 0 ? (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  return (
    <div className="page-container">
      <div className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <div className="header-title-container">
              <BarChart2 size={28} />
              <h1>Dashboard ({context === 'COMPRAS' ? 'Compras' : 'Diversos'})</h1>
            </div>
            <p className="header-subtitle">
              Visão geral, eficiência e atividade recente.
            </p>
          </div>
        </header>

        {/* --- Barra de Filtros --- */}
        <div className="dashboard-filters">
          <div className="filter-group">
            <Filter size={18} color="#6b7280" />
            <span className="filter-label">Filtrar:</span>
          </div>

          <select
            className="filter-select"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="">Todos os Anos</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>

          <select
            className="filter-select"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="">Todos os Meses</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString("pt-BR", { month: "long" })}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filterCrdii}
            onChange={(e) => setFilterCrdii(e.target.value)}
          >
            <option value="">Todos os CRDIIs</option>
            {availableCrdiis.map((crdii) => (
              <option key={crdii.id} value={crdii.id}>
                {crdii.nome}
              </option>
            ))}
          </select>

          {(filterYear || filterMonth || filterCrdii) && (
            <button
              className="btn-clear-filters"
              onClick={() => {
                setFilterYear("");
                setFilterMonth("");
                setFilterCrdii("");
              }}
            >
              <X size={16} /> Limpar
            </button>
          )}
        </div>

        <div className="dashboard-content">
          {loading && (
            <p className="loading-message">Carregando estatísticas...</p>
          )}
          {error && (
            <div className="error-message">
              <AlertCircle size={20} /> {error}
            </div>
          )}

          {stats && extraStats && !loading && !error && (
            <>
              {/* --- 1. Cartões de Estatísticas --- */}
              <div className="stats-grid">
                <StatCard
                  title="Total de Processos"
                  value={stats.total_processos}
                  icon={<PieChart size={24} color="white" />}
                  colorClass="blue"
                  clickable={true}
                  onClick={() => handleCardClick('total', 'Todos os Processos')}
                />

                <StatCard
                  title="Tempo Médio (Dias)"
                  value={extraStats.tempo_medio_dias}
                  icon={<TrendingUp size={24} color="white" />}
                  colorClass={extraStats.tempo_medio_dias > 30 ? "red" : "green"}
                />

                {extraStats.stagnant_count > 0 && (
                  <StatCard
                    title="Processos Parados (>30d)"
                    value={extraStats.stagnant_count}
                    icon={<AlertTriangle size={24} color="white" />}
                    colorClass="red"
                  />
                )}

                <StatCard
                  title="Concluídos"
                  value={stats.concluidos}
                  icon={<CheckCircle size={24} color="white" />}
                  colorClass="green"
                  clickable={true}
                  onClick={() => handleCardClick('concluido', 'Processos Concluídos')}
                />
                <StatCard
                  title="Em Andamento"
                  value={stats.em_andamento}
                  icon={<Clock size={24} color="white" />}
                  colorClass="amber"
                  clickable={true}
                  onClick={() => handleCardClick('nao_concluido', 'Processos em Andamento')}
                />
                <StatCard
                  title="Parcial"
                  value={stats.parcial}
                  icon={<DollarSign size={24} color="white" />}
                  colorClass="purple"
                  clickable={true}
                  onClick={() => handleCardClick('parcial', 'Processos Parcial')}
                />
                <StatCard
                  title="Arquivados"
                  value={stats.arquivados}
                  icon={<Archive size={24} color="white" />}
                  colorClass="gray"
                  clickable={true}
                  onClick={() => handleCardClick('arquivado', 'Processos Arquivados')}
                />
                <StatCard
                  title="Cancelados"
                  value={stats.cancelados}
                  icon={<XCircle size={24} color="white" />}
                  colorClass="red"
                  clickable={true}
                  onClick={() => handleCardClick('cancelado', 'Processos Cancelados')}
                />
              </div>

              {/* --- 2. Gráficos --- */}
              <div className="charts-grid">
                {/* Pizza */}
                <div className="chart-container">
                  <h3>Distribuição por Status</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={100}
                        innerRadius={50}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        paddingAngle={2}
                      >
                        {pieChartData.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                {/* Barras CRDII */}
                <div className="chart-container">
                  <h3>Top 5 CRDIIs</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart
                      layout="vertical"
                      data={extraStats.top_crdiis}
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip cursor={{ fill: "rgba(240, 240, 240, 0.5)" }} />
                      <Bar dataKey="total" fill="#63b8f1" radius={[0, 4, 4, 0]} barSize={20} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>

                {/* Linha Evolução */}
                {chartData.length > 0 && (
                  <div className="chart-container chart-container-full-width">
                    <h3>Evolução {filterYear ? "Mensal" : "Anual"}</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="criados" name="Criados" stroke="#f6bb3b" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="concluidos" name="Concluídos" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* --- 3. Listas --- */}
              <div className="dashboard-lists-grid">
                {/* Ranking Users */}
                <div className="chart-container">
                  <div className="list-header">
                    <User size={20} className="list-header-icon" />
                    <h3>Top Usuários</h3>
                  </div>
                  <ul className="list-content">
                    {extraStats.top_users.map((u, idx) => (
                      <li key={idx} className="list-item">
                        <div className="list-item-row">
                          <span>{idx + 1}. {u.username}</span>
                          <span className="list-item-value">{u.total}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Atividade Recente */}
                <div className="chart-container">
                  <div className="list-header">
                    <Activity size={20} className="list-header-icon" />
                    <h3>Atividade Recente</h3>
                  </div>
                  <ul className="list-content">
                    {extraStats.recent_activity.map((act) => (
                      <li key={act.id} className="list-item">
                        <div>
                          <strong>{act.usuario}</strong> mudou <strong>{act.processo}</strong>
                        </div>
                        <div className="list-item-details">
                          Para: <span className={`status-badge status-${getStatusColorClass(act.status_novo)}`}>{act.status_novo}</span>
                          {" • "}
                          {new Date(act.data).toLocaleDateString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Componente Modal */}
      {modalContent && (
        <ProcessosModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalContent.title}
          processos={modalContent.processos}
          onDataChange={fetchDashboardData} // Recarrega dashboard se houver mudança no modal
        />
      )}
    </div>
  );
};

export default Dashboard;
