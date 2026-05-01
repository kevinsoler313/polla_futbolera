/**
 * Navbar - Barra de navegación principal
 * Layout: Links (izquierda) | Título (centro absoluto) | Usuario + Logout (derecha)
 */
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">

      {/* Izquierda: Links de navegación */}
      <div className="nav-left">
        {usuario && (
          <div className="nav-links">
            <Link
              to="/dashboard"
              className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
              id="nav-link-predicciones"
            >
              Predicciones
            </Link>
            <Link
              to="/ranking"
              className={`nav-link ${location.pathname === '/ranking' ? 'active' : ''}`}
              id="nav-link-ranking"
            >
              Rankings
            </Link>
          </div>
        )}
      </div>

      {/* Centro: Título (posición absoluta para centrarlo independientemente del resto) */}
      <div
        className="navbar-brand-center"
        onClick={() => navigate("/")}
        style={{ cursor: 'pointer' }}
      >
        <span className="trophy">🏆</span>
        <span className="brand-text">
          Polla <span className="brand-highlight">Mundial</span> 2026
        </span>
      </div>

      {/* Derecha: Usuario + Logout */}
      <div className="nav-right">
        {usuario && (
          <>
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
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
