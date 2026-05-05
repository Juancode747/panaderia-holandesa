-- =====================================================
-- LIMPIEZA
-- =====================================================

BEGIN EXECUTE IMMEDIATE 'DROP TABLE usuario_permiso CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE permisos CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE proveedor_insumo CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE insumos CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE usuario_ruta CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE facturas_items CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE facturas CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE tiendas CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE productos CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE proveedores CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE rutas CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE usuarios CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- =====================================================
-- TABLA USUARIOS
-- =====================================================

CREATE TABLE usuarios (
    id VARCHAR2(50) PRIMARY KEY,
    email VARCHAR2(255) NOT NULL UNIQUE,
    nombre VARCHAR2(100) NOT NULL,
    password VARCHAR2(255) NOT NULL,
    rol VARCHAR2(50) DEFAULT 'vendedor',
    activo NUMBER(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA RUTAS
-- =====================================================

CREATE TABLE rutas (
    id VARCHAR2(50) PRIMARY KEY,
    nombre VARCHAR2(100) NOT NULL,
    activo NUMBER(1) DEFAULT 1
);

-- =====================================================
-- RELACIÓN USUARIO - RUTA (N:M)
-- =====================================================

CREATE TABLE usuario_ruta (
    usuario_id VARCHAR2(50),
    ruta_id VARCHAR2(50),
    PRIMARY KEY (usuario_id, ruta_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (ruta_id) REFERENCES rutas(id)
);

-- =====================================================
-- TABLA TIENDAS
-- =====================================================

CREATE TABLE tiendas (
    id VARCHAR2(50) PRIMARY KEY,
    nombre_tienda VARCHAR2(200) NOT NULL,
    nombre_dueno VARCHAR2(200) NOT NULL,
    cedula_nit VARCHAR2(50) NOT NULL UNIQUE,
    telefono VARCHAR2(20) NOT NULL,
    correo VARCHAR2(255) NOT NULL,
    direccion VARCHAR2(500) NOT NULL,
    ruta_id VARCHAR2(50) NOT NULL,
    dia_entrega VARCHAR2(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ruta_id) REFERENCES rutas(id),

    CHECK (dia_entrega IN 
    ('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'))
);

CREATE INDEX idx_tienda_ruta ON tiendas(ruta_id);

-- =====================================================
-- TABLA PROVEEDORES
-- =====================================================

CREATE TABLE proveedores (
    id VARCHAR2(50) PRIMARY KEY,
    nombre_contacto VARCHAR2(200) NOT NULL,
    empresa VARCHAR2(200) NOT NULL,
    telefono VARCHAR2(20) NOT NULL,
    correo VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA INSUMOS
-- =====================================================

CREATE TABLE insumos (
    id VARCHAR2(50) PRIMARY KEY,
    nombre VARCHAR2(200) NOT NULL
);

CREATE TABLE proveedor_insumo (
    proveedor_id VARCHAR2(50),
    insumo_id VARCHAR2(50),
    PRIMARY KEY (proveedor_id, insumo_id),
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (insumo_id) REFERENCES insumos(id)
);

-- =====================================================
-- TABLA PRODUCTOS
-- =====================================================

CREATE TABLE productos (
    id VARCHAR2(50) PRIMARY KEY,
    codigo VARCHAR2(50) NOT NULL UNIQUE,
    nombre VARCHAR2(200) NOT NULL,
    precio NUMBER(10,2) NOT NULL,
    descripcion VARCHAR2(1000),
    proveedor_id VARCHAR2(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (precio >= 0),
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
);

-- =====================================================
-- TABLA FACTURAS (SIN REDUNDANCIA)
-- =====================================================

CREATE TABLE facturas (
    id VARCHAR2(50) PRIMARY KEY,
    numero_factura VARCHAR2(50) NOT NULL UNIQUE,
    tienda_id VARCHAR2(50) NOT NULL,
    ruta_id VARCHAR2(50) NOT NULL,
    vendedor_id VARCHAR2(50) NOT NULL,
    subtotal NUMBER(12,2),
    iva NUMBER(12,2),
    total NUMBER(12,2),
    total_devoluciones NUMBER(12,2),
    observaciones VARCHAR2(1000),
    fecha DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tienda_id) REFERENCES tiendas(id),
    FOREIGN KEY (ruta_id) REFERENCES rutas(id),
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_factura_fecha ON facturas(fecha);

-- =====================================================
-- TABLA FACTURAS ITEMS (SIN REDUNDANCIA)
-- =====================================================

CREATE TABLE facturas_items (
    id NUMBER PRIMARY KEY,
    factura_id VARCHAR2(50) NOT NULL,
    producto_id VARCHAR2(50) NOT NULL,
    cantidad NUMBER(10),
    precio_unitario NUMBER(10,2),
    es_devolucion NUMBER(1) DEFAULT 0,

    FOREIGN KEY (factura_id) 
    REFERENCES facturas(id) ON DELETE CASCADE,

    FOREIGN KEY (producto_id) 
    REFERENCES productos(id)
);

-- =====================================================
-- TABLA PERMISOS
-- =====================================================

CREATE TABLE permisos (
    id VARCHAR2(50) PRIMARY KEY,
    nombre VARCHAR2(100) NOT NULL
);

CREATE TABLE usuario_permiso (
    usuario_id VARCHAR2(50),
    permiso_id VARCHAR2(50),
    PRIMARY KEY (usuario_id, permiso_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (permiso_id) REFERENCES permisos(id)
);

-- =====================================================
-- VISTA HOJA DE RUTA
-- =====================================================

CREATE OR REPLACE VIEW v_hoja_ruta AS
SELECT 
    t.id,
    t.nombre_tienda,
    t.nombre_dueno,
    t.telefono,
    t.direccion,
    t.dia_entrega,
    r.nombre AS ruta_nombre
FROM tiendas t
JOIN rutas r ON t.ruta_id = r.id;

-- =====================================================
-- VISTA VENTAS DIARIAS
-- =====================================================

CREATE OR REPLACE VIEW v_ventas_diarias AS
SELECT 
    f.fecha,
    r.nombre AS ruta,
    p.nombre AS producto,
    SUM(fi.cantidad) cantidad,
    SUM(fi.cantidad * fi.precio_unitario) total
FROM facturas f
JOIN facturas_items fi ON f.id = fi.factura_id
JOIN productos p ON fi.producto_id = p.id
JOIN rutas r ON f.ruta_id = r.id
GROUP BY f.fecha, r.nombre, p.nombre;

COMMIT;
