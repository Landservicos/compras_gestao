import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { Folder, PlusCircle, Pencil as Edit, Trash2, Search, Filter, X } from "lucide-react";
import "../styles/userManagement.css"; // Reutilizando estilos existentes
import "../styles/processos.css"; // Reutilizar estilos de filtro
import Modal from "../components/Modal";
import { useAuth } from "../hooks/useAuth";
import UserManagementSkeleton from "../components/UserManagementSkeleton";

interface CRDII {
  id: number;
  nome: string;
}

const ManageCRDII: React.FC = () => {
  const [crdiis, setCrdiis] = useState<CRDII[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCRDII, setEditingCRDII] = useState<CRDII | null>(null);
  const [crdiiToDelete, setCrdiiToDelete] = useState<CRDII | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // --- Filtros ---
  const [searchTerm, setSearchTerm] = useState("");
  const [ordering, setOrdering] = useState("nome"); // 'nome' or '-nome'
  const [showFilters, setShowFilters] = useState(false);

  const [nome, setNome] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { user } = useAuth();

  const fetchCRDIIs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<CRDII[]>("/crdiis/");
      setCrdiis(response.data);
    } catch (error) {
      console.error("Erro ao buscar CRDIIs", error);
      toast.error("Não foi possível carregar os CRDIIs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCRDIIs();
  }, [fetchCRDIIs]);

  const handleCreate = () => {
    setEditingCRDII(null);
    setNome("");
    setIsModalOpen(true);
  };

  const handleEdit = (crdii: CRDII) => {
    setEditingCRDII(crdii);
    setNome(crdii.nome);
    setIsModalOpen(true);
  };

  const openDeleteModal = (crdii: CRDII) => {
    setCrdiiToDelete(crdii);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!crdiiToDelete) return;
    try {
      await api.delete(`/crdiis/${crdiiToDelete.id}/`);
      toast.success("CRDII excluído com sucesso!");
      fetchCRDIIs();
    } catch (error: any) {
      // Geralmente CRDIIs vinculados a processos não podem ser excluídos (ProtectedError)
      const msg =
        error.response?.data?.detail ||
        "Erro ao excluir CRDII. Verifique se existem processos vinculados.";
      toast.error(msg);
    } finally {
      setCrdiiToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("O nome é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingCRDII) {
        await api.patch(`/crdiis/${editingCRDII.id}/`, { nome });
        toast.success("CRDII atualizado com sucesso!");
      } else {
        await api.post("/crdiis/", { nome });
        toast.success("CRDII criado com sucesso!");
      }
      setIsModalOpen(false);
      fetchCRDIIs();
    } catch (error: any) {
      const msg =
        error.response?.data?.nome?.[0] ||
        error.response?.data?.detail ||
        "Erro ao salvar CRDII.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCRDIIs = crdiis
    .filter((c) =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (ordering === "nome") {
        return a.nome.localeCompare(b.nome);
      } else {
        return b.nome.localeCompare(a.nome);
      }
    });

  // Verificação de permissão simples baseada em roles conhecidas ou superusuário
  // Ajuste conforme a necessidade exata do cliente.
  const canManage =
    user?.is_superuser ||
    user?.permissions?.gerenciar?.crdiis ||
    (user?.role &&
      ["administrador", "gestor", "diretoria", "dev"].includes(user.role));

  if (!canManage) {
    return (
      <div className="user-management-container page-container">
        <h1>Acesso Negado</h1>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  if (loading) return <UserManagementSkeleton />;

  return (
    <div className="user-management-container page-container">
      <header className="user-management-header">
        <div className="header-title">
          <Folder size={28} />
          <h1>Gerenciar CRDIIs</h1>
        </div>
        <div className="header-actions">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar CRDII..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            className="btn-filter"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            <span>Filtros</span>
          </button>

          <button className="btn btn-primary" onClick={handleCreate}>
            <PlusCircle size={20} />
            Novo CRDII
          </button>
        </div>
      </header>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <select
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
              aria-label="Ordenação"
            >
              <option value="nome">Nome (A-Z)</option>
              <option value="-nome">Nome (Z-A)</option>
            </select>
          </div>
        </div>
      )}

      <div className="user-list">
        <table className="user-table">
          <thead>
            <tr>
              <th className="col-id">ID</th>
              <th>Nome</th>
              <th className="col-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredCRDIIs.length === 0 ? (
              <tr>
                <td colSpan={3} className="no-results-cell">
                  Nenhum CRDII encontrado.
                </td>
              </tr>
            ) : (
              filteredCRDIIs.map((crdii) => (
                <tr key={crdii.id}>
                  <td data-label="ID">{crdii.id}</td>
                  <td data-label="Nome">{crdii.nome}</td>
                  <td data-label="Ações">
                    <div className="user-actions">
                      <button
                        className="btn btn-icon btn-secondary"
                        title="Editar"
                        onClick={() => handleEdit(crdii)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-icon btn-danger"
                        title="Excluir"
                        onClick={() => openDeleteModal(crdii)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Criar/Editar */}
      <Modal
        title={editingCRDII ? "Editar CRDII" : "Novo CRDII"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        showFooter={false}
      >
        <form onSubmit={handleSave} className="tenant-form">
          <div className="form-group">
            <label>Nome do CRDII</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value.toUpperCase())}
              placeholder="Ex: PROJETOS ESPECIAIS"
              required
              autoFocus
            />
          </div>
          <div className="form-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Excluir */}
      <Modal
        title="Confirmar Exclusão"
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        showFooter={false}
      >
        <div className="delete-modal-content">
          <p>
            Deseja excluir o CRDII <strong>{crdiiToDelete?.nome}</strong>?
          </p>
          <p
            className="warning-text"
          >
            Atenção: Não será possível excluir se houver processos vinculados a
            este CRDII.
          </p>
          <div className="form-footer">
            <button
              className="btn btn-secondary"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancelar
            </button>
            <button className="btn btn-danger" onClick={confirmDelete}>
              Excluir
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageCRDII;
