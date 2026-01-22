import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "../styles/mainLayout.css";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Modal from "./Modal";

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false); // Começa fechado para mobile
  const {
    isWarningModalOpen,
    countdown,
    resetInactivityTimer,
    continueSession, // Nova função para o botão
    logout, // Função de logout para o novo botão
  } = useAuth();

  // Efeito para adicionar e remover os event listeners
  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll"];

    // Adiciona os listeners para resetar o timer de inatividade
    events.forEach((event) =>
      window.addEventListener(event, resetInactivityTimer),
    );

    // Limpeza: remove os listeners quando o componente é desmontado
    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, resetInactivityTimer),
      );
    };
  }, [resetInactivityTimer]);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={`main-layout ${isSidebarOpen ? "sidebar-is-open" : ""}`}>
      <Sidebar isSidebarOpen={isSidebarOpen} />
      <div className="main-content">
        <Header toggleSidebar={toggleSidebar} />
        <main className="content-area page-container">
          <Outlet /> {/* O conteúdo da rota aninhada será renderizado aqui */}
        </main>
      </div>
      <div
        className={`sidebar-overlay ${isSidebarOpen ? "open" : ""}`}
        onClick={toggleSidebar}
      ></div>

      {/* Modal de Aviso de Inatividade */}
      <Modal
        isOpen={isWarningModalOpen}
        onClose={continueSession} // Clicar fora ou no 'X' também continua a sessão
        title="Sessão prestes a expirar"
        footer={
          <div className="modal-footer-buttons">
            <button onClick={logout} className="btn btn-danger">
              Sair (Logout)
            </button>
            <button onClick={continueSession} className="btn btn-primary">
              Continuar Sessão
            </button>
          </div>
        }
      >
        <p>
          Sua sessão será encerrada automaticamente por inatividade em{" "}
          <strong>{countdown} segundos</strong>.
        </p>
        <p>Clique em "Continuar Sessão" para permanecer conectado.</p>
      </Modal>
    </div>
  );
};

export default MainLayout;
