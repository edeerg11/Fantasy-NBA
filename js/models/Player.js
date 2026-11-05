export class Player {
    // Posiciones
    static SLOT_POSITION = {
        PG: "G",
        SG: "G",
        SF: "F",
        PF: "F",
        C: "C",
    };
    // Rankings de los jugadores
    static TIERS = [
        { min: 40, name: "Superestrella", price: 30 },
        { min: 20, name: "Estrella", price: 15 },
        { min: 0, name: "Rol", price: 5 }
    ]

    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.team = data.team;
        this.positions = data.position.split("-");

        this.pts = data.pts;
        this.reb = data.reb;
        this.ast = data.ast;
        this.stl = data.stl;
        this.blk = data.blk;
        this.tov = data.tov;
    }
    // Redondear total de estadisticas(Los robos y tapones suman mas, con las perdidas pierdes puntos)
    score() {
        const total =
            this.pts +
            this.reb * 1.2 +
            this.ast * 1.5 +
            this.stl * 3 +
            this.blk * 3 -
            this.tov;

        return Math.round(total);
    }
    // Devolver tier del jugador
    tier() {
        const score = this.score();
        return Player.TIERS.find(tier => tier.min <= score);
    }
    // Devuelve el precio dentro del tier
    price() {
        const price = this.tier().price;
        return price;
    }
    // Verifica si el jugador puede optar a la posicion
    canPlay(slot) {
        const position = Player.SLOT_POSITION[slot];
        return this.positions.includes(position);
    }
    // Reestructura el nombre para que se vea correctamente
    shortName() {
        const parts = this.name.split(" ");

        if (parts.length === 1) {
            return this.name;
        }

        const initial = parts[0][0];
        const lastName = parts.at(-1);

        return `${initial}. ${lastName}`;
    }
    // Prepara los datos para guardarlos
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            team: this.team,
            position: this.positions.join("-"),
            pts: this.pts,
            reb: this.reb,
            ast: this.ast,
            stl: this.stl,
            blk: this.blk,
            tov: this.tov,
        };
    }
    // Crea nuevo objeto con los datos guardados
    static fromJSON(data) {
        return new Player(data);
    }

}