"""
Script para inicializar usuarios en Oracle Cloud con passwords hasheados correctamente.
Ejecutar después de crear las tablas con panaderia_oracle_setup.sql

Uso:
    python init_users.py
"""

import oracledb
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

# ==================== CONFIGURACIÓN ORACLE CLOUD ====================
ORACLE_CONFIG = {
    "user": os.getenv("ORACLE_USER", "ADMIN"),
    "password": os.getenv("ORACLE_PASSWORD", "Panaderia2024!"),
    "dsn": os.getenv("ORACLE_DSN", "panaderia_tp"),
    "config_dir": os.getenv("ORACLE_WALLET_DIR", r"C:\Users\juanes\Descargas\oracle_wallet"),
    "wallet_location": os.getenv("ORACLE_WALLET_DIR", r"C:\Users\juanes\Descargas\oracle_wallet"),
}

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def init_users():
    print("Conectando a Oracle Cloud...")
    conn = oracledb.connect(**ORACLE_CONFIG)
    cursor = conn.cursor()
    
    users = [
        {
            "id": "user-admin",
            "email": "admin@panaderia.com",
            "nombre": "Administrador",
            "password": "admin123",
            "rol": "admin",
            "ruta_asignada": None,
            "permisos": '["tiendas_crear","tiendas_editar","tiendas_eliminar","tiendas_ver","productos_crear","productos_editar","productos_eliminar","productos_ver","proveedores_crear","proveedores_editar","proveedores_eliminar","proveedores_ver","facturas_crear","facturas_editar","facturas_eliminar","facturas_ver","usuarios_gestionar","reportes_ver","exportar_excel"]'
        },
        {
            "id": "user-michel",
            "email": "michel@panaderia.com",
            "nombre": "Michel",
            "password": "michel123",
            "rol": "vendedor",
            "ruta_asignada": "ruta-1",
            "permisos": '["tiendas_crear","tiendas_editar","tiendas_ver","productos_ver","proveedores_ver","facturas_crear","facturas_editar","facturas_ver","reportes_ver","exportar_excel"]'
        },
        {
            "id": "user-angie",
            "email": "angie@panaderia.com",
            "nombre": "Angie",
            "password": "angie123",
            "rol": "vendedor",
            "ruta_asignada": "ruta-2",
            "permisos": '["tiendas_crear","tiendas_editar","tiendas_ver","productos_ver","proveedores_ver","facturas_crear","facturas_editar","facturas_ver","reportes_ver","exportar_excel"]'
        },
        {
            "id": "user-julian",
            "email": "julian@panaderia.com",
            "nombre": "Julian",
            "password": "julian123",
            "rol": "admin",
            "ruta_asignada": None,
            "permisos": '["tiendas_crear","tiendas_editar","tiendas_eliminar","tiendas_ver","productos_crear","productos_editar","productos_eliminar","productos_ver","proveedores_crear","proveedores_editar","proveedores_eliminar","proveedores_ver","facturas_crear","facturas_editar","facturas_eliminar","facturas_ver","usuarios_gestionar","reportes_ver","exportar_excel"]'
        }
    ]
    
    print("Eliminando usuarios existentes...")
    cursor.execute("DELETE FROM usuarios")
    
    print("Creando usuarios con passwords hasheados...")
    for user in users:
        hashed_password = hash_password(user["password"])
        print(f"  - Creando usuario: {user['email']}")
        
        cursor.execute("""
            INSERT INTO usuarios (id, email, nombre, password, rol, ruta_asignada, permisos, activo)
            VALUES (:id, :email, :nombre, :password, :rol, :ruta_asignada, :permisos, 1)
        """, {
            "id": user["id"],
            "email": user["email"],
            "nombre": user["nombre"],
            "password": hashed_password,
            "rol": user["rol"],
            "ruta_asignada": user["ruta_asignada"],
            "permisos": user["permisos"]
        })
    
    conn.commit()
    print("\n✅ Usuarios creados correctamente en Oracle Cloud!")
    print("\nCredenciales:")
    print("=" * 50)
    for user in users:
        print(f"  Email: {user['email']}")
        print(f"  Password: {user['password']}")
        print(f"  Rol: {user['rol']}")
        if user['ruta_asignada']:
            print(f"  Ruta: {user['ruta_asignada']}")
        print("-" * 50)
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    init_users()
