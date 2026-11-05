import { Draft } from "./models/Draft.js";
import { MockSource } from "../services/MockSource.js";
import { renderScoreboard, renderLineup, renderMarket } from "./ui.js";
import { ApiNbaSource } from "../services/ApiNbaSource.js";
import { Lineup } from "./models/Lineup.js";

// Nombres de los cajones de localStorage
const PREFS_KEY = "nbaDraft:prefs";
const POOL_KEY = "nbaDraft:pool";
// Cambios de bolsa que se dan por partida (el contador es rerolls)
const MAX_REROLLS = 3;
/* Cuantas estrellas entran en cada bolsa 
 *(los de Rol se reservan aparte uno por posicion, esto se hace para que no exista la posibildad de que falten jugadores)
 */
const POOL_SIZE = { "Superestrella": 1, "Estrella": 2 };

/* Carga los jugadores de la API y si falla usa los de data/players.json
 * Las dos fuentes tienen el mismo getPlayers (herencia de DataSource)
 */
async function loadPlayers() {
    try {
        const api = new ApiNbaSource();
        const apiPlayers = await api.getPlayers();
        return apiPlayers;
    } catch (error) {
        console.warn("No se pudo cargar la API, usando datos locales:", error);
        const mock = new MockSource();
        const mockPlayers = await mock.getPlayers();
        return mockPlayers;
    }
}

// Datos de la partida: todos los jugadores, el draft guardado y los filtros guardados
const players = await loadPlayers();
const draft = Draft.load();
const filters = loadPrefers();
// La bolsa y los cambios que quedan van con let porque se reasignan al cambiar o reiniciar
let pool;
let rerolls;
loadPool();

// Lee los filtros guardados si no hay nada devuelve los de por defecto
function loadPrefers() {
    const text = localStorage.getItem(PREFS_KEY);

    if (text === null) {
        return { query: "", position: "all" };
    }
    const prefs = JSON.parse(text);

    return prefs;
}

// Guarda los filtros en su cajon
function savePrefs() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(filters));
}

// Pone en negro (aria-pressed="true") el boton de la posicion que hay en filters
function syncFilterButtons() {
    const containerButtons = document.getElementById("filters").querySelectorAll("button");

    for (const elmnt of containerButtons) {
        const active = String(elmnt.dataset.filter === filters.position);
        elmnt.setAttribute("aria-pressed", active);
    }
}

/* Elige n elementos al azar de una lista (barajando una copia)
 * Si le pedimos toda la longitud de la lista sirve para barajarla entera
 */
function pickRandom(list, n) {
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, n);
    return picked;
}

// Sortea una bolsa de jugadores para la partida
function createPool() {
    const pool = [];

    // Un jugador de Rol reservado para cada ranura (con esto conseguimos que nunca te quedes sin rellenar el equipo)
    for (const slot of Lineup.SLOTS) {
        const candidates = players.filter(p =>
            p.tier().name === "Rol" &&
            p.canPlay(slot) &&
            !pool.includes(p)
        );
        pool.push(...pickRandom(candidates, 1));
    }

    // Los demas tipos de jugadores por niveles, sin repetir
    for (const tierName of Object.keys(POOL_SIZE)) {
        const candidates = players.filter(p =>
            p.tier().name === tierName && !pool.includes(p)
        );
        const amount = POOL_SIZE[tierName];
        pool.push(...pickRandom(candidates, amount));
    }

    // Un pivot extra de cualquier nivel, para que haya mas donde elegir en la C
    const extraCenters = players.filter(p => p.canPlay("C") && !pool.includes(p));
    pool.push(...pickRandom(extraCenters, 1));

    // Barajamos para que el orden de la tabla no delate quien es quien
    const shuffled = pickRandom(pool, pool.length);
    return shuffled;
}

// Guarda solo los ids de la bolsa y los cambios que quedan
function savePool() {
    const data = { ids: pool.map(p => p.id), rerolls: rerolls };
    localStorage.setItem(POOL_KEY, JSON.stringify(data));
}

/* Recupera la bolsa guardada (buscando los jugadores por su id)
 * Si no hay nada o falta algun jugador sortea una nueva con todos los cambios
 */
function loadPool() {
    const text = localStorage.getItem(POOL_KEY);

    if (text !== null) {
        const data = JSON.parse(text);
        const saved = players.filter(el => data.ids.includes(el.id));
        if (saved.length === data.ids.length) {
            pool = saved;
            rerolls = data.rerolls;
            return;
        }
    }

    pool = createPool();
    rerolls = MAX_REROLLS;
    savePool();
}

// Se queda con los jugadores que coinciden con el texto buscado y con la posicion elegida
function filterPlayers(players, filters) {
    const query = filters.query.toLowerCase();

    const result = players.filter(player => {
        const matchesText =
            player.name.toLowerCase().includes(query) ||
            player.team.toLowerCase().includes(query);

        const matchesPosition =
            filters.position === "all" ||
            player.positions.includes(filters.position);

        return matchesText && matchesPosition;
    });

    return result;
}

// Repinta toda la pantalla se llama despues de cualquier cambio
function renderAll() {
    renderScoreboard(draft);
    renderLineup(draft);
    renderMarket(filterPlayers(pool, filters), draft);

    // Boton de cambiar jugadores: muestra los cambios que quedan y se bloquea en 0
    const rerollButton = document.getElementById("reroll");
    rerollButton.textContent = `Cambiar jugadores (${rerolls})`;
    rerollButton.disabled = rerolls === 0;
}

// Primer pintado: restauramos el buscador y el boton de posicion guardados
document.getElementById("search").value = filters.query;
syncFilterButtons();
renderAll();

/* Clic en la tabla: un solo listener para todos los botones
 * Con data-action sabemos si hay que fichar o soltar
 */
document.getElementById("players").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button === null) {
        return;
    }

    const id = Number(button.dataset.id);
    const player = pool.find(p => p.id === id);
    const action = button.dataset.action;

    if (action === "release") {
        // Para soltar necesitamos su ranura no el jugador
        const slot = draft.lineup.slotOf(player);
        draft.release(slot);
    } else {
        draft.draft(player);
    }

    draft.save();
    renderAll();
});

// Reiniciar: draft vacio, bolsa nueva y otra vez 3 cambios
document.getElementById("reset").addEventListener("click", () => {
    draft.reset();
    draft.save();
    pool = createPool();
    rerolls = MAX_REROLLS;
    savePool();
    renderAll();
});

// Buscador: filtra a cada letra que se escribe
document.getElementById("search").addEventListener("input", (event) => {
    filters.query = event.target.value;

    savePrefs();
    renderAll();
});

// Botones de posicion: guardamos la elegida y la marcamos
document.getElementById("filters").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button === null) {
        return;
    }
    filters.position = button.dataset.filter;

    syncFilterButtons();
    savePrefs();
    renderAll();
});

/* Cambiar jugadores: gasta un cambio y sortea otra bolsa
 * Los jugadores ya fichados se quedan en la pista
 */
document.getElementById("reroll").addEventListener("click", () => {
    if (rerolls === 0) {
        return;
    }
    rerolls -= 1;
    pool = createPool();
    savePool();
    renderAll();
});