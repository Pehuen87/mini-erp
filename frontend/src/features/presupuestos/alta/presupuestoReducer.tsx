import type { Presupuesto, PresupuestoItem } from "../../../api/types";

type PresupuestoBorrador = Presupuesto & {
    clienteId: number | null;
};

const itemVacio: PresupuestoItem = {
    articuloId: 0,
    articuloCodigo: '',
    articuloDescripcion: '',
    precioUnitario: 0,
    cantidad: 1,
    descuentoPct: 0,
    alicuotaIva: 0,
    subtotalLinea: 0,
};


const RedondearA2Decimales = (numero: number) =>  {
    return Math.round(numero * 100) / 100;
}

const calcularSubtotal = (item: PresupuestoItem) => {
    RedondearA2Decimales(item.precioUnitario * item.cantidad * (1 - item.descuentoPct / 100) * 100);
}


const conTotales = (estado: PresupuestoBorrador, items: PresupuestoItem[]): PresupuestoBorrador => {
    const subtotal = RedondearA2Decimales(items.reduce((acc, item) => acc + item.subtotalLinea, 0));
    const iva = RedondearA2Decimales(items.reduce((acc, item) => acc + (item.subtotalLinea * item.alicuotaIva / 100), 0));
    const total = RedondearA2Decimales(subtotal + iva);
    return { ...estado, items, subtotal, iva, total };
};


export type Accion =
    | { tipo: "cambiarCliente"; clienteId: number }
    | { tipo: "agregarItem" }
    | { tipo: "actualizarItem"; index: number; cambios: Partial<PresupuestoItem> }
    | { tipo: "quitarItem" };



export function presupuestoReducer(estado: PresupuestoBorrador, accion: Accion): PresupuestoBorrador {
    switch (accion.tipo) {
        case "cambiarCliente":
            return { ...estado, clienteId: accion.clienteId };
        case "agregarItem":
            return { ...estado, items: [...estado.items, { ...itemVacio }] };
        case "actualizarItem": {
            const items = estado.items.map((item, i) => {
                if (i !== accion.index) return item;
                const actualizado = { ...item, ...accion.cambios };
                return { ...actualizado, subtotalLinea: calcularSubtotal(actualizado) };
            });
            return conTotales(estado, items);
        }
        default:
            return estado;
    }
}