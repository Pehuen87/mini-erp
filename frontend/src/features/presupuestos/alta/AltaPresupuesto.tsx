
import { useState, useEffect, useReducer } from "react"
import type { Articulo } from "../../../api/types"
import { getArticulos, savePresupuesto } from "../../../api/clients";
import SelectorCliente from "./SelectorCliente";
import { presupuestoReducer } from "./presupuestoReducer";
import Select from 'react-select';



export function AltaPresupuesto() {
    const [articulos, setArticulos] = useState<Articulo[]>([]);

    const [presupuesto, dispatch] = useReducer(presupuestoReducer, {
        id: 0,
        clienteId: 0,
        fecha: new Date().toISOString(),
        validezDias: 15,
        items: [],
        subtotal: 0,
        iva: 0,
        total: 0,
        numero: 0,
        clienteRazonSocial: '',
        estado: 'pendiente'
    });

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


    const agregarItem = () => dispatch({ tipo: "agregarItem" });


    return (
        <>
            <header className="page-header">
                <h1>Nuevo Presupuesto</h1>
                <button type="button" onClick={() => console.log('lala')}>
                    Volver
                </button>
            </header>


            <div>
                <SelectorCliente value={presupuesto.clienteId ?? 0} onChange={(id) => dispatch({ tipo: "cambiarCliente", clienteId: id })} />            </div>




            <table>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                        <th>Cant</th>
                        <th>Unitario</th>
                        <th>Desc %</th>
                        <th>IVA</th>
                        <th>Subtotal linea</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        presupuesto?.items.map((articulo, index) =>
                            <tr key={index}>
                                <td>

                                    {articulo.articuloCodigo}
                                </td>
                                <td>
                                    <Select
                                        placeholder="Buscar por código o descripción…"
                                        noOptionsMessage={() => 'No hay artículos que coincidan'}
                                        value={articulo ? { value: articulo.articuloCodigo, label: articulo.articuloDescripcion } : null}
                                        options={articulos.filter(a => !presupuesto.items.find(i => i.articuloId == a.id)).map((a) => ({
                                            value: a.codigo,
                                            label: a.descripcion,
                                        }))}
                                        onChange={(selectedOption) => {
                                            if (selectedOption) {
                                                const elegido = articulos.find((a) => a.codigo === selectedOption.value); 
                                                if(elegido){
                                                    dispatch({ tipo: "actualizarItem", index, cambios: { articuloId: elegido.id, articuloCodigo: elegido.codigo, articuloDescripcion: elegido.descripcion, precioUnitario: elegido.precioUnitario, alicuotaIva: elegido.alicuotaIva } });
                                                }
                                            }
                                        }}
                                    />
                                </td>
                                <td>
                                    {articulo.cantidad}
                                </td>
                                <td>
                                    {articulo.precioUnitario}
                                </td>
                                <td>
                                    {articulo.descuentoPct}
                                </td>
                                <td>
                                    {articulo.alicuotaIva}
                                </td>
                                <td>
                                    {articulo.subtotalLinea}
                                </td>
                            </tr>
                        )
                    }
                </tbody>
            </table>


            <button onClick={agregarItem} >
                Agregar artículo
            </button>


            <footer>
                <button type="button" onClick={() => savePresupuesto(presupuesto)}>
                    Guardar Presupuesto
                </button>
            </footer>
        </>
    )
}

