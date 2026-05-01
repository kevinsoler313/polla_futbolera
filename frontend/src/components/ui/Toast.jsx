/**
 * Toast.jsx
 * Componente de notificación tipo toast. Responsabilidad única: mostrar mensajes.
 * Reemplaza el sistema de alertas genérico anterior.
 */

const Toast = ({ text, type }) => {
  if (!text) return null;

  return (
    <div className={`toast toast--${type} animate-fade-in-up`} role="alert">
      <span className="toast-icon">
        {type === 'success' ? '✓' : '✕'}
      </span>
      <span className="toast-text">{text}</span>
    </div>
  );
};

export default Toast;
