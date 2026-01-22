import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { PermissionSet } from "../pages/UserManagement";

interface PermissionRouteProps {
  permission: string; // Ex: "page_compras" ou "gerenciar.usuarios"
}

const PermissionRoute: React.FC<PermissionRouteProps> = ({ permission }) => {
  const { user } = useAuth();

  const checkPermission = (
    permissions: Partial<PermissionSet>,
    permString: string
  ): boolean => {
    const keys = permString.split(".");
    let current: any = permissions;
    for (const key of keys) {
      if (current === undefined || typeof current !== "object" || current === null) {
        return false;
      }
      current = current[key];
    }
    return !!current;
  };

  const hasPermission =
    user?.is_superuser || checkPermission(user?.permissions || {}, permission);

  if (!hasPermission) {
    // Redireciona para a página principal se não tiver permissão
    return <Navigate to="/processos" replace />;
  }

  return <Outlet />;
};

export default PermissionRoute;
