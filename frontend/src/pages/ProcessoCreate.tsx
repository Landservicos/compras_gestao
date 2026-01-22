import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { ArrowLeft, FilePlus, Save, CheckCircle } from "lucide-react";
import "../styles/processoCreate.css";
import "../styles/searchableSelect.css";
import SearchableSelect from "../components/SearchableSelect";

interface CRDII {
  id: number;
  nome: string;
}

// Definindo a interface para o usuário
interface User {
  is_staff?: boolean;
  is_superuser?: boolean;
  role?: string;
  permissions?: {
    status_limits?: {
      nao_concluido?: boolean;
      parcial?: boolean;
      concluido?: boolean;
      arquivado?: boolean;
    };
  };
}

const ProcessoCreate: React.FC = () => {
  const [nome, setNome] = useState("");
  const [status, setStatus] = useState("nao_concluido");
  const [crdiiId, setCrdiiId] = useState<number | string>("");
  const [crdiis, setCrdiis] = useState<CRDII[]>([]);
  const [loading, setLoading] = useState(false);
  const { user }: { user: User | null } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCRDIIs = async () => {
      try {
        const res = await api.get<CRDII[]>("crdiis/");
        // Ordena para facilitar a busca visual
        const sorted = res.data.sort((a, b) => a.nome.localeCompare(b.nome));
        setCrdiis(sorted);
      } catch (err) {
        toast.error("Falha ao carregar CRDIIs.");
        console.error(err);
      }
    };
    fetchCRDIIs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error("O nome do processo é obrigatório.");
      return;
    }
    if (!crdiiId) {
      toast.error("Por favor, selecione um CRDII.");
      return;
    }

    const load = toast.loading("Criando processo...");
    setLoading(true);

    try {
      await api.post("processos/", {
        nome,
        crdii: crdiiId,
        status,
      });

      toast.dismiss(load);
      navigate("/processos");
      toast.success("Processo criado com sucesso!", { duration: 2000 });
    } catch (err: any) {
      toast.dismiss(load);
      const apiError =
        err.response?.data?.nome?.[0] ||
        err.response?.data?.detail ||
        "Erro ao criar processo. Verifique os dados.";
      toast.error(apiError, { duration: 3000 });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: "nao_concluido", label: "Em Andamento" },
    { value: "parcial", label: "Parcial" },
    { value: "concluido", label: "Concluído" },
    { value: "arquivado", label: "Arquivado" },
  ];

  const allowedStatusOptions = user?.is_superuser
    ? statusOptions
    : statusOptions.filter(
        (option) =>
          user?.permissions?.status_limits?.[
            option.value as keyof typeof user.permissions.status_limits
          ] ?? false
      );

  return (
    <div className="processo-create-page page-container">
      <header className="create-header">
        <div className="header-title">
          <FilePlus size={28} />
          <h1>Criar Novo Processo</h1>
        </div>
        <Link to="/processos" className="back-link">
          <ArrowLeft size={18} />
          Voltar para a lista
        </Link>
      </header>

      <div className="form-card">
        <form onSubmit={handleSubmit} className="processo-form">
          
          {/* Seção Principal */}
          <div className="form-section">
            <h3>Informações Básicas</h3>
            <div className="form-group">
              <label htmlFor="nome">Nome do Processo</label>
              <input
                id="nome"
                className="form-input"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value.toUpperCase())}
                placeholder="Ex: 2024.00123 - Aquisição de Materiais"
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          {/* Seção Secundária (Grid) */}
          <div className="form-section">
            <h3>Classificação</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="status">Status Inicial</label>
                <select
                  id="status"
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={loading}
                >
                  {allowedStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="crdii">Vincular CRDII</label>
                <div className="crdii-select-container">
                  <SearchableSelect
                    options={crdiis}
                    value={String(crdiiId)}
                    onChange={(id) => setCrdiiId(id)}
                    placeholder="Busque pelo nome do CRDII..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="form-actions">
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? (
                <>
                  <div className="btn-spinner"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Criar Processo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProcessoCreate;
