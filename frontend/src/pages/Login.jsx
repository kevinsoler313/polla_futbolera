import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre_usuario: '',
    correo: '',
    contrasena: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let data;
      if (isLogin) {
        data = await authService.login({
          nombre_usuario: formData.nombre_usuario,
          contrasena: formData.contrasena,
        });
      } else {
        data = await authService.register(formData);
      }
      
      login(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="trophy-icon">🏆</div>
          <h2>{isLogin ? 'Ingresar a la Polla' : 'Crea tu Perfil'}</h2>
          <p>{isLogin ? 'Prepárate para el Mundial 2026' : 'Únete y demuestra que sabes de fútbol'}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="nombre_usuario">Usuario</label>
            <input
              type="text"
              id="nombre_usuario"
              name="nombre_usuario"
              value={formData.nombre_usuario}
              onChange={handleChange}
              placeholder="Ej: goleador26"
              required
            />
          </div>

          {!isLogin && (
            <div className="input-group">
              <label htmlFor="correo">Correo Electrónico</label>
              <input
                type="email"
                id="correo"
                name="correo"
                value={formData.correo}
                onChange={handleChange}
                placeholder="tu@email.com"
                required
              />
            </div>
          )}

          <div className="input-group">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              type="password"
              id="contrasena"
              name="contrasena"
              value={formData.contrasena}
              onChange={handleChange}
              placeholder="••••••••"
              required
              minLength="6"
            />
          </div>

          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            {loading ? 'Cargando...' : isLogin ? 'Ingresar' : 'Crear Perfil'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isLogin ? '¿No tienes perfil?' : '¿Ya tienes perfil?'}
            <button
              className="toggle-btn"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
            >
              {isLogin ? 'Regístrate aquí' : 'Ingresa aquí'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
