# NOTES


## Bugs encontrados (backend)

1. IVA fijo al 21 %: se calculaba sobre el subtotal total, sin tener en cuenta la alícuota de cada artículo. (fix backend IVA calculado con Alicuota del item)
2. IVA sin redondear por línea: ahora se redondea cada línea a 2 decimales (AwayFromZero) y después se suma. (fix backend iva redondeado por linea / fix backend errores varios de redondeo (subtotal por linea, iva))
3. Subtotal de línea sin redondear: ahora también se redondea. (fix backend errores varios de redondeo (subtotal por linea, iva))
4. Facturar dos veces: un presupuesto ya facturado se podía volver a facturar. (fix backend presupuestos facturados no se pueden volver a facturar)
5. Stock negativo: se podía facturar con más cantidad que el stock. (fix backedn Stock insuficiente para facturar un item)
6. Descuento de stock parcial: si un ítem no tenía stock, los anteriores ya se habían descontado. Ahora valida todo primero y descuenta después. (fix backend errores varios y test que ahora no coinciden con el codigo)
7. Facturar un rechazado: se permitía. (fix backend no factura rechazado y si no existe lanza key not found)
8. Presupuesto inexistente al facturar: devolvía 400 en vez de 404 (ahora usa KeyNotFoundException → NotFound). (fix backend no factura rechazado y si no existe lanza key not found / fix backend no tenia el catch para keynotfound)
9. Validez: se comparaba fecha y hora; ahora se cuenta por día calendario en UTC. (fix backend validez por dia calendario*)
10. Lista vacía después de crear: el listado filtraba != Borrador, así que un presupuesto recién creado no aparecía (flujo 1 del README). (fix backend errores varios y test que ahora no coinciden con el codigo)
11. Borrado físico: ahora el borrado es lógico (estado Eliminado), y no se puede borrar uno facturado. (fix backend errores varios y test que ahora no coinciden con el codigo / añado test en funcion de las reglas de negocio y flujos que deben funcionar)
12. Eliminar devolvía 500: faltaba el try/catch en el controller. (fix backend le faltaba el try catch a eliminarasyc)
13. Validaciones al crear: no había ninguna. Ahora se rechazan cantidad ≤ 0, descuento fuera de 0–100, cliente inexistente, lista de ítems vacía, validez ≤ 0 y artículos repetidos. (fix backend errores varios la cantidad de un item debe ser mayor que 0 y si no existe el cliente rechaza / fix backend errores varios articulos duplicados)
14. Numeración sin restricción en la base: faltaba el índice único en Numero. (fix backend faltaba el unique para presupuestos)


## Decisiones del cliente React


Decidí utilizar Vite para el create react app con la siguiente linea: 

npm create vite@latest frontend -- --template react-ts

la estructura la dividí en /api/ donde puse en client todos las funciones que llaman a la api
el schema lo generé con:

npx openapi-typescript http://localhost:5080/swagger/v1/swagger.json -o src/api/schema.d.ts

y el types lo generé en función de los *Dtos
(consulté a Claude para la mejor forma de generar automaticamente los schema y luego para ver como podía hacer required los items del presupuesto)

luego en features cree una carpeta presupuestos que primero pense que iba a ser suficiente, luego me di cuenta que dividirla en alta y lista era una mejor opción. 

Creando el alta del presupuesto me di cuenta que,una mejor forma de resolverlo y ademas solventaba el problema de los totales en vivo, era utilizar un reducer que se encargue de modificar el presupuesto si elijo un cliente, o cambio un item, o agrego un item, valido los items que estan o borro un item. 
Para ello tiene una funciona calcularTotales. 

Primero el IVA se sumaba sin redondear y se redondeaba solo al final, lo que podía
dar centavos de diferencia con el backend así que lo corregí para que redondee por línea


## Qué hice y qué dejé afuera

Que hice: 

- Parte A: arreglé los bugs del backend que están en la lista de arriba.
- Parte B completa:
  - Lista de presupuestos.
  - Alta: cliente, búsqueda de artículos, cantidad y descuento por línea, totales en vivo.
  - Facturar desde la grilla, mostrando el error del backend.
- Además: eliminar presupuesto desde la grilla, quitar líneas en el alta, mensajes de
  éxito y error, y validación en el front de cantidad y descuento.
- Tests propios en el backend sobre las reglas de negocio y los flujos del README.

Dejé afuera
- Duplicar presupuesto.
- Reporte de top artículos.
- Tests del cliente.

Prioricé en función del tiempo que tenía, considero que el espacio de tiempo designado para la generación de todo el código y los fixes necesarios es poco. 

## Cómo usé IA

Para hacer algunas preguntas puntuales al principio, por ejemplo que me otorgue el comando de vite para generar la app react, la mejor forma de generar automaticamente los schema y luego para ver como podía hacer required los items del presupuesto.

También para generar los test en el backend en función de Reglas de Negocio y Flujos que deben Funcionar, le puse en el prompt:
"Te voy a pasar una reglas de negocio y los flujos que necesito que funcionen, y revisa de este repositorio los test (esta completamente prohibido modificar los que estan) quiero que primero crees una lista de casos de test que cubran cada regla que te paso, con casos borde. Dame para cada caso los datos de entrada y el resultado esperado"
Creó los casos de test y los borde y con eso le pedí que cree los test. Luego yo evalue el resultado de los test y los errores que se encontraron con eso. 
Tomé algunas decisiones al respecto, para generar todos los casos de prueba y algunas decisiones de negocio que no estaban explicitas, en función de lo que fue encontrando la ia: 

| | Decisión | Qué fija en los tests / por qué |
|---|---|---|
| D1 | Redondeo a 2 decimales con AwayFromZero, el habitual en facturación argentina | 0,50 al 21% da un IVA de 0,11, no 0,10 |
| D2 | Primero se redondea el subtotal de cada línea, después se calcula el IVA sobre ese valor y al final se suma | 1×33,33 con 10% de descuento da 30,00 / 6,30 / 36,30. 0,99 con 50% da IVA 0,11, no 0,10 |
| D3 | La validez se cuenta por día calendario UTC, con el último día incluido | Uno creado hace 30 días con validez 30 se puede facturar hoy, a cualquier hora |
| D4 | validezDias tiene que ser ≥ 1 | 0 y −5 se rechazan al crear |
| D5 | Se puede presupuestar más cantidad que el stock disponible; el stock se controla al facturar | Crear con cantidad 50 y stock 10 da OK y el stock no cambia |
| D6 | Facturar un presupuesto que no existe devuelve 404 | El servicio lanza KeyNotFoundException y el controller la traduce a 404 |
| D7 | El borrado es lógico (estado Eliminado) y un presupuesto facturado no se puede borrar | La factura tiene que seguir apuntando a un presupuesto válido |
| D8 | Los números de presupuesto no se reutilizan | Si se crean 1 y 2 y se borra el 2, el siguiente es 3. Hoy se cumple porque el borrado es lógico y el registro sigue contando para Count + 1 |
| D9 | Se acepta un descuento de 0% a 100%, ambos extremos incluidos | −0,01 y 100,01 se rechazan |
| D10 | Un presupuesto sin ítems se rechaza | items: [] da 400 |
| D11 | Un Borrador se puede facturar; un Rechazado, no | Sin esto el flujo 5 no se podía hacer por la API, porque no hay endpoint para aprobar |


Creé dos skills que adjunto, uno copia los estilos de una pagina en base a una url, el otro cambia los estilos y formato de visualizacion (sin tocar logica) para asemejarse a un ERP, esto me dió velocidad para poder hacerlo "feo" y luego pasar estos dos skills y entregar algo mas presentable. 


Me había trabado en los errores de validacion de fecha, no lo podía solucionar así que le consulte y me ayudó. 


## Qué haría con más tiempo / qué falta para producción

Con más tiempo haría la Parte C (duplicar presupuesto y el reporte de top artículos) y cerraría lo que quedó pendiente: numeración con Max + 1 en vez de Count + 1, mostrar Facturar y Eliminar solo cuando corresponde según el estado, y que los errores se vean una sola vez y como error. También usaría el endpoint de búsqueda de artículos en vez de traer todos, agregaría un campo para la validez, una pantalla de facturas y tests del lado del cliente, sobre todo del cálculo de totales.

Para producción falta bastante. 
La numeración y el descuento de stock no están protegidos si llegan dos pedidos al mismo tiempo, haría falta una transacción o control de concurrencia, pasar constantes a variables de entorno. 
El manejo de errores está repetido en cada controller con try/catch; lo pasaría a un middleware que devuelva siempre el mismo formato. Y no hay autenticación, logs ni CI.
