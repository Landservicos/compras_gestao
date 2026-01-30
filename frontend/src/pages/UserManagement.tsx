import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { Users, PlusCircle, Pencil as Edit, Trash2, Search, Lock, Filter, X } from "lucide-react";
import "../styles/userManagement.css";
import "../styles/userForm.css";
import "../styles/processos.css"; // Reutilizar estilos de filtro
import UserForm from "../components/UserForm";
import { useAuth } from "../hooks/useAuth";
import Modal from "../components/Modal";
import UserManagementSkeleton from "../components/UserManagementSkeleton";

// --- Tipagem de Dados ---
interface CRDII {
  id: number;
  nome: string;
}

interface Tenant {
  id: number;
  nome: string;
  domain?: string;
}

export interface ManagedUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role:
    | "administrador"
    | "compras"
    | "obra"
    | "financeiro"
    | "dev"
    | "gestor"
    | "diretoria";
  is_active: boolean;
}

export interface StatusLimits {
  nao_concluido: boolean;
  parcial: boolean;
  concluido: boolean;
  arquivado: boolean;
  cancelado: boolean;
}

export interface RelatoriosPermissions {
  geral: boolean;
  financeiro: boolean;
}

export interface GerenciarPermissions {
  usuarios: boolean;
  empresas: boolean;
  crdiis: boolean;
}

export type PermissionSet = {
  page_dashboard: boolean;
  page_compras: boolean;
  gerenciar: GerenciarPermissions;
  relatorios: RelatoriosPermissions;
  can_create_processo: boolean;
  can_edit_processo: boolean;
  can_delete_processo: boolean;
  can_change_status: boolean;
  can_upload_file: boolean;
  can_download_file: boolean;
  can_delete_file: boolean;
  can_upload_processo: boolean;
  can_upload_nota_fiscal: boolean;
  can_upload_boletos: boolean;
  can_download_processo: boolean;
  can_download_nota_fiscal: boolean;
  can_download_boletos: boolean;
  can_edit_user: boolean;
  can_delete_user: boolean;
  can_create_tenant: boolean;
  status_limits: StatusLimits;
  allowed_crdii: number[];
  allowed_tenants: number[];
  view_status_history: boolean;
};

const ROLE_HIERARCHY = {
  dev: 100,
  diretoria: 90,
  gestor: 90,
  administrador: 70,
  financeiro: 60,
  compras: 50,
  obra: 10,
};

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  administrador: "Admin",
  compras: "Compras",
  obra: "Obra",
  financeiro: "Financeiro",
  gestor: "Gestor",
  diretoria: "Diretoria",
  dev: "Desenvolvedor",
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // --- Filtros ---
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [userForPermissions, setUserForPermissions] =
    useState<ManagedUser | null>(null);
  const [permissions, setPermissions] = useState<Partial<PermissionSet>>({});
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(false);

  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  const [allCrdiis, setAllCrdiis] = useState<CRDII[]>([]);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);

  const { user: currentUser } = useAuth();

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("");
    setStatusFilter("");
  };

  if (!currentUser?.permissions?.gerenciar?.usuarios) {
    return (
      <div className="user-management-container page-container">
        <h1>Acesso Negado</h1>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  const [isSaving, setIsSaving] = useState(false);
  const defaultPermissions: PermissionSet = {
    page_dashboard: false,
    page_compras: false,
    gerenciar: {
      usuarios: false,
      empresas: false,
      crdiis: false,
    },
    relatorios: {
      geral: false,
      financeiro: false,
    },
    can_create_processo: false,
    can_edit_processo: false,
    can_delete_processo: false,
    can_change_status: false,
    can_upload_file: false,
    can_download_file: false,
    can_delete_file: false,
    can_upload_processo: false,
    can_upload_nota_fiscal: false,
    can_upload_boletos: false,
    can_download_processo: false,
    can_download_nota_fiscal: false,
    can_download_boletos: false,
    can_edit_user: false,
    can_delete_user: false,
    can_create_tenant: false,
    status_limits: {
      nao_concluido: false,
      parcial: false,
      concluido: false,
      arquivado: false,
      cancelado: false,
    },
    allowed_crdii: [],
    allowed_tenants: [],
    view_status_history: false,
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<ManagedUser[]>("/auth/users/");
      setUsers(response.data);
    } catch (error) {
      // Erros tratados globalmente ou ignorados se for redirect
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    const fetchCrdiis = async () => {
      try {
        const response = await api.get<CRDII[]>("/crdiis/");
        setAllCrdiis(response.data);
      } catch (error) {
        toast.error("Falha ao carregar a lista de CRDIIs.");
      }
    };
    const fetchTenants = async () => {
      try {
        const response = await api.get<Tenant[]>("/tenants/");
        setAllTenants(response.data);
      } catch (error) {
        toast.error("Falha ao carregar a lista de Empresas.");
      }
    };
    fetchCrdiis();
    fetchTenants();
  }, [fetchUsers, currentUser]);

  const handleRoleChange = async (
    userId: number,
    newRole: ManagedUser["role"]
  ) => {
    const previousUsers = [...users];
    // Atualização Otimista: muda na tela imediatamente
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));

    try {
      await api.patch(`/auth/users/${userId}/`, { role: newRole });
      toast.success("Tipo do usuário atualizado!");
    } catch (error) {
      toast.error("Falha ao atualizar o tipo.");
      setUsers(previousUsers); // Reverte em caso de erro
    }
  };

  const handleStatusChange = async (userId: number, newStatus: boolean) => {
    const previousUsers = [...users];
    // Atualização Otimista
    setUsers(
      users.map((u) => (u.id === userId ? { ...u, is_active: newStatus } : u))
    );
    try {
      await api.patch(`/auth/users/${userId}/`, { is_active: newStatus });
      toast.success("Status do usuário atualizado!");
    } catch (error) {
      toast.error("Falha ao atualizar o status.");
      setUsers(previousUsers); // Reverte em caso de erro
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user: ManagedUser) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const openDeleteModal = (user: ManagedUser) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setUserToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/auth/users/${userToDelete.id}/`);
      toast.success(`Usuário ${userToDelete.username} excluído com sucesso!`);
      await fetchUsers();
    } catch (error: any) {
      if (error.response && error.response.status === 403) {
        toast.error(error.response.data.detail || "Sem permissão.");
      } else {
        toast.error("Falha ao excluir o usuário.");
      }
    } finally {
      closeDeleteModal();
    }
  };

  const openPermissionsModal = async (user: ManagedUser) => {
    setUserForPermissions(user);
    setIsPermissionsModalOpen(true);
    setIsPermissionsLoading(true);
    try {
      const response = await api.get(`/auth/users/${user.id}/permissions/`);
      const loadedPermissions = response.data || {};
      const newPermissions: PermissionSet = JSON.parse(
        JSON.stringify(defaultPermissions)
      );

      for (const key in loadedPermissions) {
        const permKey = key as keyof PermissionSet;
        if (
          permKey === "status_limits" &&
          typeof loadedPermissions.status_limits === "object"
        ) {
          Object.assign(
            newPermissions.status_limits,
            loadedPermissions.status_limits
          );
        } else if (
          permKey === "relatorios" &&
          typeof loadedPermissions.relatorios === "object"
        ) {
          Object.assign(
            newPermissions.relatorios,
            loadedPermissions.relatorios
          );
        } else if (
          permKey === "gerenciar" &&
          typeof loadedPermissions.gerenciar === "object"
        ) {
          Object.assign(newPermissions.gerenciar, loadedPermissions.gerenciar);
        } else if (permKey in newPermissions) {
          (newPermissions[permKey] as any) = loadedPermissions[permKey];
        }
      }
      // Adicionando carregamento para permissões de upload/download por tipo
      newPermissions.can_upload_processo = loadedPermissions.can_upload_processo ?? false;
      newPermissions.can_upload_nota_fiscal = loadedPermissions.can_upload_nota_fiscal ?? false;
      newPermissions.can_upload_boletos = loadedPermissions.can_upload_boletos ?? false;
      newPermissions.can_download_processo = loadedPermissions.can_download_processo ?? false;
      newPermissions.can_download_nota_fiscal = loadedPermissions.can_download_nota_fiscal ?? false;
      newPermissions.can_download_boletos = loadedPermissions.can_download_boletos ?? false;
      
      newPermissions.allowed_crdii = Array.isArray(
        loadedPermissions.allowed_crdii
      )
        ? loadedPermissions.allowed_crdii
        : [];
      newPermissions.allowed_tenants = Array.isArray(
        loadedPermissions.allowed_tenants
      )
        ? loadedPermissions.allowed_tenants
        : [];
      setPermissions(newPermissions);
    } catch (error) {
      toast.error("Falha ao carregar as permissões.");
      setPermissions(defaultPermissions);
    } finally {
      setIsPermissionsLoading(false);
    }
  };

  const closePermissionsModal = () => {
    setUserForPermissions(null);
    setIsPermissionsModalOpen(false);
    setPermissions({});
  };

  const handlePermissionChange = (
    key: keyof Omit<
      PermissionSet,
      | "status_limits"
      | "allowed_crdii"
      | "allowed_tenants"
      | "relatorios"
      | "gerenciar"
    >,
    value: boolean
  ) => {
    setPermissions((prev) => ({ ...prev, [key]: value }));
  };

  const handleGerenciarPermissionChange = (
    key: keyof GerenciarPermissions,
    value: boolean
  ) => {
    setPermissions((prev) => ({
      ...prev,
      gerenciar: {
        ...(prev.gerenciar || defaultPermissions.gerenciar),
        [key]: value,
      },
    }));
  };

  const handleRelatorioPermissionChange = (
    key: keyof RelatoriosPermissions,
    value: boolean
  ) => {
    setPermissions((prev) => ({
      ...prev,
      relatorios: {
        ...(prev.relatorios || defaultPermissions.relatorios),
        [key]: value,
      },
    }));
  };

  const handleStatusLimitChange = (key: keyof StatusLimits, value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      status_limits: {
        ...(prev.status_limits || defaultPermissions.status_limits),
        [key]: value,
      },
    }));
  };

  const handleCrdiiPermissionChange = (crdiiId: number, isChecked: boolean) => {
    setPermissions((prev) => {
      const currentCrdii = prev.allowed_crdii || [];
      const newAllowedCrdii = isChecked
        ? [...currentCrdii, crdiiId]
        : currentCrdii.filter((id) => id !== crdiiId);
      return { ...prev, allowed_crdii: newAllowedCrdii };
    });
  };

  const handleTenantPermissionChange = (
    tenantId: number,
    isChecked: boolean
  ) => {
    setPermissions((prev) => {
      const currentTenants = prev.allowed_tenants || [];
      const newAllowedTenants = isChecked
        ? [...currentTenants, tenantId]
        : currentTenants.filter((id) => id !== tenantId);
      return { ...prev, allowed_tenants: newAllowedTenants };
    });
  };

  const handleSelectAllPermissions = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const isChecked = e.target.checked;
    const newPermissions: PermissionSet = {
      page_dashboard: isChecked,
      page_compras: isChecked,
      gerenciar: {
        usuarios: isChecked,
        empresas: isChecked,
        crdiis: isChecked,
      },
      relatorios: {
        geral: isChecked,
        financeiro: isChecked,
      },
      can_create_processo: isChecked,
      can_edit_processo: isChecked,
      can_delete_processo: isChecked,
      can_change_status: isChecked,
      can_upload_file: isChecked,
      can_download_file: isChecked,
      can_delete_file: isChecked,
      can_upload_processo: isChecked,
      can_upload_nota_fiscal: isChecked,
      can_upload_boletos: isChecked,
      can_download_processo: isChecked,
      can_download_nota_fiscal: isChecked,
      can_download_boletos: isChecked,
      can_edit_user: isChecked,
      can_delete_user: isChecked,
      can_create_tenant: isChecked,
      status_limits: {
        nao_concluido: isChecked,
        parcial: isChecked,
        concluido: isChecked,
        arquivado: isChecked,
        cancelado: isChecked,
      },
      allowed_crdii: isChecked ? allCrdiis.map((c) => c.id) : [],
      allowed_tenants: isChecked ? allTenants.map((t) => t.id) : [],
      view_status_history: isChecked,
    };
    setPermissions(newPermissions);
  };

  const handleSavePermissions = async () => {
    if (!userForPermissions) return;
    setIsSavingPermissions(true); // Ativa o loading
    try {
      await api.put(`/auth/users/${userForPermissions.id}/permissions/`, {
        permissions: permissions,
      });
      toast.success("Permissões salvas com sucesso!");
      closePermissionsModal();
    } catch (error) {
      toast.error("Falha ao salvar as permissões.");
    } finally {
      setIsSavingPermissions(false); // Desativa o loading
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSave = async (userData: Partial<ManagedUser>) => {
    setIsSaving(true);
    try {
      const payload = {
        ...userData,
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
      };

      if (editingUser) {
        await api.patch<ManagedUser>(`/auth/users/${editingUser.id}/`, payload);
        toast.success("Usuário atualizado!");
      } else {
        await api.post<ManagedUser>("/auth/users/", payload);
        toast.success("Usuário criado!");
      }
      handleModalClose();
      await fetchUsers();
    } catch (error: any) {
      toast.error("Erro ao salvar usuário.");
    } finally {
      setIsSaving(false);
    }
  };

  const visibleUsers = useMemo(() => {
    if (!currentUser) return [];
    const currentUserLevel =
      ROLE_HIERARCHY[currentUser.role as keyof typeof ROLE_HIERARCHY] || 0;
    if (currentUser.role === "dev") return users;
    return users.filter((user) => {
      if (user.role === "dev") return false;
      const targetUserLevel =
        ROLE_HIERARCHY[user.role as keyof typeof ROLE_HIERARCHY] || 0;
      return targetUserLevel <= currentUserLevel;
    });
  }, [users, currentUser]);

  const filteredUsers = visibleUsers.filter(
    (user) => {
      const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter ? user.role === roleFilter : true;
      const matchesStatus = statusFilter ? (statusFilter === 'active' ? user.is_active : !user.is_active) : true;

      return matchesSearch && matchesRole && matchesStatus;
    }
  );

  const availableRoles = useMemo(() => {
    if (!currentUser) return [];
    const currentUserLevel =
      ROLE_HIERARCHY[currentUser.role as keyof typeof ROLE_HIERARCHY] || 0;
    return Object.entries(ROLE_HIERARCHY)
      .filter(([role, level]) => {
        if (currentUser.role !== "dev" && role === "dev") return false;
        if (
          currentUser.role === "administrador" &&
          (role === "gestor" || role === "diretoria")
        )
          return false;
        return level <= currentUserLevel;
      })
      .sort(([, levelA], [, levelB]) => levelB - levelA)
      .map(([role]) => role);
  }, [currentUser]);

  const canManageUser = (
    currentUser: any,
    targetUser: ManagedUser
  ): boolean => {
    if (!currentUser) return false;
    if (currentUser.id === targetUser.id) return false;
    if (currentUser.is_superuser || currentUser.role === "dev") return true;
    if (targetUser.role === "dev") return false;
    const currentUserLevel =
      ROLE_HIERARCHY[currentUser.role as keyof typeof ROLE_HIERARCHY] || 0;
    const targetUserLevel =
      ROLE_HIERARCHY[targetUser.role as keyof typeof ROLE_HIERARCHY] || 0;
    if (targetUserLevel > currentUserLevel) return false;
    return currentUser.permissions?.can_edit_user || false;
  };

  if (loading) return <UserManagementSkeleton />;

  return (
    <div className="user-management-container page-container">
      <header className="user-management-header">
        <div className="header-title">
          <Users size={28} />
          <h1>Gerenciamento de Usuários</h1>
        </div>
        <div className="header-actions">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar usuarios..."
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

          <button className="btn btn-primary" onClick={handleCreateUser}>
            <PlusCircle size={20} />
            Novo Usuário
          </button>
        </div>
      </header>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filtrar por Cargo"
            >
              <option value="">Todos os Cargos</option>
              {availableRoles.map((role) => (
                 <option key={role} value={role}>{ROLE_DISPLAY_NAMES[role]}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por Status"
            >
              <option value="">Todos os Status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
          
          <button className="btn-clear-filters" onClick={clearFilters}>
            <X size={16} /> Limpar Filtros
          </button>
        </div>
      )}

      {(roleFilter || statusFilter) && (
        <div className="active-filters-badges" style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {roleFilter && <span className="badge">Cargo: {ROLE_DISPLAY_NAMES[roleFilter] || roleFilter}</span>}
            {statusFilter && <span className="badge">Status: {statusFilter === 'active' ? 'Ativo' : 'Inativo'}</span>}
        </div>
      )}

      <div className="user-list">
        <table className="user-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>E-mail</th>
              <th>Nome Completo</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Permissão</th>
              <th>Editar</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-results-cell">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const isAllowed = canManageUser(currentUser, user);
                const disabledTitle = "Sem permissão";

                return (
                  <tr key={user.id}>
                    <td data-label="Usuário">{user.username}</td>
                    <td data-label="E-mail">{user.email}</td>
                    <td data-label="Nome">
                      {user.first_name} {user.last_name}
                    </td>
                    <td data-label="Tipo">
                      <div className="role-selector-wrapper">
                        <select
                          title="Alterar Tipo de Usuário"
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(
                              user.id,
                              e.target.value as ManagedUser["role"]
                            )
                          }
                          disabled={!isAllowed || isSaving}
                          className={`role-select role-${user.role}`}
                        >
                          {!availableRoles.includes(user.role) && (
                            <option value={user.role}>{user.role}</option>
                          )}
                          {availableRoles.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_DISPLAY_NAMES[role]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td data-label="Status">
                      <div className="status-toggle-wrapper">
                        <label className="switch" title="Alterar Status">
                          <input
                            title="Alterar Status do Usuário"
                            type="checkbox"
                            checked={user.is_active}
                            onChange={(e) =>
                              handleStatusChange(user.id, e.target.checked)
                            }
                            disabled={!isAllowed || isSaving}
                          />
                          <span className="slider round"></span>
                        </label>
                        <span
                          className={`status-text status-${user.is_active ? "active" : "inactive"}`}
                        >
                          {user.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </td>
                    <td data-label="Permissão">
                      <button
                        className="btn btn-icon btn-tertiary"
                        title={!isAllowed ? disabledTitle : "Permissões"}
                        onClick={() => openPermissionsModal(user)}
                        disabled={!isAllowed || isSaving}
                      >
                        <Lock size={16} />
                      </button>
                    </td>
                    <td data-label="Ações">
                      <div className="user-actions">
                        <button
                          className="btn btn-icon btn-secondary"
                          title="Editar"
                          onClick={() => handleEditUser(user)}
                          disabled={!isAllowed || isSaving}
                        >
                          <Edit size={16} />
                        </button>
                        {(currentUser?.is_superuser ||
                          currentUser?.permissions?.can_delete_user) && (
                          <button
                            className="btn btn-icon btn-danger"
                            title="Excluir"
                            onClick={() => openDeleteModal(user)}
                            disabled={!isAllowed || isSaving}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal
        title={editingUser ? "Editar" : "Criar Usuário"}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        showFooter={false}
      >
        <UserForm
          initialData={editingUser}
          onSave={handleSave}
          onCancel={handleModalClose}
          loading={isSaving}
          availableRoles={availableRoles}
          roleDisplayNames={ROLE_DISPLAY_NAMES}
        />
      </Modal>

      <Modal
        title="Confirmar Exclusão"
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        showFooter={false}
      >
        <div className="delete-modal-content">
          <p>
            Deseja excluir <strong>{userToDelete?.username}</strong>?
          </p>
          <div className="form-footer">
            <button className="btn btn-secondary" onClick={closeDeleteModal}>
              Cancelar
            </button>
            <button className="btn btn-danger" onClick={confirmDeleteUser}>
              Excluir
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        title={`Permissões: ${userForPermissions?.username}`}
        isOpen={isPermissionsModalOpen}
        onClose={closePermissionsModal}
        showFooter={false}
        resizable={true}
      >
        {isPermissionsLoading ? (
          <p>Carregando...</p>
        ) : (
          <div className="permissions-modal-content">
            <div className="permissions-select-all">
              <label>
                <input type="checkbox" onChange={handleSelectAllPermissions} />
                <strong>Selecionar Todos</strong>
              </label>
            </div>
            <div className="permissions-grid">
              <div className="permissions-category">
                <h4>Páginas</h4>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.page_dashboard || false}
                    onChange={(e) =>
                      handlePermissionChange("page_dashboard", e.target.checked)
                    }
                  />{" "}
                  Dashboard
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.page_compras || false}
                    onChange={(e) =>
                      handlePermissionChange("page_compras", e.target.checked)
                    }
                  />{" "}
                  Processos
                </label>
              </div>

              <div className="permissions-category">
                <h4>Gerenciar</h4>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.gerenciar?.usuarios || false}
                    onChange={(e) =>
                      handleGerenciarPermissionChange(
                        "usuarios",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Gerenciar Usuários
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.gerenciar?.empresas || false}
                    onChange={(e) =>
                      handleGerenciarPermissionChange(
                        "empresas",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Gerenciar Empresas
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.gerenciar?.crdiis || false}
                    onChange={(e) =>
                      handleGerenciarPermissionChange(
                        "crdiis",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Gerenciar CRDIIs
                </label>
              </div>
                      
              <div className="permissions-category">
                <h4>Relatórios</h4>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.relatorios?.geral || false}
                    onChange={(e) =>
                      handleRelatorioPermissionChange("geral", e.target.checked)
                    }
                  />{" "}
                  Geral
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.relatorios?.financeiro || false}
                    onChange={(e) =>
                      handleRelatorioPermissionChange(
                        "financeiro",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Financeiro
                </label>
              </div>

              <div className="permissions-category">
                <h4>Recursos</h4>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.can_create_processo || false}
                    onChange={(e) =>
                      handlePermissionChange(
                        "can_create_processo",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Criar Processo
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.can_edit_processo || false}
                    onChange={(e) =>
                      handlePermissionChange(
                        "can_edit_processo",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Editar Processo
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.can_delete_processo || false}
                    onChange={(e) =>
                      handlePermissionChange(
                        "can_delete_processo",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Excluir Processo
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.can_upload_file || false}
                    onChange={(e) =>
                      handlePermissionChange(
                        "can_upload_file",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Upload Geral
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.can_download_file || false}
                    onChange={(e) =>
                      handlePermissionChange(
                        "can_download_file",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Download Geral
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.can_delete_file || false}
                    onChange={(e) =>
                      handlePermissionChange(
                        "can_delete_file",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Excluir Arquivo
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.can_change_status || false}
                    onChange={(e) =>
                      handlePermissionChange(
                        "can_change_status",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Alterar Status
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.can_edit_user || false}
                    onChange={(e) =>
                      handlePermissionChange("can_edit_user", e.target.checked)
                    }
                  />{" "}
                  Editar Usuários
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.can_delete_user || false}
                    onChange={(e) =>
                      handlePermissionChange(
                        "can_delete_user",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Excluir Usuário
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.can_create_tenant || false}
                    onChange={(e) =>
                      handlePermissionChange(
                        "can_create_tenant",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Criar Empresa
                </label>
              </div>

              <div className="permissions-category">
                <h4>Permissões de Arquivo por Tipo</h4>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.can_upload_processo || false}
                    onChange={(e) =>
                      handlePermissionChange(
                        "can_upload_processo",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Upload (Processo)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.can_download_processo || false}
                    onChange={(e) =>
                      handlePermissionChange(
                        "can_download_processo",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Download (Processo)
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={permissions.can_upload_nota_fiscal || false}
                    onChange={(e) =>
                      handlePermissionChange(
                        "can_upload_nota_fiscal",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Upload (Notas)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.can_download_nota_fiscal || false}
                    onChange={(e) =>
                      handlePermissionChange(
                        "can_download_nota_fiscal",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Download (Notas)
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={permissions.can_upload_boletos || false}
                    onChange={(e) =>
                      handlePermissionChange(
                        "can_upload_boletos",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Upload (Forma de pagamento)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.can_download_boletos || false}
                    onChange={(e) =>
                      handlePermissionChange(
                        "can_download_boletos",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Download (Forma de pagamento)
                </label>
              </div>

              <div className="permissions-category">
                <h4>Limites de Status</h4>
                {Object.keys(defaultPermissions.status_limits).map((key) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={
                        permissions.status_limits?.[
                          key as keyof StatusLimits
                        ] || false
                      }
                      onChange={(e) =>
                        handleStatusLimitChange(
                          key as keyof StatusLimits,
                          e.target.checked
                        )
                      }
                    />
                    {key.replace("_", " ")}
                  </label>
                ))}
              </div>

              <div className="permissions-category">
                <h4>CRDIIs Permitidos</h4>
                {allCrdiis.map((c) => (
                  <label key={c.id}>
                    <input
                      type="checkbox"
                      checked={
                        permissions.allowed_crdii?.includes(c.id) || false
                      }
                      onChange={(e) =>
                        handleCrdiiPermissionChange(c.id, e.target.checked)
                      }
                    />
                    {c.nome}
                  </label>
                ))}
              </div>

              <div className="permissions-category">
                <h4>Empresas Permitidas</h4>
                {allTenants.map((t) => (
                  <label key={t.id}>
                    <input
                      type="checkbox"
                      checked={
                        permissions.allowed_tenants?.includes(t.id) || false
                      }
                      onChange={(e) =>
                        handleTenantPermissionChange(t.id, e.target.checked)
                      }
                    />
                    {t.nome}{" "}
                  </label>
                ))}
              </div>

              <div className="permissions-category">
                <h4>Histórico</h4>
                <label>
                  <input
                    type="checkbox"
                    checked={permissions.view_status_history || false}
                    onChange={(e) =>
                      handlePermissionChange(
                        "view_status_history",
                        e.target.checked
                      )
                    }
                  />{" "}
                  Ver Histórico
                </label>
              </div>
            </div>

            {/* RESTAURADO: Footer com botão 'Salvando...' */}
            <div className="form-footer">
              <button
                className="btn btn-secondary"
                onClick={closePermissionsModal}
                disabled={isSavingPermissions}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSavePermissions}
                disabled={isSavingPermissions}
              >
                {isSavingPermissions ? "Salvando..." : "Salvar Limites"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;
