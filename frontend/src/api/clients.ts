import type { Presupuesto , Articulo, Cliente} from "./types";
const API_BASE_URL = 'http://localhost:5080/api';

export async function getPresupuestos(): Promise<Presupuesto[]>{
    const response = await fetch(`${API_BASE_URL}/api/presupuestos`);
    if (!response.ok) {
       console.log(response)
    }
    const data: Presupuesto[] = await response.json();
    return data;
}


export async function getArticulos(): Promise<Articulo[]> {
    const response = await fetch(`${API_BASE_URL}/articulos`);
    if (!response.ok) {
        console.log(response)
    }
    const data: Articulo[] = await response.json();
    return data;
}



export async function getClientes(): Promise<Cliente[]> {
    const response = await fetch(`${API_BASE_URL}/clientes`);
    if (!response.ok) {
       console.log(response)
    }
    const data: Cliente[] = await response.json();
    return data;
}

