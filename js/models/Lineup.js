import { Player } from "./Player.js";
/* Las 5 ranuras en orden(estan en este orden para que siempre haya la posicion C. 
 * Ya que a veces no rellena por que la api no devuelve explicitamente esta posicion)
 */
export class Lineup {
    static SLOTS = [
        "C",
        "PF",
        "SF",
        "SG",
        "PG"
    ]
    // Crea las ranuras
    constructor() {
        this.slots = {
            PG: null,
            SG: null,
            SF: null,
            PF: null,
            C: null,
        };
    }
    // Revisa que posiciones hay libres en el campito para poder fichar
    freeSlotsFor(player) {
        // crea la lista de huecos
        const freeSlots = [];
        // recorre los huecos en orden
        for (const slot of Lineup.SLOTS) {
            // verifica si hay hueco
            const isEmpty = this.slots[slot] === null;
            // pregunta si el jugador puede jugar en esa posicion
            const canPlay = player.canPlay(slot);
            // solo lo asigna si cumple las dos condiciones
            if (isEmpty && canPlay) {
                freeSlots.push(slot);
            }
        }

        return freeSlots;
    }
    // Asigna al jugador a la posicion
    assign(slot, player) {
        this.slots[slot] = player;
    }
    // Vacia la posicion y devuelve el jugador
    release(slot) {
        const player = this.slots[slot];
        this.slots[slot] = null;
        return player;
    }
    /* Comprueba con "some" si hay un hueco ocupandose (da igual la posicion)
     * Compara el id ya que se reconstruye con el localstorage y es otro objeto
     */
    has(player) {
        const players = Object.values(this.slots);
        const isInLineup = players.some(p => p !== null && p.id === player.id);
        return isInLineup;
    }
    /* Comprueba y devuelve en que posicion esta el hueco que ocupa el jugador
     * Este metodo tiene sentido para saber que jugador se debe quitar del quinteto, es decir, 
     * sin este metodo no hay forma de que el boton de soltar sepa que jugador(hueco) especificamente tiene que volver a estar disponible en la lista
     */
    slotOf(player) {
        for (const slot of Lineup.SLOTS) {
            const current = this.slots[slot];
            if (current !== null && current.id === player.id) {
                return slot;
            }
        }
        return null;
    }
    // Devuelve cuantas posiciones estan libres
    emptyCount() {
        const players = Object.values(this.slots);
        const emptySlots = players.filter(p => p === null);
        const count = emptySlots.length;
        return count;
    }
    // suma la puntuacion de los jugadores fichados
    totalScore() {
        const players = Object.values(this.slots);
        let total = 0;

        for (const elmt of players) {
            if (elmt !== null) {
                total += elmt.score();
            }
        }

        return total;
    }
    // Devuelve un objeto para pasarlo a JSON
    toJSON() {
        const data = {
            slots: this.slots,
        };
        return data;
    }
    // Reconstruye el quinteto a partir de lo guardado en localStorage
    static fromJSON(data) {
        const lineup = new Lineup();

        for (const slot of Lineup.SLOTS) {
            const saved = data.slots[slot];

            if (saved !== null) {
                const player = Player.fromJSON(saved);
                lineup.assign(slot, player);
            }
        }

        return lineup;
    }

}