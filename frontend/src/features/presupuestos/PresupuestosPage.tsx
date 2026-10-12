import { useState, useEffect } from "react"
import type { Presupuesto } from "../../api/types"
import { getPresupuestos } from "../../api/clients";


export function PresupuestosPage() {
    const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
    const [vista, setVista] = useState<string>('lista');

    useEffect(() => {
        let cancelado = false;
        const fetchPresupuestos = async () => {
            try {
                const data = await getPresupuestos();
                if (!cancelado) {
                    setPresupuestos(data);
                }
            } catch (err) {
            } finally {
            }
        };

        fetchPresupuestos();
        return () => {
            cancelado = true;
        };
    }, []);
    return (
        <>
            <table>
                <thead>
                    <tr>
                        <th>
                        Id
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {
                        presupuestos.map(element =>
                            <tr>
                                {element.id}
                            </tr>
                        )
                    }
                </tbody>
            </table>

            <button onClick={()=>setVista('alta')}>Nuevo Presupuesto</button>
        </>
    )
}

