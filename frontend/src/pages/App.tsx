import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { AuthProvider } from "../hooks/useAuth";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "../components/ProtectedRoute";
import Login from "./Login";
import Processos from "./Processos";
import ProcessoCreate from "./ProcessoCreate";
import ProcessoDetail from "./ProcessoDetail";
import UserManagement from "./UserManagement";
import PermissionRoute from "../components/PermissionRoute";
import "../styles/global-animations.css"; // Importa as animações globais
import GerenciarEmpresas from "./GerenciarEmpresas";
import ManageCRDII from "./ManageCRDII";
import MainLayout from "../components/MainLayout";
import Dashboard from "./Dashboard";
import { useEffect } from "react";

// Componente que escuta o evento de logout e navega
const LogoutNavigator = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = () => {
      navigate("/login");
    };

    window.addEventListener("force-logout", handleLogout);
    return () => window.removeEventListener("force-logout", handleLogout);
  }, [navigate]);

  return null; // Este componente não renderiza nada
};

// Component wrapper para as rotas autenticadas
const AuthenticatedRoutes = () => {
  return (
    <AuthProvider>
      <LogoutNavigator />
      <Routes>
        {/* Rotas Protegidas: Primeiro verifica a autenticação, depois renderiza o Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            {/* Rota raiz (Dashboard) */}
            <Route element={<PermissionRoute permission="page_dashboard" />}>
              <Route path="/" element={<Dashboard context="COMPRAS" />} />
              <Route path="/dashboard" element={<Dashboard context="COMPRAS" />} />
              <Route path="/diversos/dashboard" element={<Dashboard context="DIVERSOS" />} />
            </Route>

            {/* Rotas de Processos */}
            <Route element={<PermissionRoute permission="page_compras" />}>
              <Route path="/processos" element={<Processos context="COMPRAS" />} />
              <Route path="/diversos/processos" element={<Processos context="DIVERSOS" />} />
            </Route>
            <Route path="/processos/:id" element={<ProcessoDetail />} />
            <Route
              element={<PermissionRoute permission="can_create_processo" />}
            >
              <Route path="/processos/novo" element={<ProcessoCreate context="COMPRAS" />} />
              <Route path="/diversos/novo" element={<ProcessoCreate context="DIVERSOS" />} />
            </Route>

            {/* Rotas de Gerenciamento */}
            <Route
              element={<PermissionRoute permission="gerenciar.usuarios" />}
            >
              <Route path="/gerenciar-usuarios" element={<UserManagement />} />
            </Route>
            <Route
              element={<PermissionRoute permission="gerenciar.empresas" />}
            >
              <Route
                path="/gerenciar-empresas"
                element={<GerenciarEmpresas />}
              />
            </Route>
            <Route path="/gerenciar-crdiis" element={<ManageCRDII />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
};

const AppRoutes = () => {
  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
        }}
      />
      <Routes>
        {/* Rota Pública - Login fica FORA do AuthProvider para evitar o loop */}
        <Route path="/login" element={<Login />} />

        {/* Todas as outras rotas ficam DENTRO do AuthProvider */}
        <Route path="/*" element={<AuthenticatedRoutes />} />
      </Routes>
    </>
  );
};

const App = () => (
  <Router>
    <AppRoutes />
  </Router>
);

export default App;
