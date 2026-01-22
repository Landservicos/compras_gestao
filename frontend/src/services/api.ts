import axios, { InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true, // Enable cookies for cross-site requests (if applicable) and same-site
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Authorization header is managed via HttpOnly cookies by the browser.

  // Pega as informações do tenant (empresa) do localStorage
  const tenantInfoRaw = localStorage.getItem("tenant_info");
  if (tenantInfoRaw) {
    try {
      const tenantInfo = JSON.parse(tenantInfoRaw);
      if (tenantInfo && tenantInfo.schema_name) {
        // Adiciona o header do tenant em cada requisição
        config.headers["X-Tenant-ID"] = tenantInfo.schema_name;
      }
    } catch (e) {
      console.error("Erro ao processar informações do tenant:", e);
    }
  }

  return config;
});

export default api;