export class Wallet {
    // Crea el monedero con 100M Y sin gastar nada
    constructor(total = 100, spent = 0) {
        this.total = total;
        this.spent = spent;
    }
    // Hace la resta para saber que tenemos cuando pinchamos en un jugador
    remaining() {
        const remain = this.total - this.spent
        return remain
    }
    // Verifica si tenemos dinero para fichar un jugador
    canAfford(price) {
        if (price <= this.remaining()) {
            return true;
        } else {
            return false;
        }
    }
    // Suma el precio a lo gastado, es decir, hace la suma de lo gastado cuando fichas
    spend(price) {
        this.spent += price;
    }
    // Resta lo gastado al soltar un jugador
    refund(price) {
        this.spent -= price;
    }
    // Prepara los datos para guardarlos
    toJSON() {
        return {
            total: this.total,
            spent: this.spent,
        };
    }
    // Crea nuevo objeto con los datos guardados
    static fromJSON(data) {
        return new Wallet(data.total, data.spent);
    }

}