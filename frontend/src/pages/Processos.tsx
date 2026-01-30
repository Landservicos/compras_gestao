import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  Calendar,
  User,
  Inbox,
  File,
  Clock,
  PieChart,
  CheckCircle,
  Archive,
  Layers,
  Filter,
  X,
  Download,
  Eye,
  FolderOpen
} from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";
import "../styles/processos.css";
import "../styles/userManagement.css"; // Importando estilo padrão das tabelas
import "../styles/searchableSelect.css";
import { useAuth } from "../hooks/useAuth";
import ProcessoSkeletonCard from "../components/ProcessoSkeletonCard"; // Pode manter ou criar um Skeleton de Tabela
import SearchableSelect from "../components/SearchableSelect";
import Pagination from "../components/Pagination";
import {
  generateProcessosPDF,
  generateProcessosExcel,
} from "../hooks/reportGenerator";
import logoEmpresa from "../assets/logo1.png";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

export interface Processo {
  id: number;
  nome: string;
  status: string;
  data_criacao: string;
  criado_por: string;
  crdii_nome: string;
  arquivos_count: number;
  data_em_andamento: string | null;
  data_parcial: string | null;
  data_concluido: string | null;
  data_arquivado: string | null;
  data_cancelado: string | null;
  data_status: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface CRDII {
  id: number;
  nome: string;
}

interface UserOption {
  id: number;
  username: string;
}

const ProcessoStatusIcon: React.FC<{ status: string }> = ({ status }) => {
  // Ajuste de tamanho para caber melhor na tabela
  const iconProps = { size: 20, className: `status-icon-${status}` };
  switch (status) {
    case "nao_concluido":
      return <Clock {...iconProps} />;
    case "parcial":
      return <PieChart {...iconProps} />;
    case "concluido":
      return <CheckCircle {...iconProps} />;
    case "arquivado":
      return <Archive {...iconProps} />;
    default:
      return <FileText {...iconProps} />;
  }
};

export const formatStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    nao_concluido: "Em Andamento",
    parcial: "Parcial",
    concluido: "Concluído",
    arquivado: "Arquivado",
    cancelado: "Cancelado",
  };
  return statusMap[status] || status;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface ProcessosProps {
    context?: 'COMPRAS' | 'DIVERSOS';
}

const Processos: React.FC<ProcessosProps> = ({ context = 'COMPRAS' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // --- Estados dos Filtros ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [crdiiFilter, setCrdiiFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [ordering, setOrdering] = useState("-data_criacao");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showReportOptions, setShowReportOptions] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['processos', page, debouncedSearchTerm, statusFilter, crdiiFilter, userFilter, ordering, context],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('tipo', context);
      
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (crdiiFilter) params.append('crdii', crdiiFilter);
      if (userFilter) {
          params.append('criado_por', userFilter); 
      }
      if (ordering) params.append('ordering', ordering);

      const response = await api.get<PaginatedResponse<Processo>>(`processos/?${params.toString()}`);
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const processos = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  const { data: crdiiOptions = [] } = useQuery({
    queryKey: ['crdiis'],
    queryFn: async () => {
      const res = await api.get<CRDII[]>("crdiis/");
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: userOptions = [] } = useQuery({
    queryKey: ['users_options'],
    queryFn: async () => {
       if (!user?.is_superuser) return [];
       const res = await api.get<UserOption[]>("/auth/users/");
       return res.data;
    },
    enabled: !!user?.is_superuser,
    staleTime: 1000 * 60 * 10,
  });


  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setCrdiiFilter("");
    setUserFilter("");
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, statusFilter, crdiiFilter, userFilter, context]);

  const handleGenerateReport = (format: "pdf" | "excel") => {
    const reportTitle = `Relatório de Processos - ${context} (Página Atual)`;
    if (format === "pdf") {
      generateProcessosPDF(processos, reportTitle, logoEmpresa);
    } else {
      generateProcessosExcel(processos, reportTitle);
    }
    setShowReportOptions(false);
  };

  if (isError) {
      console.error(error);
      toast.error("Erro ao carregar processos.");
  }

  // Helper para controlar a ordenação visual
  const getSortIcon = (field: string) => {
    if (ordering === field) return ' ↑';
    if (ordering === `-${field}`) return ' ↓';
    return '';
  };

  const handleSort = (field: string) => {
    setOrdering(prev => prev === field ? `-${field}` : field);
  };

  return (
    <div className="user-management-container page-container">
      <header className="user-management-header">
        <div className="header-title">
          <Layers size={28} />
          <h1>Meus Processos ({context === 'COMPRAS' ? 'Compras' : 'Diversos'})</h1>
        </div>
        <div className="header-actions">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar processos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar processos"
            />
          </div>

          <button
            className="btn-filter"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            <span>Filtros</span>
          </button>
          
          <div className="report-dropdown">
            <button
              className="btn-relatorio"
              onClick={() => setShowReportOptions(!showReportOptions)}
            >
              <Download size={16} />
              Relatório
            </button>
            {showReportOptions && (
              <div className="report-options">
                <button onClick={() => handleGenerateReport("pdf")}>
                  Gerar PDF
                </button>
                <button onClick={() => handleGenerateReport("excel")}>
                  Gerar Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por Status"
            >
              <option value="">Todos os Status</option>
              <option value="nao_concluido">Em Andamento</option>
              <option value="parcial">Parcial</option>
              <option value="concluido">Concluído</option>
              <option value="arquivado">Arquivado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            
            <SearchableSelect
              options={crdiiOptions}
              value={crdiiFilter}
              onChange={setCrdiiFilter}
              placeholder="Filtrar por CRDII"
            />
            
            {userOptions.length > 0 && (
              <SearchableSelect
                options={userOptions}
                value={userFilter}
                onChange={setUserFilter}
                placeholder="Filtrar por Usuário"
              />
            )}
          </div>
          
          <button className="btn-clear-filters" onClick={clearFilters}>
            <X size={16} /> Limpar Filtros
          </button>
        </div>
      )}

      {(statusFilter || crdiiFilter || userFilter) && (
        <div className="active-filters-badges" style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {statusFilter && <span className="badge">Status: {formatStatus(statusFilter)}</span>}
            {crdiiFilter && <span className="badge">CRDII: {crdiiOptions.find(c => String(c.id) === crdiiFilter)?.nome || crdiiFilter}</span>}
            {userFilter && <span className="badge">User: {userOptions.find(u => String(u.id) === userFilter)?.username || userFilter}</span>}
        </div>
      )}

      <div className="user-list">
        {isLoading ? (
             <div style={{padding: '2rem'}}>
                <ProcessoSkeletonCard />
                <ProcessoSkeletonCard />
                <ProcessoSkeletonCard />
             </div>
        ) : (
            <table className="user-table">
            <thead>
                <tr>
                <th onClick={() => handleSort('nome')} style={{cursor: 'pointer'}}>
                    Processo {getSortIcon('nome')}
                </th>
                <th onClick={() => handleSort('crdii__nome')} style={{cursor: 'pointer'}}>
                    CRDII {getSortIcon('crdii__nome')}
                </th>
                <th onClick={() => handleSort('data_criacao')} style={{cursor: 'pointer'}}>
                    Data Criação {getSortIcon('data_criacao')}
                </th>
                <th>Data Status</th>
                <th>Status</th>
                <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                {processos.length === 0 ? (
                <tr>
                    <td colSpan={6} className="no-results-cell">
                        <div className="no-results-container" style={{border: 'none', padding: '2rem'}}>
                            <Inbox size={32} className="no-results-icon" />
                            <p>{searchTerm || statusFilter ? "Nenhum processo encontrado." : "Nenhum processo criado."}</p>
                        </div>
                    </td>
                </tr>
                ) : (
                processos.map((processo) => (
                    <tr key={processo.id} className={`row-status-${processo.status}`}>
                    <td data-label="Processo" style={{fontWeight: 600}}>
                        {processo.nome}
                    </td>
                    <td data-label="CRDII">
                        {processo.crdii_nome || "-"}
                    </td>
                    <td data-label="Data Criação">
                        {new Date(processo.data_criacao).toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit", year: "numeric", hour: '2-digit', minute: '2-digit'
                        })}
                    </td>
                    <td data-label="Data Status">
                        {new Date(processo.data_status).toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit", year: "numeric", hour: '2-digit', minute: '2-digit'
                        })}
                    </td>
                    <td data-label="Status">
                         <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                             <ProcessoStatusIcon status={processo.status} />
                             <span className={`status-text status-${processo.status === 'nao_concluido' ? 'pending' : processo.status}`}>
                                {formatStatus(processo.status)}
                             </span>
                         </div>
                    </td>
                    <td data-label="Ações">
                        <div className="user-actions">
                            <button 
                                className="btn btn-icon btn-view" 
                                title="Abrir Processo"
                                onClick={() => navigate(`/processos/${processo.id}`)}
                            >
                                <FolderOpen size={18} />
                            </button>
                        </div>
                    </td>
                    </tr>
                ))
                )}
            </tbody>
            </table>
        )}
      </div>
      
      {!isLoading && processos.length > 0 && (
          <Pagination 
            currentPage={page} 
            totalPages={totalPages} 
            onPageChange={setPage} 
          />
      )}
    </div>
  );
};

export default Processos;