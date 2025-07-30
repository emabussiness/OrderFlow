export const proveedores = [
    { id: "1", nombre: "Proveedor A" },
    { id: "2", nombre: "Proveedor B" },
    { id: "3", nombre: "Proveedor C" },
];

export const productos = [
    { id: "101", nombre: "Producto X", precio: 100 },
    { id: "102", nombre: "Producto Y", precio: 25.50 },
    { id: "103", nombre: "Producto Z", precio: 50 },
    { id: "104", nombre: "Producto Alfa", precio: 33.00 },
    { id: "105", nombre: "Producto Beta", precio: 85.00 },
];

export const depositos = [
    { id: "1", nombre: "Depósito Principal" },
    { id: "2", nombre: "Depósito Sucursal Centro" },
    { id: "3", nombre: "Depósito Sucursal Norte" },
];

export const initialPedidos = [
  {
    id: "PED-001",
    proveedor: "Proveedor A",
    proveedorId: "1",
    deposito: "Depósito Principal",
    depositoId: "1",
    fechaPedido: "2024-07-30",
    estado: "Pendiente",
    total: 1500.00,
    items: [
        { productoId: '101', nombre: 'Producto X', cantidad: 10, precio: 150 },
    ],
    usuario: "Usuario Demo",
    fechaCreacion: "2024-07-30T10:00:00Z"
  },
  {
    id: "PED-002",
    proveedor: "Proveedor B",
    proveedorId: "2",
    deposito: "Depósito Sucursal Centro",
    depositoId: "2",
    fechaPedido: "2024-07-29",
    estado: "Completado",
    total: 750.50,
    items: [
        { productoId: '102', nombre: 'Producto Y', cantidad: 30, precio: 25.50 },
    ],
    usuario: "Usuario Demo",
    fechaCreacion: "2024-07-29T11:30:00Z"
  },
];

export const initialPresupuestos = [
  {
    id: "PRE-001",
    pedidoId: "PED-001",
    proveedor: "Proveedor A",
    proveedorId: "1",
    deposito: "Depósito Principal",
    depositoId: "1",
    fecha: "2024-07-31",
    total: 1480.0,
    estado: "Aprobado",
    items: [
        { productoId: '101', nombre: "Producto X", cantidad: 10, precio: 148 },
    ],
    usuario: "Admin",
    fechaCreacion: "2024-07-31T09:00:00Z"
  },
];

export const initialOrdenes = [
  {
    id: "OC-001",
    presupuestoId: "PRE-001",
    pedidoId: "PED-001",
    proveedor: "Proveedor A",
    proveedorId: "1",
    deposito: "Depósito Principal",
    depositoId: "1",
    fechaOrden: "2024-07-31",
    total: 1480.0,
    estado: "Pendiente de Recepción",
    items: [
        { productoId: '101', nombre: "Producto X", cantidad: 10, precio: 148 },
    ],
    usuario: "Admin",
    fechaCreacion: "2024-07-31T10:00:00Z"
  },
];
