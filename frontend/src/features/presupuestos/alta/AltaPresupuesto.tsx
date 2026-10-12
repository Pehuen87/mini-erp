
import { useState, useEffect } from "react"
import type { Articulo, Presupuesto } from "../../../api/types"
import { getArticulos } from "../../../api/clients";
import SelectorCliente from "./SelectorCliente";



export function AltaPresupuesto() {
    const [articulos, setArticulos] = useState<Articulo[]>([]);

    const [presupuesto, setPresupuesto] = useState<Presupuesto>();


    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchArticulos = async () => {
            try {
                setLoading(true);
                const data: Articulo[] = await getArticulos();
                setArticulos(data);
            } catch (err) {
                setError(`No se pudieron cargar los artículos: err}`);
            } finally {
                setLoading(false);
            }
        };

        fetchArticulos();
    }, []);



    return (
        <>
            <header className="page-header">
                <h1>Nuevo Presupuesto</h1>
                <button type="button" onClick={() => console.log('lala')}>
                    Volver
                </button>
            </header>


          <div>
            <SelectorCliente value={presupuesto?.clienteId ?? 0} onChange={(id) => console.log(id)} />
          </div>
  

            <table>
                <thead>
                    <tr>
                        <th>
                            Descripcion
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {
                        articulos.map(element =>
                            <tr key={element.id}>
                                <td>
                                    {element.descripcion}
                                </td>
                            </tr>
                        )
                    }
                </tbody>
            </table>
        </>
    )
}

