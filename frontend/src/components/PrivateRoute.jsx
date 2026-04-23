/**
 * PrivateRoute - Protege rutas que requieren autenticación
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = ({ children }) => {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return usuario ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
