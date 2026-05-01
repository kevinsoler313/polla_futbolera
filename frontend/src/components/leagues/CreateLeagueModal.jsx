/**
 * CreateLeagueModal.jsx
 * Modal para crear una liga privada nueva.
 * Responsabilidad única: formulario de creación y mostrar el código generado.
 */
import { useState } from 'react';
import './LeagueModals.css';

const CreateLeagueModal = ({ onClose, onCreate }) => {
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ligaCreada, setLigaCreada] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const liga = await onCreate(nombre.trim());
      setLigaCreada(liga);
    } catch (err) {
      setError(err.message || 'Error al crear la liga');
    } finally {
      setLoading(false);
    }
  };

  const copiarCodigo = () => {
    navigator.clipboard.writeText(ligaCreada.codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const compartirWhatsApp = () => {
    const texto = encodeURIComponent(
      `¡Únete a mi Polla del Mundial 2026! 🏆\nMi liga: "${ligaCreada.nombre}"\nÚsate el código: ${ligaCreada.codigo}\nDescárgala y compite conmigo.`
    );
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {!ligaCreada ? (
          <>
            <div className="modal-header">
              <div className="modal-icon">🏆</div>
              <h2 className="modal-title">Crear Liga Privada</h2>
              <p className="modal-subtitle">Ponle un nombre y comparte el código con tus amigos</p>
            </div>

            {error && <div className="modal-error">{error}</div>}

            <form onSubmit={handleCreate} className="modal-form">
              <div className="input-group">
                <label htmlFor="liga-nombre">Nombre de la Liga</label>
                <input
                  id="liga-nombre"
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder='Ej: "Los del Trabajo", "Familia"'
                  maxLength={100}
                  required
                  autoFocus
                />
              </div>
              <button
                id="btn-crear-liga"
                type="submit"
                className="btn-primary modal-btn"
                disabled={loading || nombre.trim().length < 3}
              >
                {loading ? 'Creando...' : 'Crear Liga'}
              </button>
            </form>
          </>
        ) : (
          /* ── Estado: Liga creada, mostrar código ── */
          <div className="code-reveal">
            <div className="modal-icon success-icon">✓</div>
            <h2 className="modal-title">¡Liga Creada!</h2>
            <p className="modal-subtitle">Comparte este código con tus amigos para que se unan</p>

            <div className="league-code-display">
              <span className="league-code-text">{ligaCreada.codigo}</span>
              <button
                className={`copy-btn ${copiado ? 'copied' : ''}`}
                onClick={copiarCodigo}
                title="Copiar código"
              >
                {copiado ? '✓' : '📋'}
              </button>
            </div>

            <div className="code-actions">
              <button
                id="btn-compartir-whatsapp"
                className="btn-whatsapp"
                onClick={compartirWhatsApp}
              >
                Compartir por WhatsApp
              </button>
              <button className="btn-secondary" onClick={onClose}>
                Listo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateLeagueModal;
