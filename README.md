#  NBA Fantasy Draft

Juego web en el que montas un quinteto de la NBA con un presupuesto de **$100M**. Cada partida te ofrece una bolsa aleatoria de jugadores reales: tienes que ficharlos respetando las posiciones y el dinero, y conseguir la **máxima puntuación** posible.

Proyecto hecho con **HTML, CSS y JavaScript vanilla** (sin frameworks), usando programación orientada a objetos, manipulación del DOM, la API de [API-NBA](https://api-sports.io/documentation/nba/v2) y `localStorage`.

---

## Cómo se juega

1. Al empezar, el **mercado** te ofrece una bolsa de jugadores sorteados.
2. Pulsa **Fichar** para añadir un jugador a tu quinteto. Se colocará en la pista, en la primera posición libre que pueda ocupar.
3. Pulsa **Soltar** en la misma fila para quitarlo y recuperar su dinero.
4. Si no te gusta la bolsa, pulsa **Cambiar jugadores**. Tienes **3 cambios** por partida. Los jugadores que ya hayas fichado se quedan en tu equipo.
5. Completa las 5 posiciones y consigue la puntuación más alta.
6. **Reiniciar draft** empieza una partida nueva.

### Reglas

- **Posiciones:** el quinteto tiene 5 ranuras: base (PG), escolta (SG), alero (SF), ala-pívot (PF) y pívot (C). Cada jugador solo puede ocupar las ranuras de su posición (G, F o C).
- **Puntuación:** se calcula con las medias de la temporada:

  > puntos + rebotes × 1,2 + asistencias × 1,5 + robos × 3 + tapones × 3 − pérdidas

- **Niveles y precios:**

  | Nivel | Puntuación | Precio |
  |---|---|---|
  | Superestrella | 40 o más | $30M |
  | Estrella | 20 a 39 | $15M |
  | Rol | menos de 20 | $5M |

- **Reserva mínima:** no puedes fichar a un jugador si después no te quedarían al menos $5M por cada hueco libre. Así siempre puedes completar el quinteto.
- **Bolsa equilibrada:** cada bolsa incluye al menos un jugador de Rol para cada posición, de modo que siempre es posible terminar el equipo.

---

## Funcionalidades

- Quinteto por posiciones sobre una pista de baloncesto dibujada con CSS.
- Marcador con presupuesto restante, gastado, fichados y barra de progreso.
- Tabla del mercado con estadísticas, precio y nivel de cada jugador.
- Botón inteligente: **Fichar**, **Soltar** o bloqueado con el motivo (posición ocupada, sin presupuesto…).
- **Búsqueda** por nombre o equipo y **filtros** por posición (G, F, C), combinables.
- Bolsa aleatoria de jugadores con 3 cambios por partida.
- Contador de puntuación del equipo.
- **Todo se guarda** en `localStorage`: la partida, los filtros y la bolsa siguen ahí al recargar.
- Datos reales de **API-NBA** con caché de 24 horas, y datos locales de respaldo si la API falla.
- Diseño responsive: en escritorio todo cabe en una pantalla; en móvil se adapta en columna.

---

## Cómo arrancarlo

### 1. Servidor local
La app usa módulos de JavaScript (`import`/`export`), que **no funcionan abriendo el `index.html` con doble clic**. Hay que abrirla con un servidor local, por ejemplo:

- la extensión **Live Server** de VS Code (clic derecho en `index.html` → *Open with Live Server*), o
- desde la terminal, en la carpeta del proyecto: `npx serve`

### 2. Archivo de configuración (obligatorio)
El archivo `services/config.js` no está en el repositorio, porque guarda la API key y está en el `.gitignore`. Hay que crearlo antes de arrancar la app:

1. Copia `services/config.example.js` y llama a la copia `services/config.js`.
2. Déjalo así si no tienes clave, o pon tu clave en lugar de `"TU_API_KEY"` (paso 3).

> Si `services/config.js` no existe, la app no arranca, porque `ApiNbaSource.js` lo importa.

### 3. API key (opcional)
Para cargar jugadores reales hace falta una clave gratuita de [API-Sports](https://dashboard.api-football.com/register):

1. Crea una cuenta y copia tu clave en **Account → My Access**.
2. Ponla en `services/config.js`:

   ```js
   export const API_KEY = "tu-clave";
   ```

**Sin clave, la app funciona igualmente** (siempre que exista `config.js`): carga los jugadores de `data/players.json`.

> El plan gratuito permite 100 peticiones al día y 10 por minuto. La app hace una petición por equipo y guarda el resultado en caché 24 horas, así que solo gasta peticiones una vez al día.

---

## Estructura del proyecto

```
├── index.html
├── .gitignore
├── data/
│   └── players.json        Jugadores de respaldo
├── img/
├── styles/
│   └── styles.css
├── js/
│   ├── main.js             Arranque, bolsa, filtros y eventos
│   ├── ui.js               Funciones que pintan la pantalla
│   └── models/
│       ├── Player.js       Un jugador: puntuación, nivel, precio y posiciones
│       ├── Wallet.js       El monedero
│       ├── Lineup.js       El quinteto y sus 5 ranuras
│       └── Draft.js        El coordinador: reglas, fichar, soltar, guardar
└── services/
    ├── config.js           API key (no se sube, está en .gitignore)
    ├── config.example.js   Plantilla para crear config.js
    ├── DataSource.js       Clase base de las fuentes de datos
    ├── ApiNbaSource.js     Jugadores de API-NBA (con caché)
    └── MockSource.js       Jugadores del archivo local
```

### Cómo se conecta todo

```
El usuario pulsa  →  main.js  →  Draft (comprueba y cambia)  →  se guarda  →  renderAll() repinta
```

- Los **modelos** (`models/`) contienen las reglas del juego y no tocan nunca la página.
- Las **fuentes de datos** (`services/`) consiguen los jugadores.
- **`ui.js`** solo lee el estado y lo pinta.
- **`main.js`** escucha los clics y une las piezas.

---

## Programación orientada a objetos

- **Clases:** `Player`, `Wallet`, `Lineup`, `Draft`, `DataSource`, `ApiNbaSource` y `MockSource`.
- **Herencia:** `ApiNbaSource` y `MockSource` heredan de `DataSource` y sobrescriben `getPlayers()`. Heredan `toPlayers()`, que convierte los datos en objetos `Player`. Gracias a esto, `main.js` puede usar cualquiera de las dos sin cambiar nada.
- **Composición:** `Draft` contiene un `Wallet` y un `Lineup`, y les delega el dinero y las ranuras.
- **Persistencia:** las clases que se guardan tienen `toJSON()` y `static fromJSON()`, para que los objetos recuperen sus métodos al leerlos de `localStorage`.

---

## `localStorage`

| Clave | Qué guarda |
|---|---|
| `nbaDraft:state` | La partida: quinteto y dinero gastado |
| `nbaDraft:prefs` | Los filtros: texto buscado y posición |
| `nbaDraft:pool` | La bolsa de jugadores y los cambios que quedan |
| `nbaDraft:cache` | Los jugadores de la API, con la hora, durante 24 horas |

Para empezar de cero, se pueden borrar desde DevTools → **Application** → **Local Storage**.

---

## Datos

- **API-NBA** ([api-sports.io](https://api-sports.io/documentation/nba/v2)), temporada 2024-25. La API devuelve estadísticas **por partido**, así que la app las agrupa por jugador y calcula las medias. Se descartan los jugadores con menos de 10 partidos. A los jugadores que la API envía sin posición se les asigna a mano.
- **`data/players.json`**: jugadores reales con estadísticas **aproximadas**, usados solo como respaldo cuando la API no está disponible.
