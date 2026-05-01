/**
 * Dashboard.jsx
 * Responsabilidad: Orquestar vistas y pasar datos a componentes hijos.
 * NO contiene lógica de negocio ni cálculos. Usa hooks y componentes.
 */
import { useState, useRef } from 'react';
import { usePredictions } from '../hooks/usePredictions';
import { useBracket } from '../hooks/useBracket';
import { useDeadline } from '../hooks/useDeadline';
import { buildGroupTable, sortEquiposByPrediction, buildThirdPlacesFromTable } from '../utils/groupUtils';

import Bracket from './Bracket';
import MatchCard from '../components/matches/MatchCard';
import LoadingScreen from '../components/ui/LoadingScreen';
import Toast from '../components/ui/Toast';
import ConfirmBetModal from '../components/betting/ConfirmBetModal';

import './Dashboard.css';

// Hints por vista
const VIEW_HINTS = {
  clasificados: 'Arrastra los equipos para ordenar quién clasifica 1.° y 2.° en cada grupo. Los mejores terceros también se ordenan por arrastre.',
  partidos: 'Ingresa el marcador que predices para cada partido. La tabla de posiciones se actualiza automáticamente al lado derecho.',
  tablas: 'Estas tablas se calculan a partir de los marcadores que ingresaste. Para cambiarlas, edita los marcadores en la pestaña Marcadores.',
  bracket: 'Haz clic en un equipo para avanzarlo al siguiente cruce. Los clasificados de grupos se toman de tus predicciones.',
};

const Dashboard = () => {
  const predictions = usePredictions();
  const {
    grupos, prediccionesGrupo, prediccionesPartidos,
    partidosEliminatoria, tercerosManual,
    loading, saving, mensaje, isAdminMode,
    dragOverItem, dragOverTercero,
    handleScoreChange, handleResetPartidos,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop,
    handleTerceroDragStart, handleTerceroDragOver, handleTerceroDragLeave, handleTerceroDrop,
    guardarApuestas,
  } = predictions;

  const bracket = useBracket(partidosEliminatoria, prediccionesPartidos);
  const {
    bracketScores, bracketTieBreakers,
    handleBracketScoreChange, handleBracketTieBreaker, handleResetBracket,
  } = bracket;

  const { puedeEditar, countdown, apuestasConfirmadas, confirmar } = useDeadline();

  const [view, setView] = useState(isAdminMode ? 'partidos' : 'clasificados');
  const [grupoActivo, setGrupoActivo] = useState(0);
  const [modalConfirmar, setModalConfirmar] = useState(false);

  const bracketSaveFnRef = useRef(null);

  const handleGuardar = () => {
    if (!puedeEditar && !isAdminMode) return;
    guardarApuestas(bracketSaveFnRef.current);
  };

  if (loading) return <LoadingScreen />;

  const estaBloqueado = !isAdminMode && !puedeEditar;
  const grupoActual = grupos[grupoActivo];

  return (
    <div className={`dashboard-container ${isAdminMode ? 'admin-mode' : ''}`}>

      {/* ── HEADER 2 filas ─────────────────────────────────────────────────── */}
      <div className="dashboard-header glass-panel">

        {/* Fila 1: Título izquierda | Countdown derecha */}
        <div className="header-row header-row--top">
          <div className="header-info">
            <h1 className="header-title">
              {isAdminMode ? '⚙️ Panel Administrador' : 'Mis Predicciones'}
            </h1>
            <p className="header-subtitle">
              {isAdminMode
                ? 'Carga los resultados reales del Mundial.'
                : 'Completa tus pronósticos para el Mundial 2026.'}
            </p>
          </div>

          {!isAdminMode && !estaBloqueado && countdown && (
            <div className="header-countdown">
              <div className="countdown-label">Cierre de apuestas</div>
              <div className="countdown-time">{countdown}</div>
            </div>
          )}
          {!isAdminMode && estaBloqueado && (
            <div className="header-countdown header-countdown--locked">
              <div className="countdown-label">Estado</div>
              <div className="countdown-time" style={{ fontSize: '1rem' }}>
                {apuestasConfirmadas ? 'Confirmadas' : 'Cerradas'}
              </div>
            </div>
          )}
        </div>

        {/* Fila 2: Pestañas izquierda | Botones derecha (Confirmar debajo del countdown) */}
        <div className="header-row header-row--bottom">
          <div className="view-selector">
            {!isAdminMode && (
              <button
                id="btn-view-clasificados"
                className={`view-btn ${view === 'clasificados' ? 'active' : ''}`}
                onClick={() => setView('clasificados')}
              >
                Clasificados
              </button>
            )}
            <button
              id="btn-view-partidos"
              className={`view-btn ${view === 'partidos' ? 'active' : ''}`}
              onClick={() => setView('partidos')}
            >
              Marcadores
            </button>
            <button
              id="btn-view-tablas"
              className={`view-btn ${view === 'tablas' ? 'active' : ''}`}
              onClick={() => setView('tablas')}
            >
              Tablas
            </button>
            <button
              id="btn-view-bracket"
              className={`view-btn ${view === 'bracket' ? 'active' : ''}`}
              onClick={() => setView('bracket')}
            >
              Bracket
            </button>
          </div>

          <div className="header-action-btns">
            {isAdminMode ? (
              <button id="btn-guardar" className="btn-primary" onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Admin'}
              </button>
            ) : estaBloqueado ? (
              <div className="locked-badge">
                🔒 {apuestasConfirmadas ? 'Confirmadas' : 'Cerradas'}
              </div>
            ) : (
              <>
                <button id="btn-guardar" className="btn-secondary" onClick={handleGuardar} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  id="btn-confirmar-apuestas"
                  className="btn-confirm-deadline"
                  onClick={() => setModalConfirmar(true)}
                >
                  🔒 Confirmar Apuestas
                </button>
              </>
            )}
          </div>

        </div>
      </div>

      <Toast text={mensaje.text} type={mensaje.type} />

      {/* ── HINT DE VISTA ─────────────────────────────────────────────────── */}
      {!isAdminMode && view !== 'bracket' && (
        <div className="view-hint">
          <span className="view-hint-icon">💡</span>
          <span>{VIEW_HINTS[view]}</span>
          {view === 'tablas' && (
            <button
              className="hint-link-btn"
              onClick={() => setView('partidos')}
            >
              → Ir a Marcadores
            </button>
          )}
        </div>
      )}

      {/* ── TABS DE GRUPOS (solo Marcadores) ──────────────────────────────── */}
      {view === 'partidos' && (
        <div className="grupos-tabs-bar grupos-tabs-bar--full">
          {grupos.map((grupo, index) => (
            <button
              key={grupo.id}
              id={`tab-grupo-${grupo.nombre}`}
              className={`group-tab group-tab--flex ${grupoActivo === index ? 'active' : ''}`}
              onClick={() => setGrupoActivo(index)}
            >
              {grupo.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="dashboard-content">

        {/* ── VISTA: CLASIFICADOS ───────────────────────────────────────── */}
        {view === 'clasificados' && (
          <div className="view-container animate-fade-in">
            <div className="classified-layout">
              <div className="groups-grid">
                {grupos.map(grupo => {
                  const equiposOrdenados = sortEquiposByPrediction(grupo.equipos, prediccionesGrupo);
                  return (
                    <div key={grupo.id} className="group-card glass-panel">
                      <div className="group-card-header">Grupo {grupo.nombre}</div>
                      <div className="group-col-header">
                        <span></span>
                        <span>Equipo</span>
                        <span>Pos</span>
                        <span></span>
                      </div>
                      {equiposOrdenados.map((equipo, idx) => {
                        const posicion = idx + 1;
                        const isDragOver = dragOverItem?.equipoId === equipo.id && dragOverItem?.grupoId === grupo.id;
                        const rowClass = posicion <= 2 ? 'clasificado' : posicion === 3 ? 'tercero' : 'eliminado';
                        return (
                          <div
                            key={equipo.id}
                            className={`standings-row standings-row--${rowClass} draggable ${isDragOver ? 'drag-over' : ''}`}
                            draggable
                            onDragStart={e => handleDragStart(e, grupo.id, equipo.id)}
                            onDragOver={e => handleDragOver(e, grupo.id, equipo.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={e => handleDrop(e, grupo.id, equipo.id)}
                          >
                            <span className="standings-pos">{posicion}°</span>
                            <span className="standings-team">
                              <span className="standings-flag">{equipo.bandera}</span>
                              <span className="standings-name">{equipo.nombre}</span>
                            </span>
                            <span className="standings-stat">{posicion}°</span>
                            <span className="drag-handle">⠿</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Mejores Terceros */}
              <div className="sidebar">
                <div className="group-card glass-panel">
                  <div className="group-card-header">Mejores Terceros</div>
                  <div className="group-col-header">
                    <span>Pos</span>
                    <span>Equipo (G)</span>
                    <span>Pts</span>
                    <span></span>
                  </div>
                  {tercerosManual.map((eq, idx) => {
                    const posicion = idx + 1;
                    const isDragOver = dragOverTercero === idx;
                    const rowClass = posicion <= 8 ? 'clasificado' : 'eliminado';
                    return (
                      <div
                        key={`${eq.id}-${idx}`}
                        className={`standings-row standings-row--${rowClass} draggable ${isDragOver ? 'drag-over' : ''}`}
                        draggable
                        onDragStart={e => handleTerceroDragStart(e, idx)}
                        onDragOver={e => handleTerceroDragOver(e, idx)}
                        onDragLeave={handleTerceroDragLeave}
                        onDrop={e => handleTerceroDrop(e, idx)}
                      >
                        <span className="standings-pos">{posicion}°</span>
                        <span className="standings-team">
                          <span className="standings-flag">{eq.bandera}</span>
                          <span className="standings-name">{eq.nombre} <small>({eq.grupo})</small></span>
                        </span>
                        <span className="standings-stat">{eq.pts}</span>
                        <span className="drag-handle">⠿</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── VISTA: MARCADORES + TABLA AL LADO ────────────────────────── */}
        {grupoActual && view === 'partidos' && (
          <div className="view-container animate-fade-in">
            <div className="marcadores-layout">

              {/* Izquierda: partidos */}
              <div className="marcadores-matches">
                <div className="view-header-row">
                  <h2 className="view-title">Grupo {grupoActual.nombre}</h2>
                  <button className="btn-secondary btn-sm" onClick={handleResetPartidos}>
                    Reiniciar
                  </button>
                </div>
                <div className="matches-list">
                  {grupoActual.partidos.map(partido => (
                    <MatchCard
                      key={partido.id}
                      partido={partido}
                      prediccion={prediccionesPartidos.find(p => p.id_partido === partido.id)}
                      onScoreChange={handleScoreChange}
                    />
                  ))}
                </div>
              </div>

              {/* Derecha: tabla del grupo */}
              <div className="marcadores-tabla">
                <h3 className="tabla-side-title">Tabla — Grupo {grupoActual.nombre}</h3>
                <div className="group-card glass-panel" style={{ borderRadius: 12 }}>
                  <div className="group-col-header" style={{ gridTemplateColumns: '30px 1fr 36px 36px 36px' }}>
                    <span></span>
                    <span>Equipo</span>
                    <span>Pts</span>
                    <span>GF</span>
                    <span>DG</span>
                  </div>
                  {buildGroupTable(grupoActual.equipos, grupoActual.partidos, prediccionesPartidos).map((eq, idx) => {
                    const pos = idx + 1;
                    const rowClass = pos <= 2 ? 'clasificado' : pos === 3 ? 'tercero' : 'eliminado';
                    return (
                      <div
                        key={eq.id}
                        className={`standings-row standings-row--${rowClass}`}
                        style={{ gridTemplateColumns: '30px 1fr 36px 36px 36px' }}
                      >
                        <span className="standings-pos">{pos}°</span>
                        <span className="standings-team">
                          <span className="standings-flag">{eq.bandera}</span>
                          <span className="standings-name">{eq.nombre}</span>
                        </span>
                        <span className="standings-stat">{eq.pts}</span>
                        <span className="standings-stat" style={{ color: 'var(--text-muted)' }}>{eq.gf}</span>
                        <span className={`standings-dg ${eq.dg > 0 ? 'pos' : eq.dg < 0 ? 'neg' : ''}`}>
                          {eq.dg > 0 ? `+${eq.dg}` : eq.dg}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="tabla-side-note">⟳ Se actualiza en tiempo real con tus marcadores</p>
              </div>

            </div>
          </div>
        )}

        {/* ── VISTA: TABLAS ─────────────────────────────────────────────── */}
        {view === 'tablas' && (
          <div className="view-container animate-fade-in">

            <div className="classified-layout">
              <div className="groups-grid">
                {grupos.map(grupo => {
                  const tableData = buildGroupTable(grupo.equipos, grupo.partidos, prediccionesPartidos);
                  return (
                    <div key={grupo.id} className="group-card glass-panel">
                      <div className="group-card-header">Grupo {grupo.nombre}</div>
                      <div className="group-col-header">
                        <span></span>
                        <span>Equipo</span>
                        <span>Pts</span>
                        <span>DG</span>
                      </div>
                      {tableData.map((eq, idx) => {
                        const posicion = idx + 1;
                        const rowClass = posicion <= 2 ? 'clasificado' : posicion === 3 ? 'tercero' : 'eliminado';
                        return (
                          <div key={eq.id} className={`standings-row standings-row--${rowClass}`}>
                            <span className="standings-pos">{posicion}°</span>
                            <span className="standings-team">
                              <span className="standings-flag">{eq.bandera}</span>
                              <span className="standings-name">{eq.nombre}</span>
                            </span>
                            <span className="standings-stat">{eq.pts}</span>
                            <span className={`standings-dg ${eq.dg > 0 ? 'pos' : eq.dg < 0 ? 'neg' : ''}`}>
                              {eq.dg > 0 ? `+${eq.dg}` : eq.dg}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className="sidebar">
                <div className="group-card glass-panel">
                  <div className="group-card-header">Mejores Terceros (Calculados)</div>
                  <div className="group-col-header">
                    <span>Pos</span>
                    <span>Equipo (G)</span>
                    <span>Pts</span>
                    <span>DG</span>
                  </div>
                  {buildThirdPlacesFromTable(grupos, prediccionesPartidos).map((eq, idx) => {
                    const posicion = idx + 1;
                    const rowClass = posicion <= 8 ? 'clasificado' : 'eliminado';
                    return (
                      <div key={`t3-${eq.id}-${idx}`} className={`standings-row standings-row--${rowClass}`}>
                        <span className="standings-pos">{posicion}°</span>
                        <span className="standings-team">
                          <span className="standings-flag">{eq.bandera}</span>
                          <span className="standings-name">{eq.nombre} <small>({eq.grupo})</small></span>
                        </span>
                        <span className="standings-stat">{eq.pts}</span>
                        <span className={`standings-dg ${eq.dg > 0 ? 'pos' : eq.dg < 0 ? 'neg' : ''}`}>
                          {eq.dg > 0 ? `+${eq.dg}` : eq.dg}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── VISTA: BRACKET ────────────────────────────────────────────── */}
        {view === 'bracket' && (
          <Bracket
            grupos={grupos}
            prediccionesPartidos={prediccionesPartidos}
            prediccionesGrupo={prediccionesGrupo}
            partidosEliminatoria={partidosEliminatoria}
            scores={bracketScores}
            tieBreakers={bracketTieBreakers}
            onScoreChange={handleBracketScoreChange}
            onTieBreakerChange={handleBracketTieBreaker}
            onReset={handleResetBracket}
            tercerosManual={tercerosManual}
            isAdminMode={isAdminMode}
            onRegisterSaveFn={(fn) => { bracketSaveFnRef.current = fn; }}
          />
        )}
      </div>

      {/* ── MODAL CONFIRMACIÓN ─────────────────────────────────────────── */}
      {modalConfirmar && (
        <ConfirmBetModal
          onClose={() => setModalConfirmar(false)}
          onConfirm={confirmar}
        />
      )}
    </div>
  );
};

export default Dashboard;
