import { Lineup } from "./models/Lineup.js";

/* Pinta el marcador: restante, gastado, fichados y la barra
 * Solo lee el draft, no cambia nada
 */
export function renderScoreboard(draft) {
    // Sacamos los datos del monedero y del quinteto del draft
    const remainingUi = draft.wallet.remaining();
    const spentUi = draft.wallet.spent;
    const totalUi = draft.wallet.total;
    // Fichados = huecos totales menos los libres
    const transfer = Lineup.SLOTS.length - draft.lineup.emptyCount();
    // Que parte del presupuesto llevamos gastada (de 0 a 100) para el ancho de la barra
    const percentage = spentUi / totalUi * 100;

    // Los escribimos en la pagina (la barra se pinta cambiando su ancho)
    document.getElementById("budget-remaining").textContent = `$${remainingUi}M`;
    document.getElementById("budget-spent").textContent = `$${spentUi}M`;
    document.getElementById("drafted-count").textContent = `${transfer}/${Lineup.SLOTS.length}`;
    document.getElementById("budget-bar").style.width = `${percentage}%`;
}

/* Pinta la pista: quien hay en cada ranura, los puestos libres y la puntuacion
 * La clase is-empty es la que hace que el circulo se vea vacio (el aspecto lo pone el CSS)
 */
export function renderLineup(draft) {
    for (const slot of Lineup.SLOTS) {
        // Buscamos la ranura por su data-slot, y su etiqueta dentro de ella
        const element = document.querySelector(`[data-slot="${slot}"]`);
        const label = element.querySelector(".slot-label");
        const player = draft.lineup.slots[slot];

        // Si hay jugador ponemos su nombre corto y precio si no "Libre"
        if (player !== null) {
            label.textContent = `${player.shortName()} · $${player.price()}M`;
            element.classList.remove("is-empty");
        } else {
            label.textContent = "Libre";
            element.classList.add("is-empty");
        }
    }

    // Texto de puestos libres y puntuacion total del equipo junto al titulo
    const freeSlots = draft.lineup.emptyCount();
    document.getElementById("free-slots").textContent = `${freeSlots} puestos libres`;

    const teamScore = draft.lineup.totalScore();
    document.getElementById("team-score").textContent = `Puntuación: ${teamScore}`;
}

// Crea una celda (span) con un texto para no repetirlo en cada columna de la tabla
function createCell(text) {
    const cell = document.createElement("span");
    cell.textContent = text;
    return cell;
}

/* Pinta la tabla del mercado: una fila por jugador con sus datos y su boton
 * El boton puede ser Fichar, Soltar o estar bloqueado con el motivo
 */
export function renderMarket(players, draft) {
    // Vaciamos la tabla para que no se repitan las filas al repintar
    const container = document.getElementById("players");
    container.replaceChildren();

    for (const player of players) {
        const row = document.createElement("div");
        row.className = "table-row";

        // El data-id dice de que jugador es el boton (lo lee main.js al pulsarlo)
        const button = document.createElement("button");
        button.dataset.id = player.id;

        const slot = draft.lineup.slotOf(player);

        if (slot !== null) {
            // Ya esta fichado: boton para soltarlo
            button.textContent = "Soltar";
            button.dataset.action = "release";
            button.className = "is-release";
        } else {
            // No esta fichado: preguntamos si se puede fichar y si no mostramos el motivo
            const check = draft.canDraft(player);
            button.dataset.action = "draft";
            button.disabled = !check.ok;
            if (check.ok) {
                button.textContent = "Fichar";
            } else {
                button.textContent = check.reason;
                // Si el motivo no cabe en el boton, se ve entero al pasar el raton por encima
                button.title = check.reason;
            }
        }

        // Metemos las celdas en el mismo orden que las columnas de la cabecera
        row.append(
            createCell(player.name),
            createCell(player.positions.join("-")),
            createCell(player.team),
            createCell(player.score()),
            createCell(`$${player.price()}M`),
            createCell(player.tier().name),
            button
        );
        container.append(row);
    }
}