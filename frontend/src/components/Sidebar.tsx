import React, { useState } from "react";
import {
  FileText,
  LogOut,
  FilePlus,
  User,
  Users,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Briefcase,
} from "lucide-react";
import Modal from "./Modal";
import { useAuth } from "../hooks/useAuth";
import { NavLink } from "react-router-dom";
import logo from "../assets/logo.png";
import logoSmall from "../assets/logo-small.png"; // Certifique-se de ter esta imagem ou altere o nome
import "../styles/sidebar.css";

interface SidebarProps {
  isSidebarOpen?: boolean; // Tornar opcional, pois em desktop não será usado
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen }) => {
  const { user, tenant, logout } = useAuth();
  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const toggleSubmenu = (key: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      // Pequeno delay para expandir a sidebar antes de abrir o menu
      setTimeout(() => {
        setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
      }, 50);
    } else {
      setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  return (
    <>
      <aside
        className={`sidebar ${isSidebarOpen ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}
      >
        <div className="logo-container">
          <img
            src={isCollapsed ? logoSmall : logo}
            alt="Logo"
            className="sidebar-logo"
          />
        </div>
        {user && (
          <div
            className="user-info-top"
            data-tooltip={user.username || "Usuário"}
          >
            <User size={20} />
            <span>{user.username || "Carregando..."}</span>
          </div>
        )}

        <nav className="sidebar-nav">
          {/* Link para Criar Processo: visível se for superuser ou tiver a permissão 'can_create_processo' */}
          {(user?.is_superuser || user?.permissions?.can_create_processo) && (
            <NavLink
              to="/processos/novo"
              className="nav-item"
              data-tooltip="Criar Processo"
            >
              <FilePlus size={20} />
              <span>Criar Processo</span>
            </NavLink>
          )}

          {/* Link para Processos: visível se for superuser ou tiver a permissão 'page_compras' */}
          {(user?.is_superuser || user?.permissions?.page_compras) && (
            <NavLink
              to="/processos"
              className="nav-item"
              data-tooltip="Processos"
              end
            >
              <FileText size={20} />
              <span>Processos</span>
            </NavLink>
          )}

          {/* Link para Painel Financeiro: visível se for superuser ou tiver a permissão 'page_financeiro' */}
          {(user?.is_superuser || user?.permissions?.page_dashboard) && (
            <NavLink
              to="/dashboard"
              className="nav-item"
              data-tooltip="Painel Dashboard"
            >
              <BarChart2 size={20} />
              <span>Painel Dashboard</span>
            </NavLink>
          )}

          {user?.is_superuser && (
            <>
              <button
                className={`nav-item submenu-toggle ${openSubmenus["relatorios"] ? "open" : ""}`}
                onClick={() => toggleSubmenu("relatorios")}
                data-tooltip="Relatórios"
              >
                <FileText size={20} />
                <span>Relatórios</span>
                {!isCollapsed && (
                  <ChevronDown
                    size={16}
                    className={`submenu-arrow ${openSubmenus["relatorios"] ? "rotated" : ""}`}
                  />
                )}
              </button>

              {/* Lista de Subitens */}
              <div
                className={`submenu-list ${openSubmenus["relatorios"] && !isCollapsed ? "expanded" : ""}`}
              >
                {(user?.is_superuser ||
                  user?.permissions?.relatorios?.geral) && (
                  <NavLink to="/relatorios/geral" className="nav-item sub-item">
                    <span className="sub-item-dot">•</span>
                    <span>Geral</span>
                  </NavLink>
                )}
                {(user?.is_superuser ||
                  user?.permissions?.relatorios?.financeiro) && (
                  <NavLink
                    to="/relatorios/financeiro"
                    className="nav-item sub-item"
                  >
                    <span className="sub-item-dot">•</span>
                    <span>Financeiro</span>
                  </NavLink>
                )}
              </div>
            </>
          )}

          {/* Link para Gerenciar Usuários: visível se for superuser ou tiver a permissão 'page_admin' ou cargos especificos */}
          {(user?.is_superuser ||
            user?.permissions?.gerenciar?.usuarios ||
            user?.permissions?.gerenciar?.empresas ||
            user?.permissions?.gerenciar?.crdiis) && (
            <>
              <button
                className={`nav-item submenu-toggle ${openSubmenus["admin"] ? "open" : ""}`}
                onClick={() => toggleSubmenu("admin")}
                data-tooltip="Gerenciar"
              >
                <Users size={20} />
                <span>Gerenciar</span>
                {!isCollapsed && (
                  <ChevronDown
                    size={16}
                    className={`submenu-arrow ${openSubmenus["admin"] ? "rotated" : ""}`}
                  />
                )}
              </button>
              <div
                className={`submenu-list ${openSubmenus["admin"] && !isCollapsed ? "expanded" : ""}`}
              >
                {(user?.is_superuser ||
                  user?.permissions?.gerenciar?.usuarios) && (
                  <NavLink
                    to="/gerenciar-usuarios"
                    className="nav-item sub-item"
                    data-tooltip="Gerenciar Usuários"
                  >
                    <span className="sub-item-dot">•</span>
                    <span>Gerenciar Usuários</span>
                  </NavLink>
                )}
                {(user?.is_superuser ||
                  user?.permissions?.gerenciar?.empresas) && (
                  <NavLink
                    to="/gerenciar-empresas"
                    className="nav-item sub-item"
                    data-tooltip="Gerenciar Empresas"
                  >
                    <span className="sub-item-dot">•</span>
                    <span>Gerenciar Empresas</span>
                  </NavLink>
                )}
                {(user?.is_superuser ||
                  user?.permissions?.gerenciar?.crdiis) && (
                  <NavLink
                    to="/gerenciar-crdiis"
                    className="nav-item sub-item"
                    data-tooltip="Gerenciar CRDIIs"
                  >
                    <span className="sub-item-dot">•</span>
                    <span>Gerenciar CRDIIs</span>
                  </NavLink>
                )}
              </div>
            </>
          )}
        </nav>

        {/* Botão de Toggle centralizado na lateral */}
        <button
          className="sidebar-toggle-btn-absolute"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        <div className="sidebar-footer">
          <div className="sidebar-footer-info">
            {/* Exibe o nome da Empresa Logada */}
            <div className="company-info">
              <Briefcase size={18} />
              <span className="company-name">{tenant?.nome || "Empresa"}</span>
            </div>
          </div>
          <button
            onClick={() => setLogoutModalOpen(true)}
            className="logout-btn"
            data-tooltip="Sair"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Modal de Confirmação de Logout */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        title="Confirmar Saída"
        footer={
          <>
            <button
              onClick={() => setLogoutModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>

            <button onClick={logout} className="btn btn-danger">
              Confirmar
            </button>
          </>
        }
      >
        <p>Você tem certeza que deseja sair do sistema?</p>
      </Modal>
    </>
  );
};

export default Sidebar;
