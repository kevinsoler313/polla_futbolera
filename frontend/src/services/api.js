/**
 * API Service - Comunicación con el backend FastAPI
 */
const API_BASE = "http://localhost:8000/api";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (res) => {
  let data = {};
  try {
    data = await res.json();
  } catch {
    // Si la respuesta no es JSON, continuar silenciosamente
  }

  if (!res.ok) {
    let errorMessage = "Error inesperado en el servidor";
    if (data.detail) {
      if (typeof data.detail === "string") {
        errorMessage = data.detail;
      } else if (Array.isArray(data.detail)) {
        errorMessage = data.detail.map((err) => err.msg).join(", ");
      }
    }
    throw new Error(errorMessage);
  }
  return data;
};

// ── Auth ────────────────────────────────────────────────────────────────────
export const authService = {
  register: (datos) =>
    fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    }).then(handleResponse),

  login: (datos) =>
    fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    }).then(handleResponse),

  me: () =>
    fetch(`${API_BASE}/auth/me`, { headers: getHeaders() }).then(handleResponse),
};

// ── Mundial ─────────────────────────────────────────────────────────────────
export const mundialService = {
  grupos: () =>
    fetch(`${API_BASE}/mundial/grupos`, { headers: getHeaders() }).then(handleResponse),

  partidosEliminatoria: () =>
    fetch(`${API_BASE}/mundial/partidos/eliminatoria`, { headers: getHeaders() }).then(handleResponse),
};

// ── Predicciones ────────────────────────────────────────────────────────────
export const prediccionService = {
  guardarPartidos: (predicciones) =>
    fetch(`${API_BASE}/predicciones/partidos`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ predicciones }),
    }).then(handleResponse),

  misPartidos: () =>
    fetch(`${API_BASE}/predicciones/partidos/mis`, {
      headers: getHeaders(),
    }).then(handleResponse),

  guardarGrupos: (predicciones) =>
    fetch(`${API_BASE}/predicciones/grupos`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ predicciones }),
    }).then(handleResponse),

  misGrupos: () =>
    fetch(`${API_BASE}/predicciones/grupos/mis`, {
      headers: getHeaders(),
    }).then(handleResponse),

  guardarTerceros: (predicciones) =>
    fetch(`${API_BASE}/predicciones/terceros`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ predicciones }),
    }).then(handleResponse),

  misTerceros: () =>
    fetch(`${API_BASE}/predicciones/terceros/mis`, {
      headers: getHeaders(),
    }).then(handleResponse),

  guardarBracket: (predicciones) =>
    fetch(`${API_BASE}/predicciones/bracket`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ predicciones }),
    }).then(handleResponse),
};

// ── Administrador ───────────────────────────────────────────────────────────
export const adminService = {
  actualizarMarcadorPartido: (id_partido, goles_equipo1, goles_equipo2) =>
    fetch(`${API_BASE}/admin/partido/${id_partido}/marcador`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ goles_equipo1, goles_equipo2 }),
    }).then(handleResponse),

  actualizarClasificadosLlave: (id_partido, id_equipo1, id_equipo2) =>
    fetch(`${API_BASE}/admin/llave/${id_partido}/clasificados`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ id_equipo1, id_equipo2 }),
    }).then(handleResponse),

  establecerPosicionesGrupo: (id_grupo, id_equipo_1ro, id_equipo_2do) =>
    fetch(`${API_BASE}/admin/grupo/${id_grupo}/posiciones`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ id_equipo_1ro, id_equipo_2do }),
    }).then(handleResponse),
};

