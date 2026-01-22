import React from "react";

const SystemStatus: React.FC = () => {
  // Lógica para verificar o status do sistema pode ser adicionada aqui
  const isOnline = true;

  return (
    <div className="system-status">
      <span
        className={`status-indicator ${isOnline ? "online" : "offline"}`}
      ></span>
      {isOnline ? "Sistema Online" : "Sistema Offline"}
    </div>
  );
};

export default SystemStatus;
