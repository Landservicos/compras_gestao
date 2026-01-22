import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { Briefcase, PlusCircle, Pencil as Edit, Trash2, Search, Globe, Check, Filter, X } from "lucide-react";
import "../styles/userManagement.css"; // Reutilizando estilos
import "../styles/processos.css"; // Reutilizar estilos de filtro
import Modal from "../components/Modal";
import { useAuth } from "../hooks/useAuth";
import UserManagementSkeleton from "../components/UserManagementSkeleton";

// --- Tipagem de Dados ---
interface Tenant {
  id: number;
  nome: string;
  schema_name: string;
  domain_url?: string; // Mantido se for usado em outro lugar, mas o retorno da API é 'domain'
  domain?: string;
  criado_em?: string;
}

const GerenciarEmpresas: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // --- Filtros ---
  const [searchTerm, setSearchTerm] = useState("");
  const [ordering, setOrdering] = useState("-criado_em"); // '-criado_em', 'criado_em', 'nome', '-nome'
  const [showFilters, setShowFilters] = useState(false);

  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantSchema, setNewTenantSchema] = useState("");
  const [newTenantDomain, setNewTenantDomain] = useState("");
  const [isSavingTenant, setIsSavingTenant] = useState(false);

  const { user: currentUser } = useAuth();

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<Tenant[]>("/tenants/");
      setTenants(response.data);
    } catch (error) {
      console.error("Erro ao buscar empresas", error);
      toast.error("Não foi possível carregar as empresas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.is_superuser || currentUser?.permissions?.gerenciar?.empresas) {
      fetchTenants();
    }
  }, [fetchTenants, currentUser]);

  const handleCreateTenant = () => {
    setEditingTenant(null);
    setNewTenantName("");
    setNewTenantSchema("");
    setNewTenantDomain("");
    setIsModalOpen(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setNewTenantName(tenant.nome);
    setNewTenantSchema(tenant.schema_name);
    // O backend retorna 'domain' (leitura), mas usamos 'domain_url' para escrita.
    // Ao editar, preenchemos com o valor de 'domain' recebido.
    setNewTenantDomain(tenant.domain || "");
    setIsModalOpen(true);
  };

  const openDeleteModal = (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteTenant = async () => {
    if (!tenantToDelete) return;
    try {
      await api.delete(`/tenants/${tenantToDelete.id}/`);
      toast.success("Empresa excluída com sucesso!");
      fetchTenants();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Erro ao excluir empresa.");
    } finally {
      setTenantToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

    const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantSchema || !newTenantDomain) {
      toast.error("Preencha todos os campos.");
      return;
    }

    if (newTenantDomain.match(/^https?:\/\//)) {
      toast.error("O domínio não deve conter protocolo (http:// ou https://).");
      return;
    }
    const domainRegex = /^(localhost|[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+)$/;
    if (!domainRegex.test(newTenantDomain)) {
      toast.error(
        "Domínio inválido. Use o formato 'empresa.com.br' ou 'empresa.localhost'."
      );
      return;
    }

    const schemaRegex = /^[a-z0-9_]+$/;
    if (!schemaRegex.test(newTenantSchema)) {
      toast.error(
        "O Schema Name deve conter apenas letras minúsculas, números e sublinhados (sem espaços)."
      );
      return;
    }

    setIsSavingTenant(true);
    try {
      if (editingTenant) {
        await api.patch(`/tenants/${editingTenant.id}/`, {
          nome: newTenantName,
          domain_url: newTenantDomain,
        });
        toast.success("Empresa atualizada com sucesso!");
      } else {
        await api.post("/tenants/", {
          nome: newTenantName,
          domain_url: newTenantDomain,
          schema_name: newTenantSchema,
        });
        toast.success("Empresa criada com sucesso!");
      }
      setIsModalOpen(false);
      fetchTenants();
    } catch (error: any) {
        toast.error(error.response?.data?.detail || "Erro ao salvar empresa.");
    } finally {
      setIsSavingTenant(false);
    }
  };

  const filteredTenants = tenants
    .filter((tenant) =>
      tenant.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.schema_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant.domain || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (ordering === "nome") return a.nome.localeCompare(b.nome);
      if (ordering === "-nome") return b.nome.localeCompare(a.nome);
      if (ordering === "criado_em") {
        return (a.criado_em || "").localeCompare(b.criado_em || "");
      }
      if (ordering === "-criado_em") {
        return (b.criado_em || "").localeCompare(a.criado_em || "");
      }
      return 0;
    });

  if (!currentUser?.permissions?.gerenciar?.empresas) {
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
          <Briefcase size={28} />
          <h1>Gerenciamento de Empresas</h1>
        </div>
        <div className="header-actions">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar empresa..."
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

          <button className="btn btn-primary" onClick={handleCreateTenant}>
            <PlusCircle size={20} />
            Nova Empresa
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
              <option value="-criado_em">Mais recentes</option>
              <option value="criado_em">Mais antigas</option>
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
              <th>ID</th>
              <th>Nome da Empresa</th>
              <th>Schema (URL)</th>
              <th>Domínio</th>
              <th>Data de Criação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-results-cell">
                  Nenhuma empresa encontrada.
                </td>
              </tr>
            ) : (
              filteredTenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td data-label="ID">{tenant.id}</td>
                  <td data-label="Nome">{tenant.nome}</td>
                  <td data-label="Schema">{tenant.schema_name}</td>
                  <td data-label="Domínio">{tenant.domain || "-"}</td>
                  <td data-label="Data">
                    {tenant.criado_em
                      ? new Date(tenant.criado_em).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td data-label="Ações">
                    <div className="user-actions">
                      <button
                        className="btn btn-icon btn-secondary"
                        title="Editar Empresa"
                        onClick={() => handleEditTenant(tenant)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-icon btn-danger"
                        title="Excluir Empresa"
                        onClick={() => openDeleteModal(tenant)}
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

      <Modal
        title={editingTenant ? "Editar Empresa" : "Criar Nova Empresa"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        showFooter={false}
      >
        <form onSubmit={handleSaveTenant} className="tenant-form">
          <div className="form-group">
            <label>Nome da Empresa</label>
            <input
              type="text"
              value={newTenantName}
              onChange={(e) => setNewTenantName(e.target.value)}
              placeholder="Ex: Minha Empresa Ltda"
              required
            />
          </div>
          <div className="form-group">
            <label>Domínio (URL)</label>
             <div className="input-with-icon input-with-icon-wrapper">
                <Globe size={18} color="var(--color-text-secondary)" />
                <input
                    type="text"
                    value={newTenantDomain}
                    onChange={(e) => setNewTenantDomain(e.target.value.toLowerCase())}
                    placeholder="Ex: empresa.localhost ou empresa.com.br"
                    required
                    className="input-flex"
                />
                {newTenantDomain && !newTenantDomain.match(/^https?:\/\//) && /^(localhost|[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+)$/.test(newTenantDomain) && (
                    <Check size={18} color="#10B981" />
                )}
            </div>
            <small className="help-text">
              O domínio que será usado para acessar esta empresa.
            </small>
          </div>
          <div className="form-group">
            <label>Schema Name (URL/Identificador)</label>
            <input
              type="text"
              value={newTenantSchema}
              onChange={(e) => setNewTenantSchema(e.target.value.toLowerCase())}
              placeholder="Ex: minha_empresa"
              required
              disabled={!!editingTenant}
            />
             <small className="help-text">
              Apenas letras minúsculas, números e sublinhados (_). Sem espaços.
            </small>
          </div>
          <div className="form-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSavingTenant}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSavingTenant}>
              {isSavingTenant ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title="Confirmar Exclusão de Empresa"
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        showFooter={false}
      >
        <div className="delete-modal-content">
          <p>Deseja excluir a empresa <strong>{tenantToDelete?.nome}</strong>?</p>
          <p className="warning-text">
            Atenção: Isso pode remover todos os dados associados a esta empresa.
          </p>
          <div className="form-footer">
            <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-danger" onClick={confirmDeleteTenant}>
              Excluir
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GerenciarEmpresas;