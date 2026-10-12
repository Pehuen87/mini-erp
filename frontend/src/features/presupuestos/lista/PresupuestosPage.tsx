import { useState, useEffect } from "react"
import type { Presupuesto } from "../../../api/types"
import { facturaPresupuesto, getPresupuestos } from "../../../api/clients";
import { AltaPresupuesto } from "../alta/AltaPresupuesto";


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
            } finally {
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
            <table>
                <thead>
                    <tr>
                        <th>Id</th>
                        <th>Número</th>
                        <th>Fecha</th>
                        <th>Cliente Id</th>
                        <th>Cliente</th>
                        <th>Estado</th>
                        <th>Validez (días)</th>
                        <th>Items</th>
                        <th>Subtotal</th>
                        <th>IVA</th>
                        <th>Total</th>
                        <th>
                            Facturar
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {
                        presupuestos.map(element =>
                            <tr key={element.id}>
                                <td>{element.id}</td>
                                <td>{element.numero}</td>
                                <td>{element.fecha}</td>
                                <td>{element.clienteId}</td>
                                <td>{element.clienteRazonSocial}</td>
                                <td>{element.estado}</td>
                                <td>{element.validezDias}</td>
                                <td>{element.items.length}</td>
                                <td>{element.subtotal}</td>
                                <td>{element.iva}</td>
                                <td>{element.total}</td>
                                <td>
                                    <button onClick={() => facturar(element)}>
                                        Facturar
                                    </button>
                                </td>
                            </tr>

                        )
                    }
                </tbody>
            </table>
        </>
    )
}

