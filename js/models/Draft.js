import { Player } from "./Player.js";
import { Wallet } from "./Wallet.js";
import { Lineup } from "./Lineup.js";

export class Draft {
    // Nombre del cajon de localStorage
    static STORAGE_KEY = "nbaDraft:state";
    // Precio del jugador mas barata
    static MIN_PRICE = Player.TIERS.at(-1).price;
    // Crea el draft con su monedero y su quinteto 
    constructor(wallet = new Wallet(), lineup = new Lineup()) {
        this.wallet = wallet;
        this.lineup = lineup;
    }
    // Responde preguntas
    canDraft(player) {
        // ¿Ya esta en el quinteto?
        if (this.lineup.has(player)) {
            const result = { ok: false, reason: "Ya está en tu equipo" };
            return result;
        }

        // ¿Hay hueco para su posicion?
        const freeSlots = this.lineup.freeSlotsFor(player);
        if (freeSlots.length === 0) {
            const result = { ok: false, reason: "Posición ocupada" };
            return result;
        }

        // ¿Le llega el dinero?
        const price = player.price();
        if (!this.wallet.canAfford(price)) {
            const result = { ok: false, reason: "Sin presupuesto" };
            return result;
        }

        // ¿Respeta la reserva para los huecos que quedarIan?
        const moneyAfter = this.wallet.remaining() - price;
        const slotsAfter = this.lineup.emptyCount() - 1;
        const reserveAfter = slotsAfter * Draft.MIN_PRICE;
        if (moneyAfter < reserveAfter) {
            const result = { ok: false, reason: "Sin dinero para completar el quinteto" };
            return result;
        }

        // Pasa todas las comprobaciones
        const result = { ok: true, reason: null };
        return result;
    }

    // Draftea al jugador(tiene en cuenta dinero y si hay posiciones disponibles)
    draft(player) {
        const check = this.canDraft(player);
        if (!check.ok) {
            return check;
        }
        const freeSlots = this.lineup.freeSlotsFor(player);
        const slot = freeSlots[0];
        this.lineup.assign(slot, player);
        this.wallet.spend(player.price());
        const result = { ok: true, reason: null };
        return result;
    }
    // Vacia huecos para los jugadores
    release(slot) {
        const player = this.lineup.release(slot);

        if (player !== null) {
            this.wallet.refund(player.price());
        }
    }
    // Reinicia la cartera y el quinteto
    reset() {
        this.wallet = new Wallet();
        this.lineup = new Lineup();
    }
    // Guarda el monedero y el quinteto como texto
    save() {
        const data = { wallet: this.wallet, lineup: this.lineup };
        const text = JSON.stringify(data);
        localStorage.setItem(Draft.STORAGE_KEY, text);
    }
    // Lee ese localstorage. Si esta vacio devuelve un draft nuevo si no, reconstruye el monedero y el quinteto con sus JSON
    static load() {
        const text = localStorage.getItem(Draft.STORAGE_KEY);

        if (text === null) {
            const newDraft = new Draft();
            return newDraft;
        }

        const data = JSON.parse(text);
        const wallet = Wallet.fromJSON(data.wallet);
        const lineup = Lineup.fromJSON(data.lineup);

        const draft = new Draft(wallet, lineup);
        return draft;
    }
}