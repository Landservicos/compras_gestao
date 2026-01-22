import React, { useState } from "react";
import Modal from "./Modal";
import { Processo } from "../pages/Processos";
import { formatStatus } from "../pages/Processos";
import { Search, FileText, Download } from "lucide-react";
import "../styles/ProcessosModal.css";

interface ProcessosModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  processos: Processo[];
  onDataChange: () => void;
}

const ProcessosModal: React.FC<ProcessosModalProps> = ({
  isOpen,
  onClose,
  title,
  processos,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProcessos = processos
    .filter((p) => {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const formattedDate = new Date(p.data_status).toLocaleDateString("pt-BR");
      const formattedStatus = formatStatus(p.status).toLowerCase();

      return (
        p.nome.toLowerCase().includes(lowerCaseSearchTerm) ||
        (p.crdii_nome &&
          p.crdii_nome.toLowerCase().includes(lowerCaseSearchTerm)) ||
        p.criado_por.toLowerCase().includes(lowerCaseSearchTerm) ||
        formattedDate.includes(lowerCaseSearchTerm) ||
        formattedStatus.includes(lowerCaseSearchTerm)
      );
    })
    .sort(
      (a, b) =>
        new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime()
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      showFooter={false}
      size="large"
    >
      <div className="processos-modal-content">
        <div className="processos-modal-header">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por processo, CRDII, solicitante, data ou status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="processos-modal-list">
          {filteredProcessos.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>CRDII</th>
                  <th>PROCESSOS</th>
                  <th>SOLICITANTE</th>
                  <th>DATA CRIAÇÃO</th>
                  <th>DATA STATUS</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcessos.map((processo) => (
                  <tr key={processo.id}>
                    <td>{processo.crdii_nome || "N/A"}</td>
                    <td>
                      <a
                        href={`/processos/${processo.id}`}
                        target="_self"
                        rel="noopener noreferrer"
                      >
                        {processo.nome}
                      </a>
                    </td>
                    <td>{processo.criado_por}</td>
                    <td>
                      {new Date(processo.data_criacao).toLocaleDateString(
                        "pt-BR",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </td>
                    <td>
                      {new Date(processo.data_status).toLocaleDateString(
                        "pt-BR",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-badge status-${processo.status}`}
                      >
                        {formatStatus(processo.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-results-modal">
              <FileText size={40} />
              <p>Nenhum processo encontrado para esta categoria.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ProcessosModal;
