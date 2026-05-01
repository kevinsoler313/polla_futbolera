/**
 * MatchCard.jsx
 * Tarjeta de partido: equipo local | [score] VS [score] | equipo visitante
 * Layout horizontal compacto con el marcador grande y centrado.
 */

const MatchCard = ({ partido, prediccion, onScoreChange }) => {
  const pred = prediccion || { goles_equipo1: 0, goles_equipo2: 0 };

  return (
    <div className="match-card">
      <div className="match-row">

        {/* Equipo Local */}
        <div className="match-team-side home-side">
          <span className="match-flag">{partido.equipo1?.bandera}</span>
          <span className="match-team-name">{partido.equipo1?.nombre}</span>
        </div>

        {/* Marcador centrado */}
        <div className="match-score-center">
          <input
            type="number"
            min="0"
            max="20"
            value={pred.goles_equipo1}
            onChange={e => onScoreChange(partido.id, 1, e.target.value)}
            className="match-score-input"
            aria-label={`Goles ${partido.equipo1?.nombre}`}
          />
          <span className="match-score-sep">-</span>
          <input
            type="number"
            min="0"
            max="20"
            value={pred.goles_equipo2}
            onChange={e => onScoreChange(partido.id, 2, e.target.value)}
            className="match-score-input"
            aria-label={`Goles ${partido.equipo2?.nombre}`}
          />
        </div>

        {/* Equipo Visitante */}
        <div className="match-team-side away-side">
          <span className="match-flag">{partido.equipo2?.bandera}</span>
          <span className="match-team-name">{partido.equipo2?.nombre}</span>
        </div>

      </div>
    </div>
  );
};

export default MatchCard;
