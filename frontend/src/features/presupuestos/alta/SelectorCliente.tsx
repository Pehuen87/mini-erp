import { useEffect, useState } from 'react';
import { getClientes } from '../../../api/clients';
import type { Cliente } from '../../../api/types';

function SelectorCliente({value, onChange}: {value: number, onChange: (id:number ) => void}) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        setLoading(true);
        const data = await getClientes();
        setClientes(data);
      } catch (err) {
        setError(`No se pudieron cargar los clientes: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchClientes();
  }, []);

  return (
      <select value={value || ''} id="cliente-select" disabled={loading || !!error}
        onChange={(e) => {
          const clienteId = parseInt(e.target.value);
          const cliente = clientes.find((c) => c.id === clienteId);
          if (cliente) onChange(cliente.id);
        }}>
        <option value="" disabled>Elegí un cliente…</option>
        {clientes.map((cliente) => (
          <option key={cliente.id} value={cliente.id}>
            {cliente.razonSocial}
          </option>
        ))}
      </select>
  )
}

export default SelectorCliente
