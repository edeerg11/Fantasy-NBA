import { DataSource } from "./DataSource.js";
import { API_KEY } from "./config.js";

export class ApiNbaSource extends DataSource {
    static BASE_URL = "https://v2.nba.api-sports.io";
    static SEASON = 2024;
    static TEAMS = [2, 8, 9, 11, 24, 25, 21, 22, 27];
    static POSITIONS = {
        PG: "G",
        SG: "G",
        G: "G",
        SF: "F",
        PF: "F",
        F: "F",
        C: "C",
    };
    // Jugadores que la API manda sin posicion (null en todos sus partidos): se la ponemos a mano
    static MANUAL_POSITIONS = {
        432: "C",      // Kristaps Porzingis
        159: "C",     // Joel Embiid (cambia XXXX por su id)
    };
    static MIN_GAMES = 10;
    // Estas lineas valen para que no gastes todas las peticiones cada vez que referescas, asi se almacenan en la primera llamada
    // Cache del cajon
    static CACHE_KEY = "nbaDraft:cache";
    // Su caducidad
    static CACHE_TTL = 24 * 60 * 60 * 1000;
    /*
     * Con este metodo se habla con la api para recibir los datos que queremos(en nuestro caso nos manda partidos
     * asi que debajo los normalizamos para que nos salgan los datos que queremos)
     * */
    async fetchTeam(teamId) {
        const url = `${ApiNbaSource.BASE_URL}/players/statistics?team=${teamId}&season=${ApiNbaSource.SEASON}`;

        const response = await fetch(url, {
            headers: { "x-apisports-key": API_KEY }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status} al cargar el equipo ${teamId}`);
        }

        const data = await response.json();

        if (Object.keys(data.errors).length > 0) {
            throw new Error(`La API devolvio un error: ${JSON.stringify(data.errors)}`);
        }

        const rows = data.response;
        return rows;
    }
    // Como la API devuelve partidos los convertimos en jugadores al estilo de (/data/players.json)
    normalize(rows) {
        // Creamos objeto vacio(cada clave sera el id del jugador)
        const groups = {};
        /* Recorre todos los partidos, se salta los partidos que no jugo */
        for (const row of rows) {
            const minutes = Number(row.min);
            if (!(minutes > 0)) {
                continue;
            }

            const id = row.player.id;
            /* Si es el primer partido que vemos de este jugador, le crea su ficha con todo a 0 */
            if (groups[id] === undefined) {
                groups[id] = {
                    id: id,
                    name: `${row.player.firstname} ${row.player.lastname}`,
                    team: row.team.code,
                    games: 0,
                    pts: 0,
                    reb: 0,
                    ast: 0,
                    stl: 0,
                    blk: 0,
                    tov: 0,
                    position: ApiNbaSource.MANUAL_POSITIONS[id] ?? null,
                };
            }
            /* Suma un partido y sus estadisticas, para luego sacar las medias */
            const group = groups[id];
            group.games += 1;
            group.pts += row.points;
            group.reb += row.totReb;
            group.ast += row.assists;
            group.stl += row.steals;
            group.blk += row.blocks;
            group.tov += row.turnovers;
            /* Apunta su posicion traducida a nuestras letras (G, F o C)
             * La API manda la misma posicion en todos sus partidos, asi que nos quedamos con la primera valida
             * (en algunos partidos viene null, esos se ignoran)
             */
            const letter = ApiNbaSource.POSITIONS[row.pos];
            if (group.position === null && letter !== undefined) {
                group.position = letter;
            }
        }

        // Pasamos las fichas de objeto a lista
        const all = Object.values(groups);

        /* Descartamos a los que tienen pocos partidos (la media no es fiable)
         * y a los que nunca tuvieron posicion
         */
        const valid = all.filter(group =>
            group.games >= ApiNbaSource.MIN_GAMES &&
            group.position !== null
        );

        /* Convertimos cada ficha en un jugador con la misma forma que players.json:
         * las sumas se dividen entre los partidos para sacar las medias
         */
        const players = valid.map(group => ({
            id: group.id,
            name: group.name,
            team: group.team,
            position: group.position,
            pts: this.average(group.pts, group.games),
            reb: this.average(group.reb, group.games),
            ast: this.average(group.ast, group.games),
            stl: this.average(group.stl, group.games),
            blk: this.average(group.blk, group.games),
            tov: this.average(group.tov, group.games),
        }));

        return players;
    }
    // Recibe una suma y un numero de partidos y devuelve la media por partido redondeada a un decimal.
    average(total, games) {
        const result = Math.round(total / games * 10) / 10;
        return result;
    }

    /* Devuelve los jugadores de la API como objetos Player (sustituye al getPlayers de DataSource)
     * Primero mira la cache, y si no hay, pide los equipos a la API
     */
    async getPlayers() {
        // Si hay jugadores guardados de hace menos de 24h los usamos y no gastamos peticiones
        const cached = this.readCache();
        if (cached !== null) {
            const players = this.toPlayers(cached);
            return players;
        }

        /* Pedimos los partidos de cada equipo, uno detras de otro (asi no nos pasamos del limite por minuto)
         * y los juntamos todos en una sola lista
         */
        const allRows = [];
        for (const teamId of ApiNbaSource.TEAMS) {
            const rows = await this.fetchTeam(teamId);
            allRows.push(...rows);
        }

        // Convertimos todos los partidos en jugadores con sus medias (todos juntos por si alguno cambio de equipo)
        const list = this.normalize(allRows);

        // Guardamos la lista en la cache para las proximas recargas
        this.writeCache(list);

        // Los pasamos a objetos Player con el metodo heredado de DataSource
        const players = this.toPlayers(list);
        return players;
    }
    // Devuelve la lista guardada si existe y tiene menos de 24 horas. En cualquier otro caso, devuelve null
    readCache() {
        const text = localStorage.getItem(ApiNbaSource.CACHE_KEY);
        if (text === null) {
            return null;
        }

        const data = JSON.parse(text);
        const age = Date.now() - data.savedAt;
        if (age > ApiNbaSource.CACHE_TTL) {
            return null;
        }

        const list = data.list;
        return list;
    }
    // Guarda en localStorage la lista de jugadores ya normalizada con la hora a la que se guardó
    writeCache(list) {
        const data = { savedAt: Date.now(), list: list };
        localStorage.setItem(ApiNbaSource.CACHE_KEY, JSON.stringify(data));
    }
}