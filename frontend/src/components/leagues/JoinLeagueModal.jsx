/**
 * JoinLeagueModal.jsx
 * Modal para unirse a una liga privada usando un código de invitación.
 * Responsabilidad única: formulario de ingreso de código.
 */
import { useState } from 'react';
import './LeagueModals.css';

const JoinLeagueModal = ({ onClose, onJoin }) => {
  const [codigo, setCodigo] = useState('SKJ26-');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exitoso, setExitoso] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const liga = await onJoin(codigo.trim().toUpperCase());
      setExitoso(liga);
    } catch (err) {
      setError(err.message || 'Código incorrecto o liga no encontrada');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {!exitoso ? (
          <>
            <div className="modal-header">
              <div className="modal-icon">🔑</div>
              <h2 className="modal-title">Unirse a una Liga</h2>
              <p className="modal-subtitle">Ingresa el código que te compartió tu amigo</p>
            </div>

            {error && <div className="modal-error">{error}</div>}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="input-group">
                <label htmlFor="join-codigo">Código de Invitación</label>
                <input
                  id="join-codigo"
                  type="text"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.toUpperCase())}
                  placeholder="SKJ26-XXXXX"
                  maxLength={11}
                  required
                  autoFocus
                  style={{ letterSpacing: '0.1em', fontWeight: 700, fontSize: '1.1rem' }}
                />
              </div>
              <button
                id="btn-unirse-liga"
                type="submit"
                className="btn-primary modal-btn"
                disabled={loading || codigo.length < 11}
              >
                {loading ? 'Buscando...' : 'Unirme a la Liga'}
              </button>
            </form>
          </>
        ) : (
          <div className="code-reveal">
            <div className="modal-icon success-icon">✓</div>
            <h2 className="modal-title">¡Te uniste a la liga!</h2>
            <p className="modal-subtitle">
              Ahora eres parte de <strong>"{exitoso.nombre}"</strong>.<br />
              Ya puedes ver el ranking de tu grupo.
            </p>
            <button className="btn-primary modal-btn" onClick={onClose}>Ver el Ranking</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinLeagueModal;
