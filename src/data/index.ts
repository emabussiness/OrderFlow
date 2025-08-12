// Mapeo de datos para simular la estructura de la base de datos
// ESTE ARCHIVO SERÁ ELIMINADO PRÓXIMAMENTE Y REEMPLAZADO POR OPERACIONES DIRECTAS A FIRESTORE

// 1. proveedores
export const proveedores = [
    { id: "1", nombre: "Proveedor A", ruc: "80012345-1", direccion: "Calle Falsa 123", telefono: "0981123456", email: "proveedora@email.com" },
    { id: "2", nombre: "Proveedor B", ruc: "80067890-2", direccion: "Av. Siempre Viva 742", telefono: "0971654321", email: "proveedorb@email.com" },
    { id: "3", nombre: "Proveedor C", ruc: "80098765-3", direccion: "Blvd. de los Sueños Rotos 45", telefono: "0994987654", email: "proveedorc@email.com" },
];

// 16. productos
export const productos = [
    { id: "101", nombre: "Producto X", descripcion: "Descripción detallada del Producto X", categoria_id: "1", unidad_medida_id: "1", precio_referencia: 100, codigo_interno: "P-001", codigo_barra: "7891234567890", iva_tipo: 10, costo_promedio: 80 },
    { id: "102", nombre: "Producto Y", descripcion: "Descripción detallada del Producto Y", categoria_id: "2", unidad_medida_id: "2", precio_referencia: 25.50, codigo_interno: "P-002", codigo_barra: "7891234567891", iva_tipo: 10, costo_promedio: 20 },
    { id: "103", nombre: "Producto Z", descripcion: "Descripción detallada del Producto Z", categoria_id: "1", unidad_medida_id: "1", precio_referencia: 50, codigo_interno: "P-003", codigo_barra: "7891234567892", iva_tipo: 5, costo_promedio: 40 },
    { id: "104", nombre: "Producto Alfa", descripcion: "Descripción detallada del Producto Alfa", categoria_id: "3", unidad_medida_id: "3", precio_referencia: 33.00, codigo_interno: "P-004", codigo_barra: "7891234567893", iva_tipo: 10, costo_promedio: 25 },
    { id: "105", nombre: "Producto Beta", descripcion: "Descripción detallada del Producto Beta", categoria_id: "2", unidad_medida_id: "1", precio_referencia: 85.00, codigo_interno: "P-005", codigo_barra: "7891234567894", iva_tipo: 10, costo_promedio: 70 },
];

// 22. depositos
export const depositos = [
    { id: "1", nombre: "Depósito Principal", direccion: "Calle Logistica 1", sucursal_id: "1" },
    { id: "2", nombre: "Depósito Sucursal Centro", direccion: "Av. Central 123", sucursal_id: "2" },
    { id: "3", nombre: "Depósito Sucursal Norte", direccion: "Ruta Norte km 10", sucursal_id: "3" },
];

// Estos son datos iniciales para la simulación, no forman parte del modelo de BD
export const initialPedidos = [];
export const initialPresupuestos = [];
export const initialOrdenes = [];

    