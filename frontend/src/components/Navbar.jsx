/**
 * Navbar - Barra de navegación principal
 */
import { useNavigate, Link } from "react-router-dom";
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
      <div className="navbar-brand" onClick={() => navigate("/")} style={{ cursor: 'pointer' }}>
        <span className="trophy">🏆</span>
        <span className="brand-text">Polla <span className="brand-highlight">Mundial</span> 2026</span>
      </div>

      {usuario && (
        <div className="navbar-menu">
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
