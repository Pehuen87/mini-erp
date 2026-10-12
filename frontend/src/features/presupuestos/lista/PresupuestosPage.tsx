import { useState, useEffect } from "react"
import type { Presupuesto } from "../../../api/types"
import { deletePresupuesto, facturaPresupuesto, getPresupuestos } from "../../../api/clients";
import { AltaPresupuesto } from "../alta/AltaPresupuesto";

const moneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const formatNumero = (numero: number) => `P-${String(numero).padStart(6, '0')}`;
// Toma la parte yyyy-mm-dd del string para no correr la fecha por zona horaria.
const formatFecha = (fecha: string) => fecha.slice(0, 10).split('-').reverse().join('/');


export function PresupuestosPage() {
    const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
    const [vista, setVista] = useState<string>('lista');
    const [recarga, setRecarga] = useState(0);
    const [mensaje, setMensaje] = useState<string | null>(null);

    useEffect(() => {
        if (!mensaje) return;
        const timer = setTimeout(() => setMensaje(null), 4000);
        return () => clearTimeout(timer);
    }, [mensaje]);

    useEffect(() => {
        let cancelado = false;
        const fetchPresupuestos = async () => {
            try {
                const data = await getPresupuestos();
                if (!cancelado) {
                    setPresupuestos(data);
                }
            } catch (err) {
                if (!cancelado) {
                    setMensaje(`No se pudieron cargar los presupuestos: ${err}`);
                }
            }
        };

        fetchPresupuestos();
        return () => {
            cancelado = true;
        };
    }, [recarga]);

    const facturar = async (p: Presupuesto) => {
        try {
            const factura = await facturaPresupuesto(p.id);
            setMensaje(`Presupuesto ${p.numero} facturado. Factura N.º ${factura.numero} por ${factura.total}.`);
            setRecarga(r => r + 1);
        } catch (err) {
            setMensaje(`No se pudo facturar el presupuesto ${p.numero}: ${err}`);

        };
    }

    const eliminar = async (p: Presupuesto) => {
        if (!confirm(`¿Eliminar el presupuesto ${p.numero}?`)) return;
        try {
            await deletePresupuesto(p.id);
            setMensaje(`Presupuesto ${p.numero} eliminado.`);
            setRecarga(r => r + 1);
        } catch (err) {
            setMensaje(`No se pudo eliminar el presupuesto ${p.numero}: ${err}`);
        }
    }

    if (vista === 'alta') {
        return (
            <AltaPresupuesto
                onVolver={() => setVista('lista')}
                onGuardado={(guardado) => {
                    setMensaje(`Presupuesto N° ${guardado.numero} guardado correctamente`);
                    setRecarga(r => r + 1);
                    setVista('lista');
                }}
            />
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
            {mensaje && <p role="status">{mensaje}</p>}
            <div className="table-wrap">
                <table aria-label="Listado de presupuestos">
                    <thead>
                        <tr>
                            <th scope="col" className="num">Id</th>
                            <th scope="col">N.º</th>
                            <th scope="col">Fecha</th>
                            <th scope="col" className="expand">Cliente</th>
                            <th scope="col">Estado</th>
                            <th scope="col" className="num">Validez</th>
                            <th scope="col" className="num">Ítems</th>
                            <th scope="col" className="num">Subtotal</th>
                            <th scope="col" className="num">IVA</th>
                            <th scope="col" className="num">Total</th>
                            <th scope="col"><span className="sr-only">Acciones</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            presupuestos.map(element =>
                                <tr key={element.id}>
                                    <td className="num muted">{element.id}</td>
                                    <td className="mono">{formatNumero(element.numero)}</td>
                                    <td>{formatFecha(element.fecha)}</td>
                                    <td>
                                        {element.clienteRazonSocial}
                                        <div className="muted small">ID {element.clienteId}</div>
                                    </td>
                                    <td>
                                        <span className={`badge badge--${element.estado?.toLowerCase() ?? ''}`}>{element.estado}</span>
                                    </td>
                                    <td className="num">{element.validezDias} días</td>
                                    <td className="num">{element.items.length}</td>
                                    <td className="num">{moneda.format(element.subtotal)}</td>
                                    <td className="num">{moneda.format(element.iva)}</td>
                                    <td className="num strong">{moneda.format(element.total)}</td>
                                    <td>
                                        <div className="acciones">
                                            <button onClick={() => facturar(element)}>
                                                Facturar
                                            </button>
                                            <button className="btn-danger" onClick={() => eliminar(element)}>
                                                Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        }
                    </tbody>
                </table>
            </div>
        </>
    )
}

