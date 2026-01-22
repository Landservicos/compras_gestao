import React, { useState, FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import "../styles/login.css";
import logo from "../assets/logo1.png";
import Modal from "../components/Modal";
// A importação de useAuth foi removida propositalmente porque o login está fora do AuthProvider

interface TenantOption {
  schema_name: string;
  nome: string;
}

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Estados para o Modal de Seleção
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<TenantOption[]>([]);

  // const { login } = useAuth(); // Removido
  const navigate = useNavigate();
  const location = useLocation();

  // Função unificada para finalizar o login e redirecionar
  const finalizeLogin = async (data: any) => {
    // Agora o login espera apenas as informações do tenant, pois os tokens são cookies HttpOnly
    if (data.tenant) {
      // Como estamos fora do AuthProvider, salvamos o tenant manualmente aqui para que o AuthProvider
      // possa lê-lo ao ser montado na rota '/dashboard'
      localStorage.setItem("tenant_info", JSON.stringify(data.tenant));
      
      // O cookie de sessão também precisa ser criado manualmente aqui
      document.cookie = "session_active=true; path=/";

      // await login(data.tenant); // Não podemos chamar login() pois estamos fora do contexto
      
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } else {
        setError("Erro: Informações da empresa não retornadas pelo servidor.");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // 1. Envia User + Senha
      const response = await api.post("/auth/login/", {
        username,
        password,
      });

      const data = response.data;

      // 2. Backend decide o que fazer
      if (data.action === "select_tenant") {
        setAvailableTenants(data.tenants);
        setIsTenantModalOpen(true);
      } else if (data.access) {
        // Se retornou access, o login está completo.
        // O cookie foi setado pelo backend.
        finalizeLogin(data);
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        setError("Usuário ou senha incorretos.");
      } else {
        setError(
          err.response?.data?.detail || "Erro ao conectar com o servidor."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTenantSelection = async (schema_name: string) => {
    setIsLoading(true);
    try {
      // 3. Reenvia as credenciais COM a empresa escolhida
      const response = await api.post("/auth/login/", {
        username,
        password,
        tenant_schema_name: schema_name,
      });

      finalizeLogin(response.data);
      setIsTenantModalOpen(false);
    } catch (err: any) {
      setError("Não foi possível acessar essa empresa.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Card Principal */}
      <div className="glass-card">
        <div className="form-header">
          <img src={logo} alt="Logo" className="logo-img" />
          <h2>Bem-vindo</h2>
          <p>Faça login para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="modern-form">
          {error && <div className="error-message">{error}</div>}

          <div className="input-group">
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
            <label htmlFor="username">Usuário</label>
          </div>

          <div className="input-group">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <label htmlFor="password">Senha</label>
          </div>

          <button type="submit" className="btn-modern" disabled={isLoading}>
            {isLoading ? <div className="spinner"></div> : "Entrar"}
          </button>
        </form>

        <div className="login-footer">
          &copy; {new Date().getFullYear()} Compras & Gestão. Todos os direitos
          reservados.
        </div>
      </div>

      {/* Modal de Seleção de Empresa */}
      <Modal
        title={`Olá ${username}, escolha a empresa:`}
        isOpen={isTenantModalOpen}
        onClose={() => setIsTenantModalOpen(false)}
        showFooter={false}
      >
        <div className="tenant-list-container">
          <p className="tenant-list-info">
            Seu usuário possui acesso a múltiplas empresas.
          </p>

          <div className="tenant-list">
            {availableTenants.map((tenant) => (
              <button
                key={tenant.schema_name}
                className="tenant-option-btn"
                onClick={() => handleTenantSelection(tenant.schema_name)}
                disabled={isLoading}
              >
                <span className="tenant-name">{tenant.nome}</span>
                <span className="tenant-arrow">&rarr;</span>
              </button>
            ))}
          </div>

          <button
            className="btn-cancel-modal"
            onClick={() => setIsTenantModalOpen(false)}
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Login;
