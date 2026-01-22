import React from "react";
import { Menu } from "lucide-react";
import "../styles/header.css";

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  return (
    <header className="app-header">
      <button
        className="mobile-menu-btn"
        onClick={toggleSidebar}
        title="Abrir menu"
      >
        <Menu size={24} />
      </button>
      <div className="header-title">Gestão de Compras</div>
    </header>
  );
};

export default Header;
