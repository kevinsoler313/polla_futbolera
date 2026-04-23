/**
 * Navbar - Barra de navegación principal
 */
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="trophy">🏆</span>
        <span className="brand-text">Polla <span className="brand-highlight">Mundial</span> 2026</span>
      </Link>

      {usuario && (
        <div className="navbar-menu">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/apuestas" className="nav-link">Mis Apuestas</Link>
          <Link to="/ranking" className="nav-link">Ranking</Link>

          <div className="nav-user">
            <div className="user-avatar">
              {usuario.nombre_usuario.charAt(0).toUpperCase()}
            </div>
            <span className="user-name">{usuario.nombre_usuario}</span>
            <span className="user-pts">{usuario.puntaje} pts</span>
          </div>

          <button className="btn-logout" onClick={handleLogout}>
            Salir
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
