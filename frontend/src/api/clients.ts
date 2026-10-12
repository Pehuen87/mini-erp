import type { Presupuesto , Articulo, Cliente} from "./types";
const API_BASE_URL = 'http://localhost:5080/api';


async function errorHandler(response: Response): Promise<never> {
        const body = await response.json().catch(() => null);
        const error = body?.error ?? `HTTP ${response.status}`
        alert(`Se encontró un error: ${error}`);
        throw new Error(error);
}


export async function getPresupuestos(): Promise<Presupuesto[]>{
    const response = await fetch(`${API_BASE_URL}/api/presupuestos`);
    if (!response.ok) {
        await errorHandler(response)
    }
    const data: Presupuesto[] = await response.json();
    return data;
}


export async function getArticulos(): Promise<Articulo[]> {
    const response = await fetch(`${API_BASE_URL}/articulos`);
    if (!response.ok) {
        await errorHandler(response)
    }
    const data: Articulo[] = await response.json();
    return data;
}



export async function getClientes(): Promise<Cliente[]> {
    const response = await fetch(`${API_BASE_URL}/clientes`);
    if (!response.ok) {
        await errorHandler(response)
    }
    const data: Cliente[] = await response.json();
    return data;
}


export async function savePresupuesto(presupuesto: Presupuesto): Promise<Presupuesto> {
    type PresupuestoRequest = Pick<Presupuesto, "clienteId" | "validezDias" | "items">;
    const response = await fetch(`${API_BASE_URL}/presupuestos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(presupuesto as PresupuestoRequest),
    });
    if (!response.ok) {
        await errorHandler(response)
    }
    const data: Presupuesto = await response.json();
    return data;
}



