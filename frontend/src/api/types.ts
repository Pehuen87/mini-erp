import type { components } from "./schema"

type SCHEMA = components["schemas"];

export type Articulo = Required<SCHEMA["ArticuloDto"]>;
export type Cliente = Required<SCHEMA["ClienteDto"]>;
export type Factura = Required<SCHEMA["FacturaDto"]>;
export type PresupuestoItem = Required<SCHEMA["PresupuestoItemDto"]>;

//export type Presupuesto = Required<SCHEMA["PresupuestoDto"]>;
//Consulté a Claude sobre cómo redefinir items para que sea un array sin null, para evitar errores si quiero usar un .map por ejemplo. Respondio: Omit y una intersección con &.
export type Presupuesto = Required<Omit<SCHEMA["PresupuestoDto"], "items">> & {
    items: PresupuestoItem[];
};

export type CrearPresupuestoRequest = Required<SCHEMA["CrearPresupuestoRequest"]>;
export type CrearPresupuestoItem = Required<SCHEMA["CrearPresupuestoItemDto"]>;

