
import { useState, useEffect, useReducer } from "react"
import type { Articulo, Presupuesto } from "../../../api/types"
import { getArticulos, savePresupuesto } from "../../../api/clients";
import SelectorCliente from "./SelectorCliente";
import { presupuestoReducer } from "./presupuestoReducer";
import Select from 'react-select';

const moneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

interface Props {
  onVolver: () => void;
  onGuardado: (presupuesto: Presupuesto) => void;
}


export function AltaPresupuesto({onVolver, onGuardado}: Props){
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
    
    
    const validarYGuardarPresupuesto = async () => {
        const items = presupuesto.items.filter(item => item.articuloId !== 0);
        try {
            setError(null);
            const guardado = await savePresupuesto({ ...presupuesto, items });
            onGuardado(guardado);
        } catch (err) {
            setError(`No se pudo guardar el presupuesto: ${err}`);
        }
    }


    useEffect(() => {
        const fetchArticulos = async () => {
            try {
                setLoading(true);
                const data: Articulo[] = await getArticulos();
                setArticulos(data);
            } catch (err) {
                setError(`No se pudieron cargar los artículos: ${err}`);
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
                <button type="button" className="btn-secondary" onClick={onVolver}>
                    Volver
                </button>
            </header>


            <div className="field">
                <label htmlFor="cliente-select">Cliente</label>
                <SelectorCliente value={presupuesto.clienteId ?? 0} onChange={(id) => dispatch({ tipo: "cambiarCliente", clienteId: id })} />
            </div>


            <div className="table-wrap">
            <table aria-label="Ítems del presupuesto">
                <thead>
                    <tr>
                        <th scope="col">Código</th>
                        <th scope="col" className="expand">Descripción</th>
                        <th scope="col" className="num">Cant.</th>
                        <th scope="col" className="num">Unitario</th>
                        <th scope="col" className="num">Desc. %</th>
                        <th scope="col" className="num">IVA</th>
                        <th scope="col" className="num">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        presupuesto?.items.map((articulo, index) =>
                            <tr key={index}>
                                <td className="mono">
                                    {articulo.articuloCodigo || '—'}
                                </td>
                                <td>
                                    <Select
                                        classNamePrefix="rs"
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
                                <td className="num">
                                    <input
                                        type="number"
                                        aria-label={`Cantidad fila ${index + 1}`}
                                        min={1}
                                        step={1}
                                        value={articulo.cantidad}
                                        onChange={(e) => {
                                            const cantidad = Math.max(1, Math.floor(Number(e.target.value)) || 1);
                                            dispatch({ tipo: "actualizarItem", index, cambios: { cantidad } });
                                        }}
                                    />
                                </td>
                                <td className="num">
                                    {moneda.format(articulo.precioUnitario)}
                                </td>
                                <td className="num">
                                    <input
                                        type="number"
                                        aria-label={`Descuento % fila ${index + 1}`}
                                        min={0}
                                        max={100}
                                        value={articulo.descuentoPct}
                                        onChange={(e) => {
                                            const descuentoPct = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                            dispatch({ tipo: "actualizarItem", index, cambios: { descuentoPct } });
                                        }}
                                    />
                                </td>
                                <td className="num">
                                    {articulo.alicuotaIva} %
                                </td>
                                <td className="num strong">
                                    {moneda.format(articulo.subtotalLinea)}
                                </td>
                            </tr>
                        )
                    }
                </tbody>
            </table>
            </div>

            <div>
                <button className="btn-secondary" onClick={agregarItem} >
                    Agregar artículo
                </button>
            </div>

            <dl className="totales">
                <div>
                    <dt>Subtotal</dt>
                    <dd>{moneda.format(presupuesto.subtotal)}</dd>
                </div>
                <div>
                    <dt>IVA</dt>
                    <dd>{moneda.format(presupuesto.iva)}</dd>
                </div>
                <div className="totales__total">
                    <dt>Total</dt>
                    <dd>{moneda.format(presupuesto.total)}</dd>
                </div>
            </dl>

            <footer>
                {error && <p role="alert">{error}</p>}
                <button type="button" onClick={validarYGuardarPresupuesto} >
                    Guardar Presupuesto
                </button>
            </footer>
        </>
    )
}

