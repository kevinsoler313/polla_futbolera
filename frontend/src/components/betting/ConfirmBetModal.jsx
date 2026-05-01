/**
 * ConfirmBetModal.jsx
 * Modal de confirmación definitiva de apuestas.
 * Responsabilidad única: mostrar advertencia clara y confirmar la acción irreversible.
 */
import { useState } from 'react';
import './ConfirmBetModal.css';

const ConfirmBetModal = ({ onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al confirmar');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="confirm-modal glass-panel" onClick={e => e.stopPropagation()}>
        <div className="confirm-icon">⚠️</div>
        <h2 className="confirm-title">Confirmar Apuestas Definitivas</h2>
        <p className="confirm-body">
          Al confirmar, <strong>ya no podrás editar ninguna predicción</strong>.
          Tus apuestas quedarán guardadas tal como están ahora.
        </p>

        <div className="confirm-checklist">
          <div className="check-item">✓ Predicciones de partidos guardadas</div>
          <div className="check-item">✓ Posiciones de grupos definidas</div>
          <div className="check-item">✓ Bracket de eliminatorias listo</div>
        </div>

        {error && <div className="confirm-error">{error}</div>}

        <div className="confirm-actions">
          <button
            id="btn-confirm-cancel"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            id="btn-confirm-final"
            className="btn-confirm-final"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Confirmando...' : '🔒 Confirmar y Bloquear'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmBetModal;
