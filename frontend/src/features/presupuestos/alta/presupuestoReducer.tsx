import type { Presupuesto, PresupuestoItem } from "../../../api/types";


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



export type Accion =
  | { tipo: "cambiarCliente"; clienteId: number }
  | { tipo: "agregarItem" }
  | { tipo: "actualizarItem" }
  | { tipo: "quitarItem"};



  export function presupuestoReducer(estado: Presupuesto, accion: Accion): Presupuesto {
  switch (accion.tipo) {
    case "cambiarCliente":
      return { ...estado, clienteId: accion.clienteId };
    case "agregarItem":
      return { ...estado, items: [...estado.items, { ...itemVacio }] };
    default:
        return estado;
  }
}