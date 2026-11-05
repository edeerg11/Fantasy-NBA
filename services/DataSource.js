import { Player } from "../js/models/Player.js";

export class DataSource {

   async getPlayers() {
    throw new Error("getPlayers() debe implementarse en la clase hija");
    }
 // Convierte una lista de datos planos en una lista de objetos
    toPlayers(list) {
       const players = list.map(item => new Player(item));
       return players;

    }

}
