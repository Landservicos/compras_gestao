import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Clock } from 'lucide-react';
import '../styles/statusHistoryModal.css';

interface StatusHistory {
    id: number;
    usuario_nome: string | null;
    status_anterior_display: string | null;
    status_novo_display: string;
    data_mudanca: string;
}

interface StatusHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    processoId: number;
}

const StatusHistoryModal: React.FC<StatusHistoryModalProps> = ({ isOpen, onClose, processoId }) => {
    const [history, setHistory] = useState<StatusHistory[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            api.get<StatusHistory[]>(`/processos/${processoId}/history/`)
                .then(response => {
                    setHistory(response.data);
                })
                .catch(err => {
                    console.error("Falha ao buscar histórico de status.", err);
                    toast.error("Não foi possível carregar o histórico.");
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [isOpen, processoId]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Histórico de Movimentação de Status"
            showFooter={true}
            footer={
                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>
                        Fechar
                    </button>
                </div>
            }
        >
            <div className="status-history-modal-content">
                {loading ? (
                    <p>Carregando histórico...</p>
                ) : history.length === 0 ? (
                    <p>Nenhuma movimentação de status registrada.</p>
                ) : (
                    <ul className="status-history-list">
                        {history.map((item) => (
                            <li key={item.id} className="history-item">
                                <div className="history-item-icon">
                                    <Clock size={20} />
                                </div>
                                <div className="history-item-details">
                                    <p className="history-item-change">
                                        Status alterado de <strong>{item.status_anterior_display || 'Criação'}</strong> para <strong>{item.status_novo_display}</strong>
                                    </p>
                                    <p className="history-item-meta">
                                        por <strong>{item.usuario_nome || 'Sistema'}</strong> em {new Date(item.data_mudanca).toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Modal>
    );
};

export default StatusHistoryModal;
