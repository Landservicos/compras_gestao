import React, { useEffect, useState } from "react";
import api from "../services/api";
import { Link, useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  File,
  Upload,
  Trash2,
  Calendar,
  RefreshCw,
  Clock,
  PieChart,
  CheckCircle,
  Archive,
  Folder,
  User,
  XCircle,
  Search,
  FileText,
  BookOpen,
} from "lucide-react";
import Modal from "../components/Modal";
import "../styles/ProcessoDetail.css";
import { useAuth } from "../hooks/useAuth";
import ProcessoDetailSkeleton from "../components/ProcessoDetailSkeleton";
import StatusHistoryModal from "../components/StatusHistoryModal";
import FilePreviewModal from "../components/FilePreviewModal"; // Import do novo modal

interface Arquivo {
  id: number;
  nome_atual: string;
  criado_por: string;
  criado_por_role: string;
  arquivo_url: string;
  data_upload: string;
  document_type: string;
}

interface Processo {
  id: number;
  nome: string;
  status: string;
  criado_por: string;
  criado_por_role: string;
  data_criacao: string;
  data_em_andamento: string | null;
  data_parcial: string | null;
  data_concluido: string | null;
  data_arquivado: string | null;
  data_cancelado: string | null;
  data_status: string;
  arquivos: Arquivo[];
  crdii_nome: string;
}

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  const iconProps = { size: 16, className: "status-icon" };
  switch (status) {
    case "nao_concluido":
      return <Clock {...iconProps} />;
    case "parcial":
      return <PieChart {...iconProps} />;
    case "concluido":
      return <CheckCircle {...iconProps} />;
    case "arquivado":
      return <Archive {...iconProps} />;
    case "cancelado":
      return <XCircle {...iconProps} />;
    default:
      return null;
  }
};

const STATUS_OPTIONS = [
  { value: "nao_concluido", label: "Em Andamento" },
  { value: "parcial", label: "Parcial" },
  { value: "concluido", label: "Concluído" },
  { value: "arquivado", label: "Arquivado" },
  { value: "cancelado", label: "Cancelado" },
];

const DOCUMENT_TYPE_OPTIONS = [
  { value: "processo", label: "Processo" },
  { value: "nota_fiscal", label: "Nota Fiscal" },
  { value: "boletos", label: "Boletos" },
];

// Hierarquia de cargos para validação no frontend
const ROLE_HIERARCHY: Record<string, number> = {
  dev: 6,
  diretoria: 5,
  gestor: 5,
  administrador: 4,
  financeiro: 3,
  compras: 2,
  obra: 1,
};

interface StatusSelectorProps {
  status: string;
  updating: boolean;
  allowedStatuses: typeof STATUS_OPTIONS;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({
  status,
  updating,
  allowedStatuses,
  onChange,
}) => (
  <div className={`status-selector status-${status}`}>
    <StatusIcon status={status} />
    <select
      className="status-selector__select"
      value={status}
      onChange={onChange}
      disabled={updating}
      title="status"
    >
      {allowedStatuses.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {updating && (
      <RefreshCw size={16} className="status-selector__loading-icon" />
    )}
  </div>
);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ProcessoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<Arquivo | null>(null);
  const [previewFile, setPreviewFile] = useState<Arquivo | null>(null); // Estado para o modal de preview
  const [documentType, setDocumentType] = useState<string>("processo"); // Novo estado para o tipo de documento

  // Modais
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDeleteProcessModalOpen, setIsDeleteProcessModalOpen] = useState(false);
  const [, setIsDeletingProcess] = useState(false);

  const [fileSearchTerm, setFileSearchTerm] = useState("");
  const { user } = useAuth();

  // Granular Upload Permissions
  const canUploadProcesso = user?.is_superuser || (user?.permissions?.can_upload_processo ?? false);
  const canUploadNotaFiscal = user?.is_superuser || (user?.permissions?.can_upload_nota_fiscal ?? false);
  const canUploadBoletos = user?.is_superuser || (user?.permissions?.can_upload_boletos ?? false);

  const availableDocumentTypes = DOCUMENT_TYPE_OPTIONS.filter((option) => {
    if (option.value === "processo") return canUploadProcesso;
    if (option.value === "nota_fiscal") return canUploadNotaFiscal;
    if (option.value === "boletos") return canUploadBoletos;
    return false;
  });

  // Automatically select the first available option if the current one isn't available
  useEffect(() => {
    if (availableDocumentTypes.length > 0) {
       const isCurrentTypeAvailable = availableDocumentTypes.some(opt => opt.value === documentType);
       if (!isCurrentTypeAvailable) {
           setDocumentType(availableDocumentTypes[0].value);
       }
    }
  }, [availableDocumentTypes, documentType]);

  const notifyUpdate = () => {
    new BroadcastChannel("processo-update").postMessage("update");
  };

  useEffect(() => {
    const fetchProcesso = async () => {
      try {
        const res = await api.get<Processo>(`processos/${id}/`);
        setProcesso(res.data);
      } catch (err) {
        toast.error(
          "Falha ao carregar o processo. Verifique se ele existe e se você tem permissão."
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProcesso();
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > MAX_FILE_SIZE) {
        toast.error(
          "O arquivo excede o limite de 10MB e não pode ser enviado."
        );
        setSelectedFile(null);
        e.target.value = "";
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Por favor, selecione um arquivo.");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("document_type", documentType);

    try {
      const res = await api.post<Arquivo>(`/processos/${id}/upload/`, formData);
      setProcesso((prev) =>
        prev ? { ...prev, arquivos: [...prev.arquivos, res.data] } : null
      );
      toast.success("Arquivo enviado com sucesso!");
      setSelectedFile(null);
      notifyUpdate();
    } catch (err: any) {
      if (err.response && err.response.status === 413) {
        toast.error("O arquivo é muito grande. O limite é 10MB.");
      } else {
        toast.error("Falha no upload. Tente novamente.");
      }
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newStatus = e.target.value;
    if (!processo) return;

    const oldStatus = processo.status;
    setProcesso((prev) => (prev ? { ...prev, status: newStatus } : null));

    setUpdatingStatus(true);
    try {
      await api.patch(`processos/${id}/`, { status: newStatus });
      setProcesso((prev) => (prev ? { ...prev, status: newStatus } : null));
      toast.success("Status atualizado com sucesso!");
      notifyUpdate();
    } catch (err) {
      toast.error("Falha ao atualizar o status.");
      console.error(err);
      setProcesso((prev) => (prev ? { ...prev, status: oldStatus } : null));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openDeleteModal = (arquivo: Arquivo) => {
    setFileToDelete(arquivo);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setFileToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      await api.delete(`arquivos/${fileToDelete.id}/`);

      setProcesso((prev) =>
        prev
          ? {
              ...prev,
              arquivos: prev.arquivos.filter((a) => a.id !== fileToDelete.id),
            }
          : null
      );
      toast.success("Arquivo excluído com sucesso!");
      notifyUpdate();
    } catch (err) {
      toast.error("Falha ao excluir o arquivo. Tente novamente.");
      console.error(err);
    } finally {
      closeDeleteModal();
    }
  };

  const handleDeleteProcess = async () => {
    if (!processo) return;
    setIsDeletingProcess(true);
    try {
      await api.delete(`/processos/${processo.id}/`);
      toast.success("Processo excluído com sucesso!");
      navigate("/processos");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erro ao excluir processo.");
      setIsDeletingProcess(false);
      setIsDeleteProcessModalOpen(false);
    }
  };

  if (loading) return <ProcessoDetailSkeleton />;
  if (!processo)
    return <p className="not-found-message">Processo não encontrado.</p>;

  const currentUserLevel = ROLE_HIERARCHY[user?.role || ""] || 0;
  const processoCreatorLevel = ROLE_HIERARCHY[processo.criado_por_role] || 0;

  const canUpload =
    (user?.is_superuser || (user?.permissions?.can_upload_file ?? false)) && availableDocumentTypes.length > 0;
  
  // Helper for download permissions
  const getCanDownloadFile = (docType: string) => {
      if (user?.is_superuser || user?.role === "dev") return true;
      // Fallback to generic if specific not set (optional, but sticking to granular as requested)
      // Actually, let's check granular first.
      if (docType === "processo") return user?.permissions?.can_download_processo ?? false;
      if (docType === "nota_fiscal") return user?.permissions?.can_download_nota_fiscal ?? false;
      if (docType === "boletos") return user?.permissions?.can_download_boletos ?? false;
      
      // Fallback to generic permission if the doc type is unknown or unset
      return user?.permissions?.can_download_file ?? false;
  };

  const canDeleteFile = (file: Arquivo): boolean => {
    if (!user) return false;
    if (user.role === "dev") return true;
    if (!user.permissions?.can_delete_file) return false;

    const fileCreatorLevel = ROLE_HIERARCHY[file.criado_por_role] || 0;
    return currentUserLevel >= fileCreatorLevel;
  };

  const canDeleteProcess = (() => {
    if (!user) return false;
    if (user.role === "dev") return true;
    if (!user.permissions?.can_delete_processo) return false;
    return currentUserLevel >= processoCreatorLevel;
  })();

  const canChangeStatus = (() => {
    if (!user) return false;
    if (user.role === "dev") return true;
    if (!user.permissions?.can_change_status) return false;
    return currentUserLevel >= processoCreatorLevel;
  })();

  const canViewHistory =
    user?.is_superuser ||
    user?.role === "dev" ||
    // @ts-ignore
    (user?.permissions?.view_status_history ?? false);

  const allowedStatuses = (() => {
    if (!user || !processo) return [];

    let statuses = user.is_superuser
      ? STATUS_OPTIONS
      : STATUS_OPTIONS.filter(
          (option) =>
            user.permissions?.status_limits?.[
              option.value as keyof typeof user.permissions.status_limits
            ] ?? false
        );

    const currentStatusInList = statuses.some(
      (s) => s.value === processo.status
    );

    if (!currentStatusInList) {
      const currentStatusOption = STATUS_OPTIONS.find(
        (s) => s.value === processo.status
      );
      if (currentStatusOption) {
        statuses = [...statuses, currentStatusOption];
      }
    }

    return statuses;
  })();

  const filteredArquivos = processo
    ? processo.arquivos.filter((arquivo) => {
        const lowerCaseSearchTerm = fileSearchTerm.toLowerCase();
        const formattedDate = new Date(arquivo.data_upload).toLocaleString(
          "pt-BR",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }
        );

        return (
          arquivo.nome_atual.toLowerCase().includes(lowerCaseSearchTerm) ||
          arquivo.criado_por.toLowerCase().includes(lowerCaseSearchTerm) ||
          formattedDate.includes(lowerCaseSearchTerm)
        );
      })
    : [];

  return (
    <div className="processo-detail-page page-container">
      <header className="processo-detail-header">
        <div className="header-title">
          <FileText size={28} />
          <h1>{processo.nome}</h1>
        </div>

        <div className="header-actions">
          <Link to="/processos" className="back-link">
            <ArrowLeft size={18} />
            Voltar para a lista
          </Link>
        </div>
      </header>

      <div className="processo-detail-grid">
        <div className="processo-detail-col-left">
          <div className="detail-card">
            <div className="detail-card__grid">
              <div className="detail-card__item">
                <span className="detail-card__label">CRDII</span>
                <span className="detail-card__value">
                  <Folder size={16} />
                  {processo.crdii_nome || "N/A"}
                </span>
              </div>
              <div className="detail-card__item">
                <span className="detail-card__label">Status</span>
                <StatusSelector
                  status={processo.status}
                  updating={updatingStatus}
                  allowedStatuses={allowedStatuses}
                  onChange={
                    canChangeStatus
                      ? handleStatusChange
                      : () =>
                          toast.error(
                            "Você não tem permissão para alterar o status."
                          )
                  }
                />
              </div>
              <div className="detail-card__item">
                <span className="detail-card__label">Criado por</span>
                <span className="detail-card__value">
                  {processo.criado_por}
                </span>
              </div>
              <div className="detail-card__item">
                <span className="detail-card__label">Data criação</span>
                <span className="detail-card__value">
                  {new Date(processo.data_criacao).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="detail-card__item detail-card__item--full-width">
                {canViewHistory && (
                  <button
                    className="btn-history"
                    onClick={() => setIsHistoryModalOpen(true)}
                  >
                    <BookOpen size={16} />
                    Ver Histórico de Status
                  </button>
                )}
              </div>
              {canDeleteProcess && (
                <div className="btn_excluirprocesso">
                  <button
                    className="btn btn-danger "
                    onClick={() => setIsDeleteProcessModalOpen(true)}
                    title="Excluir Processo Inteiro"
                  >
                    <Trash2 size={18} />
                    Excluir Processo
                  </button>
                </div>
              )}
            </div>
          </div>

          {canUpload && (
            <div className="upload-section">
              <div className="upload-section-content">
                <h4 className="upload-section__title">
                  Fazer Upload de Novo Arquivo
                </h4>

                <form onSubmit={handleUpload} className="upload-form">
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label htmlFor="document-type">Tipo de Documento</label>
                    <select
                      id="document-type"
                      className="form-input"
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      disabled={uploading}
                    >
                      {availableDocumentTypes.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label htmlFor="file-upload" className="upload-form__label">
                    <Upload size={18} />
                    <span>
                      {selectedFile ? selectedFile.name : "Escolher arquivo"}
                    </span>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  <button
                    type="submit"
                    className="upload-form__submit"
                    disabled={!selectedFile || uploading}
                  >
                    {uploading ? "Enviando..." : "Enviar"}
                  </button>
                </form>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--color-text-secondary)",
                    marginTop: "0.5rem",
                  }}
                >
                  Tamanho máximo permitido: 10MB.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="processo-detail-col-right">
          <div className="files__header">
            <h4 className="files__title">Arquivos do Processo</h4>
            <div className="files__search-bar">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar por nome do arquivo, usuário ou data..."
                value={fileSearchTerm}
                onChange={(e) => setFileSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {filteredArquivos.length > 0 ? (
            <ul className="files__list">
              {filteredArquivos.map((arquivo) => (
                <li key={arquivo.id} className="files__item">
                  <File size={20} className="files__icon" />
                  <div className="files__info">
                    {/* Botão que abre o modal em vez de link direto */}
                    <button
                      onClick={() => setPreviewFile(arquivo)}
                      className="files__link-btn"
                    >
                      {arquivo.nome_atual}
                    </button>
                    <div className="files__metadata">
                      <span className="files__meta-item">
                        <User size={12} />
                        {arquivo.criado_por}
                      </span>
                      <span className="files__meta-item">
                        <FileText size={12} />
                         {DOCUMENT_TYPE_OPTIONS.find(opt => opt.value === arquivo.document_type)?.label || "Documento"}
                      </span>
                      <span className="files__meta-item">
                        <Calendar size={12} />
                        {new Date(arquivo.data_upload).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  {canDeleteFile(arquivo) && (
                    <button
                      onClick={() => openDeleteModal(arquivo)}
                      className="files__delete-btn"
                      title="Excluir arquivo"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="files__empty-message">
              {processo.arquivos.length > 0
                ? "Nenhum arquivo encontrado com este nome."
                : "Nenhum arquivo neste processo."}
            </p>
          )}
        </div>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteFile}
        title="Confirmar Exclusão"
      >
        <p>Você tem certeza que deseja excluir o arquivo</p>
        <strong>{fileToDelete?.nome_atual}</strong>?
        <p>Esta ação não pode ser desfeita.</p>
      </Modal>

      <Modal
        isOpen={isDeleteProcessModalOpen}
        onClose={() => setIsDeleteProcessModalOpen(false)}
        onConfirm={handleDeleteProcess}
        title="Excluir Processo"
      >
        <div className="delete-process-modal__header">
          <Trash2 size={48} className="delete-process-modal__icon" />
          <h3>Tem certeza absoluta?</h3>
        </div>
        <p className="delete-process-modal__text">
          Você está prestes a excluir o processo{" "}
          <strong>{processo.nome}</strong>.
        </p>
        <p className="delete-process-modal__warning">
          Isso apagará todos os {processo.arquivos.length} arquivos vinculados
          do sistema e do disco.
        </p>
      </Modal>

      {/* Modal de Preview */}
      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.arquivo_url}
          fileName={previewFile.nome_atual}
          canDownload={getCanDownloadFile(previewFile.document_type)}
        />
      )}

      {processo && (
        <StatusHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          processoId={processo.id}
        />
      )}
    </div>
  );
};

export default ProcessoDetail;