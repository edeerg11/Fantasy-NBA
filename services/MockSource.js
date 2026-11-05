import { DataSource } from "./DataSource.js";

export class MockSource extends DataSource {
    // Sobrescribe Datasource (Solo se usa en caso de fallo en la API,tambien se uso al principio del proyecto para hacer pruebas sin la API)
    async getPlayers() {
        const response = await fetch("data/players.json");

        if (!response.ok) {
            throw new Error("No se pudo cargar players.json");
        }

        const list = await response.json();
        const players = this.toPlayers(list);
        return players;
    }

}