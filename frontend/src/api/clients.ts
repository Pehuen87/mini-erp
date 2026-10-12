import type { Presupuesto } from "./types";


export async function getPresupuestos(): Promise<Presupuesto[]>{
    const response = await fetch('http://localhost:5080/api/presupuestos');
    if (!response.ok) {
       console.log(response)
    }
    const data: Presupuesto[] = await response.json();
    return data;
}
