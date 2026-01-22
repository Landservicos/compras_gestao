import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();

  // Enquanto o contexto ainda está verificando o token no localStorage
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-lg">
        Carregando...
      </div>
    );
  }

  // Se não há usuário autenticado → corta e joga para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Autenticado → libera a rota
  return <Outlet />;
};

export default ProtectedRoute;
