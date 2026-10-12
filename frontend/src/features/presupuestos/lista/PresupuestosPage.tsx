import { useState, useEffect } from "react"
import type { Presupuesto } from "../../../api/types"
import { getPresupuestos } from "../../../api/clients";
import { AltaPresupuesto } from "../alta/AltaPresupuesto";


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


  if (vista === 'alta') {
    return (
      <AltaPresupuesto/>
    );
  }



    return (
        <>
            <header className="page-header">
                <h1>Presupuestos</h1>
                <button type="button" onClick={() => setVista('alta')}>
                    + Nuevo presupuesto
                </button>
            </header>
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
                            <tr key={element.id}>
                                <td>
                                {element.id}
                                </td>
                            </tr>
                        )
                    }
                </tbody>
            </table>
        </>
    )
}

