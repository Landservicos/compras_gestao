import React, { useState, useEffect } from "react";
import { ManagedUser } from "../pages/UserManagement";
import { useAuth } from "../hooks/useAuth"; // Importa o hook de autenticação
import "../styles/userForm.css";

interface UserFormProps {
  initialData: ManagedUser | null;
  onSave: (data: Partial<ManagedUser>) => void;
  onCancel: () => void;
  loading: boolean;
  availableRoles: string[];
  roleDisplayNames: Record<string, string>;
}

// Define um tipo para o estado do formulário, garantindo que 'role'
// use o tipo exato de 'ManagedUser'.
interface UserFormData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password?: string;
  password2?: string;
  role: ManagedUser["role"];
}

const UserForm: React.FC<UserFormProps> = ({
  initialData,
  onSave,
  onCancel,
  loading,
  availableRoles,
  roleDisplayNames,
}) => {
  useAuth(); // Pega o usuário logado
  const initialFormState: UserFormData = {
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    password2: "",
    role: "obra",
  };

  const [formData, setFormData] = useState<UserFormData>(initialFormState);

  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) {
      setFormData({
        username: initialData.username,
        email: initialData.email,
        first_name: initialData.first_name || "",
        last_name: initialData.last_name || "",
        password: "",
        password2: "",
        role: initialData.role,
      });
    } else {
      // Reset form for creation
      setFormData(initialFormState);
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    // Para o campo 'role', fazemos um type assertion para garantir a compatibilidade.
    setFormData((prev) => ({
      ...prev,
      [name]: name === "role" ? (value as ManagedUser["role"]) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave: Partial<UserFormData> = { ...formData };

    // Em modo de edição, não envie a senha se estiver vazia
    if (isEditing && !formData.password) {
      delete (dataToSave as any).password;
      delete (dataToSave as any).password2;
    }

    onSave(dataToSave);
  };

  // Verifica se o usuário logado pode alterar o cargo do usuário sendo editado.
  // O cargo só pode ser alterado se o cargo do usuário em edição estiver na lista de cargos disponíveis
  // para o usuário logado. Isso previne que um admin mude o cargo de um diretor, por exemplo.
  const canChangeRole =
    isEditing && initialData ? availableRoles.includes(initialData.role) : true; // Permite a seleção ao criar um novo usuário.

  return (
    <form onSubmit={handleSubmit} className="user-form">
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="username">Usuário</label>
          <input
            id="username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            // Desabilita o campo de usuário em modo de edição para evitar inconsistências.
            disabled={isEditing}
            placeholder="Ex: joao.silva"
            title={
              isEditing
                ? "O nome de usuário não pode ser alterado."
                : "Nome de usuário para login"
            }
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Ex: joao@exemplo.com"
          />
        </div>
        <div className="form-group">
          <label htmlFor="first_name">Nome</label>
          <input
            id="first_name"
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="Ex: João"
          />
        </div>
        <div className="form-group">
          <label htmlFor="last_name">Sobrenome</label>
          <input
            id="last_name"
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Ex: Silva"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Senha {isEditing && "(Opcional)"}</label>
          <input
            id="password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required={!isEditing}
            placeholder="Digite a senha"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password2">Confirmar Senha</label>
          <input
            id="password2"
            type="password"
            name="password2"
            value={formData.password2}
            onChange={handleChange}
            required={!isEditing || !!formData.password}
            placeholder="Confirme a senha"
          />
        </div>
        <div className="form-group full-width">
          <label htmlFor="role">Tipo</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            disabled={isEditing && !canChangeRole}
            title={
              isEditing && !canChangeRole
                ? "Você não tem permissão para alterar este cargo"
                : "Selecione o tipo de usuário"
            }
          >
            {/* Se o cargo do usuário editado não estiver na lista, adicione-o como uma opção desabilitada */}
            {isEditing && !canChangeRole && initialData && (
              <option key={initialData.role} value={initialData.role}>
                {roleDisplayNames[initialData.role] || initialData.role}
              </option>
            )}
            {availableRoles.map((role) => (
              <option key={role} value={role}>
                {roleDisplayNames[role]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-footer">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
};

export default UserForm;
