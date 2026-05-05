from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import re
import io
import json
import oracledb
import os
from dotenv import load_dotenv

load_dotenv()

# ==================== CONFIGURACIÓN ORACLE CLOUD ====================
ORACLE_CONFIG = {
    "user": os.getenv("ORACLE_USER", "ADMIN"),
    "password": os.getenv("ORACLE_PASSWORD", "Panaderia2024!"),
    "dsn": os.getenv("ORACLE_DSN", "panaderia_tp"),
    "config_dir": os.getenv("ORACLE_WALLET_DIR", r"C:\Users\juanes\Downloads\oracle_wallet"),
    "wallet_location": os.getenv("ORACLE_WALLET_DIR", r"C:\Users\juanes\Downloads\oracle_wallet"),
    "wallet_password": os.getenv("ORACLE_WALLET_PASSWORD", "Wallet2024!"),
}

# JWT Config
JWT_SECRET = 'panaderia-holandesa-secret-key-2024'
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Panadería Holandesa API - Oracle Cloud")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== DATABASE CONNECTION ====================

def get_db_connection():
    """Get Oracle Cloud database connection"""
    try:
        connection = oracledb.connect(**ORACLE_CONFIG)
        return connection
    except Exception as e:
        print(f"Error connecting to Oracle Cloud: {e}")
        raise HTTPException(status_code=500, detail=f"Error de conexión a Oracle Cloud: {str(e)}")

def execute_query(query: str, params: dict = None, fetch: str = "all"):
    """Execute a query and return results"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        if fetch == "one":
            row = cursor.fetchone()
            if row:
                columns = [col[0].lower() for col in cursor.description]
                return dict(zip(columns, row))
            return None
        elif fetch == "all":
            rows = cursor.fetchall()
            columns = [col[0].lower() for col in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
        else:
            conn.commit()
            return cursor.rowcount
    finally:
        cursor.close()
        conn.close()

def execute_insert(query: str, params: dict):
    """Execute an insert query"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(query, params)
        conn.commit()
        return True
    finally:
        cursor.close()
        conn.close()

def execute_update(query: str, params: dict):
    """Execute an update query"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(query, params)
        affected = cursor.rowcount
        conn.commit()
        return affected
    finally:
        cursor.close()
        conn.close()

def execute_delete(query: str, params: dict):
    """Execute a delete query"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(query, params)
        affected = cursor.rowcount
        conn.commit()
        return affected
    finally:
        cursor.close()
        conn.close()

# ==================== PERMISSION CONSTANTS ====================
PERMISSIONS = {
    "tiendas_crear": "Crear tiendas",
    "tiendas_editar": "Editar tiendas",
    "tiendas_eliminar": "Eliminar tiendas",
    "tiendas_ver": "Ver tiendas",
    "productos_crear": "Crear productos",
    "productos_editar": "Editar productos",
    "productos_eliminar": "Eliminar productos",
    "productos_ver": "Ver productos",
    "proveedores_crear": "Crear proveedores",
    "proveedores_editar": "Editar proveedores",
    "proveedores_eliminar": "Eliminar proveedores",
    "proveedores_ver": "Ver proveedores",
    "facturas_crear": "Crear facturas",
    "facturas_editar": "Editar facturas",
    "facturas_eliminar": "Eliminar facturas",
    "facturas_ver": "Ver facturas",
    "usuarios_gestionar": "Gestionar usuarios",
    "reportes_ver": "Ver reportes",
    "exportar_excel": "Exportar a Excel"
}

VENDOR_PERMISSIONS = [
    "tiendas_crear", "tiendas_editar", "tiendas_ver",
    "productos_ver", "proveedores_ver",
    "facturas_crear", "facturas_editar", "facturas_ver",
    "reportes_ver", "exportar_excel"
]

ADMIN_PERMISSIONS = list(PERMISSIONS.keys())

# ==================== MODELS ====================

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    nombre: str
    password: str
    rol: str = "vendedor"
    ruta_asignada: Optional[str] = None
    permisos: Optional[List[str]] = None

class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    rol: Optional[str] = None
    ruta_asignada: Optional[str] = None
    permisos: Optional[List[str]] = None
    activo: Optional[bool] = None

class UserResponse(BaseModel):
    id: str
    email: str
    nombre: str
    rol: str
    ruta_asignada: Optional[str] = None
    permisos: List[str] = []
    activo: bool = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class StoreCreate(BaseModel):
    nombre_tienda: str
    nombre_dueno: str
    cedula_nit: str
    telefono: str
    correo: EmailStr
    direccion: str
    ruta_id: str
    dia_entrega: str

class StoreUpdate(BaseModel):
    nombre_tienda: Optional[str] = None
    nombre_dueno: Optional[str] = None
    cedula_nit: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[EmailStr] = None
    direccion: Optional[str] = None
    ruta_id: Optional[str] = None
    dia_entrega: Optional[str] = None

class ProductCreate(BaseModel):
    codigo: str
    nombre: str
    precio: float
    descripcion: Optional[str] = ""

class ProductUpdate(BaseModel):
    codigo: Optional[str] = None
    nombre: Optional[str] = None
    precio: Optional[float] = None
    descripcion: Optional[str] = None

class ProviderCreate(BaseModel):
    nombre_contacto: str
    empresa: str
    telefono: str
    correo: Optional[EmailStr] = None
    insumos: str

class ProviderUpdate(BaseModel):
    nombre_contacto: Optional[str] = None
    empresa: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[EmailStr] = None
    insumos: Optional[str] = None

class InvoiceItem(BaseModel):
    producto_id: str
    producto_codigo: str
    producto_nombre: str
    cantidad: int
    precio_unitario: float
    es_devolucion: bool = False

class InvoiceCreate(BaseModel):
    tienda_id: str
    ruta_id: str
    items: List[InvoiceItem]
    observaciones: Optional[str] = ""

class InvoiceUpdate(BaseModel):
    items: Optional[List[InvoiceItem]] = None
    observaciones: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except:
        return False

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = execute_query(
            "SELECT id, email, nombre, rol, ruta_asignada, permisos, activo FROM usuarios WHERE id = :id",
            {"id": payload["user_id"]},
            fetch="one"
        )
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        if not user.get("activo", 1):
            raise HTTPException(status_code=401, detail="Usuario desactivado")
        
        permisos_str = user.get("permisos", "[]")
        if isinstance(permisos_str, str):
            user["permisos"] = json.loads(permisos_str) if permisos_str else []
        else:
            user["permisos"] = []
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

def check_permission(user: dict, permission: str):
    if user.get("rol") == "admin":
        return True
    permisos = user.get("permisos", [])
    return permission in permisos

def require_permission(permission: str):
    async def check(current_user: dict = Depends(get_current_user)):
        if not check_permission(current_user, permission):
            raise HTTPException(status_code=403, detail=f"No tienes permiso para: {PERMISSIONS.get(permission, permission)}")
        return current_user
    return check

def get_user_route_filter(user: dict) -> Optional[str]:
    if user.get("rol") == "admin":
        return None
    return user.get("ruta_asignada")

def generate_invoice_number() -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    result = execute_query(
        "SELECT COUNT(*) as cnt FROM facturas WHERE numero_factura LIKE :prefix",
        {"prefix": f"FAC-{today}%"},
        fetch="one"
    )
    count = result.get("cnt", 0) if result else 0
    return f"FAC-{today}-{str(count + 1).zfill(4)}"

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = execute_query(
        "SELECT id, email, nombre, password, rol, ruta_asignada, permisos, activo FROM usuarios WHERE email = :email",
        {"email": data.email},
        fetch="one"
    )
    
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if not user.get("activo", 1):
        raise HTTPException(status_code=401, detail="Usuario desactivado")
    
    permisos_str = user.get("permisos", "[]")
    permisos = json.loads(permisos_str) if isinstance(permisos_str, str) and permisos_str else []
    
    token = create_token(user["id"], user["email"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            nombre=user["nombre"],
            rol=user["rol"],
            ruta_asignada=user.get("ruta_asignada"),
            permisos=permisos,
            activo=bool(user.get("activo", 1))
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        nombre=current_user["nombre"],
        rol=current_user["rol"],
        ruta_asignada=current_user.get("ruta_asignada"),
        permisos=current_user.get("permisos", []),
        activo=bool(current_user.get("activo", 1))
    )

# ==================== USER MANAGEMENT ROUTES ====================

@api_router.get("/users")
async def get_users(current_user: dict = Depends(require_permission("usuarios_gestionar"))):
    users = execute_query("SELECT id, email, nombre, rol, ruta_asignada, permisos, activo FROM usuarios")
    result = []
    for user in users:
        permisos_str = user.get("permisos", "[]")
        permisos = json.loads(permisos_str) if isinstance(permisos_str, str) and permisos_str else []
        result.append({
            "id": user["id"],
            "email": user["email"],
            "nombre": user["nombre"],
            "rol": user["rol"],
            "ruta_asignada": user.get("ruta_asignada"),
            "permisos": permisos,
            "activo": bool(user.get("activo", 1))
        })
    return result

@api_router.post("/users", status_code=201)
async def create_user(data: UserCreate, current_user: dict = Depends(require_permission("usuarios_gestionar"))):
    existing = execute_query("SELECT id FROM usuarios WHERE email = :email", {"email": data.email}, fetch="one")
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un usuario con este correo")
    
    permisos = data.permisos if data.permisos else (ADMIN_PERMISSIONS if data.rol == "admin" else VENDOR_PERMISSIONS)
    user_id = str(uuid.uuid4())
    
    execute_insert(
        """INSERT INTO usuarios (id, email, nombre, password, rol, ruta_asignada, permisos, activo)
           VALUES (:id, :email, :nombre, :password, :rol, :ruta_asignada, :permisos, 1)""",
        {
            "id": user_id,
            "email": data.email,
            "nombre": data.nombre,
            "password": hash_password(data.password),
            "rol": data.rol,
            "ruta_asignada": data.ruta_asignada,
            "permisos": json.dumps(permisos)
        }
    )
    
    return {
        "id": user_id,
        "email": data.email,
        "nombre": data.nombre,
        "rol": data.rol,
        "ruta_asignada": data.ruta_asignada,
        "permisos": permisos,
        "activo": True
    }

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, current_user: dict = Depends(require_permission("usuarios_gestionar"))):
    user = execute_query("SELECT id FROM usuarios WHERE id = :id", {"id": user_id}, fetch="one")
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    updates = []
    params = {"id": user_id}
    
    if data.nombre is not None:
        updates.append("nombre = :nombre")
        params["nombre"] = data.nombre
    if data.email is not None:
        updates.append("email = :email")
        params["email"] = data.email
    if data.password is not None:
        updates.append("password = :password")
        params["password"] = hash_password(data.password)
    if data.rol is not None:
        updates.append("rol = :rol")
        params["rol"] = data.rol
    if data.ruta_asignada is not None:
        updates.append("ruta_asignada = :ruta_asignada")
        params["ruta_asignada"] = data.ruta_asignada if data.ruta_asignada else None
    if data.permisos is not None:
        updates.append("permisos = :permisos")
        params["permisos"] = json.dumps(data.permisos)
    if data.activo is not None:
        updates.append("activo = :activo")
        params["activo"] = 1 if data.activo else 0
    
    if updates:
        execute_update(f"UPDATE usuarios SET {', '.join(updates)} WHERE id = :id", params)
    
    return {"message": "Usuario actualizado correctamente"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_permission("usuarios_gestionar"))):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    
    affected = execute_delete("DELETE FROM usuarios WHERE id = :id", {"id": user_id})
    if affected == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario eliminado correctamente"}

@api_router.get("/permissions")
async def get_all_permissions(current_user: dict = Depends(get_current_user)):
    return PERMISSIONS

# ==================== ROUTES ENDPOINTS ====================

@api_router.get("/routes")
async def get_routes(current_user: dict = Depends(get_current_user)):
    routes = execute_query("SELECT id, nombre, vendedor_nombre, activo FROM rutas WHERE activo = 1")
    return routes

# ==================== STORES ROUTES ====================

@api_router.get("/stores")
async def get_stores(
    ruta_id: Optional[str] = None,
    dia_entrega: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_permission("tiendas_ver"))
):
    query = """
        SELECT t.id, t.nombre_tienda, t.nombre_dueno, t.cedula_nit, t.telefono, 
               t.correo, t.direccion, t.ruta_id, t.dia_entrega, t.created_at, t.updated_at,
               r.nombre as ruta_nombre
        FROM tiendas t
        JOIN rutas r ON t.ruta_id = r.id
        WHERE 1=1
    """
    params = {}
    
    user_route = get_user_route_filter(current_user)
    if user_route:
        query += " AND t.ruta_id = :user_route"
        params["user_route"] = user_route
    elif ruta_id:
        query += " AND t.ruta_id = :ruta_id"
        params["ruta_id"] = ruta_id
    
    if dia_entrega:
        query += " AND t.dia_entrega = :dia_entrega"
        params["dia_entrega"] = dia_entrega
    
    if search:
        query += " AND (LOWER(t.cedula_nit) LIKE LOWER(:search) OR LOWER(t.nombre_dueno) LIKE LOWER(:search) OR LOWER(t.nombre_tienda) LIKE LOWER(:search))"
        params["search"] = f"%{search}%"
    
    query += " ORDER BY t.nombre_tienda"
    stores = execute_query(query, params if params else None)
    return stores

@api_router.get("/stores/{store_id}")
async def get_store(store_id: str, current_user: dict = Depends(require_permission("tiendas_ver"))):
    store = execute_query(
        """SELECT t.*, r.nombre as ruta_nombre FROM tiendas t 
           JOIN rutas r ON t.ruta_id = r.id WHERE t.id = :id""",
        {"id": store_id},
        fetch="one"
    )
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    user_route = get_user_route_filter(current_user)
    if user_route and store.get("ruta_id") != user_route:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta tienda")
    
    return store

@api_router.post("/stores", status_code=201)
async def create_store(data: StoreCreate, current_user: dict = Depends(require_permission("tiendas_crear"))):
    user_route = get_user_route_filter(current_user)
    if user_route and data.ruta_id != user_route:
        raise HTTPException(status_code=403, detail="Solo puedes crear tiendas en tu ruta asignada")
    
    existing = execute_query("SELECT id FROM tiendas WHERE cedula_nit = :cedula", {"cedula": data.cedula_nit}, fetch="one")
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una tienda con esta Cédula/NIT")
    
    route = execute_query("SELECT nombre FROM rutas WHERE id = :id", {"id": data.ruta_id}, fetch="one")
    if not route:
        raise HTTPException(status_code=400, detail="Ruta no encontrada")
    
    store_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    execute_insert(
        """INSERT INTO tiendas (id, nombre_tienda, nombre_dueno, cedula_nit, telefono, correo, direccion, ruta_id, dia_entrega, created_at, updated_at)
           VALUES (:id, :nombre_tienda, :nombre_dueno, :cedula_nit, :telefono, :correo, :direccion, :ruta_id, :dia_entrega, :created_at, :updated_at)""",
        {
            "id": store_id,
            "nombre_tienda": data.nombre_tienda,
            "nombre_dueno": data.nombre_dueno,
            "cedula_nit": data.cedula_nit,
            "telefono": data.telefono,
            "correo": data.correo,
            "direccion": data.direccion,
            "ruta_id": data.ruta_id,
            "dia_entrega": data.dia_entrega,
            "created_at": now,
            "updated_at": now
        }
    )
    
    return {
        "id": store_id,
        **data.model_dump(),
        "ruta_nombre": route["nombre"],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }

@api_router.put("/stores/{store_id}")
async def update_store(store_id: str, data: StoreUpdate, current_user: dict = Depends(require_permission("tiendas_editar"))):
    store = execute_query("SELECT ruta_id FROM tiendas WHERE id = :id", {"id": store_id}, fetch="one")
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    user_route = get_user_route_filter(current_user)
    if user_route and store.get("ruta_id") != user_route:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta tienda")
    
    updates = ["updated_at = :updated_at"]
    params = {"id": store_id, "updated_at": datetime.now(timezone.utc)}
    
    for field in ["nombre_tienda", "nombre_dueno", "cedula_nit", "telefono", "correo", "direccion", "ruta_id", "dia_entrega"]:
        value = getattr(data, field, None)
        if value is not None:
            updates.append(f"{field} = :{field}")
            params[field] = value
    
    execute_update(f"UPDATE tiendas SET {', '.join(updates)} WHERE id = :id", params)
    return {"message": "Tienda actualizada correctamente"}

@api_router.delete("/stores/{store_id}")
async def delete_store(store_id: str, current_user: dict = Depends(require_permission("tiendas_eliminar"))):
    affected = execute_delete("DELETE FROM tiendas WHERE id = :id", {"id": store_id})
    if affected == 0:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    return {"message": "Tienda eliminada correctamente"}

# ==================== PRODUCTS ROUTES ====================

@api_router.get("/products")
async def get_products(search: Optional[str] = None, current_user: dict = Depends(require_permission("productos_ver"))):
    query = "SELECT * FROM productos"
    params = {}
    
    if search:
        query += " WHERE LOWER(nombre) LIKE LOWER(:search) OR LOWER(codigo) LIKE LOWER(:search)"
        params["search"] = f"%{search}%"
    
    query += " ORDER BY codigo"
    return execute_query(query, params if params else None)

@api_router.post("/products", status_code=201)
async def create_product(data: ProductCreate, current_user: dict = Depends(require_permission("productos_crear"))):
    existing = execute_query("SELECT id FROM productos WHERE codigo = :codigo", {"codigo": data.codigo}, fetch="one")
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un producto con este código")
    
    product_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    execute_insert(
        """INSERT INTO productos (id, codigo, nombre, precio, descripcion, created_at, updated_at)
           VALUES (:id, :codigo, :nombre, :precio, :descripcion, :created_at, :updated_at)""",
        {
            "id": product_id,
            "codigo": data.codigo,
            "nombre": data.nombre,
            "precio": data.precio,
            "descripcion": data.descripcion or "",
            "created_at": now,
            "updated_at": now
        }
    )
    
    return {"id": product_id, **data.model_dump(), "created_at": now.isoformat(), "updated_at": now.isoformat()}

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, data: ProductUpdate, current_user: dict = Depends(require_permission("productos_editar"))):
    product = execute_query("SELECT id FROM productos WHERE id = :id", {"id": product_id}, fetch="one")
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    updates = ["updated_at = :updated_at"]
    params = {"id": product_id, "updated_at": datetime.now(timezone.utc)}
    
    for field in ["codigo", "nombre", "precio", "descripcion"]:
        value = getattr(data, field, None)
        if value is not None:
            updates.append(f"{field} = :{field}")
            params[field] = value
    
    execute_update(f"UPDATE productos SET {', '.join(updates)} WHERE id = :id", params)
    return {"message": "Producto actualizado correctamente"}

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(require_permission("productos_eliminar"))):
    affected = execute_delete("DELETE FROM productos WHERE id = :id", {"id": product_id})
    if affected == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"message": "Producto eliminado correctamente"}

# ==================== PROVIDERS ROUTES ====================

@api_router.get("/providers")
async def get_providers(search: Optional[str] = None, current_user: dict = Depends(require_permission("proveedores_ver"))):
    query = "SELECT * FROM proveedores"
    params = {}
    
    if search:
        query += " WHERE LOWER(empresa) LIKE LOWER(:search) OR LOWER(nombre_contacto) LIKE LOWER(:search)"
        params["search"] = f"%{search}%"
    
    query += " ORDER BY empresa"
    return execute_query(query, params if params else None)

@api_router.post("/providers", status_code=201)
async def create_provider(data: ProviderCreate, current_user: dict = Depends(require_permission("proveedores_crear"))):
    provider_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    execute_insert(
        """INSERT INTO proveedores (id, nombre_contacto, empresa, telefono, correo, insumos, created_at, updated_at)
           VALUES (:id, :nombre_contacto, :empresa, :telefono, :correo, :insumos, :created_at, :updated_at)""",
        {
            "id": provider_id,
            "nombre_contacto": data.nombre_contacto,
            "empresa": data.empresa,
            "telefono": data.telefono,
            "correo": data.correo or "",
            "insumos": data.insumos,
            "created_at": now,
            "updated_at": now
        }
    )
    
    return {"id": provider_id, **data.model_dump(), "created_at": now.isoformat(), "updated_at": now.isoformat()}

@api_router.put("/providers/{provider_id}")
async def update_provider(provider_id: str, data: ProviderUpdate, current_user: dict = Depends(require_permission("proveedores_editar"))):
    provider = execute_query("SELECT id FROM proveedores WHERE id = :id", {"id": provider_id}, fetch="one")
    if not provider:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    updates = ["updated_at = :updated_at"]
    params = {"id": provider_id, "updated_at": datetime.now(timezone.utc)}
    
    for field in ["nombre_contacto", "empresa", "telefono", "correo", "insumos"]:
        value = getattr(data, field, None)
        if value is not None:
            updates.append(f"{field} = :{field}")
            params[field] = value
    
    execute_update(f"UPDATE proveedores SET {', '.join(updates)} WHERE id = :id", params)
    return {"message": "Proveedor actualizado correctamente"}

@api_router.delete("/providers/{provider_id}")
async def delete_provider(provider_id: str, current_user: dict = Depends(require_permission("proveedores_eliminar"))):
    affected = execute_delete("DELETE FROM proveedores WHERE id = :id", {"id": provider_id})
    if affected == 0:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return {"message": "Proveedor eliminado correctamente"}

# ==================== INVOICE ROUTES ====================

@api_router.get("/invoices")
async def get_invoices(
    ruta_id: Optional[str] = None,
    fecha: Optional[str] = None,
    tienda_id: Optional[str] = None,
    current_user: dict = Depends(require_permission("facturas_ver"))
):
    query = "SELECT * FROM facturas WHERE 1=1"
    params = {}
    
    user_route = get_user_route_filter(current_user)
    if user_route:
        query += " AND ruta_id = :user_route"
        params["user_route"] = user_route
    elif ruta_id:
        query += " AND ruta_id = :ruta_id"
        params["ruta_id"] = ruta_id
    
    if fecha:
        query += " AND fecha = TO_DATE(:fecha, 'YYYY-MM-DD')"
        params["fecha"] = fecha
    
    if tienda_id:
        query += " AND tienda_id = :tienda_id"
        params["tienda_id"] = tienda_id
    
    query += " ORDER BY created_at DESC"
    invoices = execute_query(query, params if params else None)
    
    for invoice in invoices:
        items = execute_query(
            "SELECT * FROM facturas_items WHERE factura_id = :factura_id",
            {"factura_id": invoice["id"]}
        )
        invoice["items"] = items
        if invoice.get("fecha"):
            invoice["fecha"] = invoice["fecha"].strftime("%Y-%m-%d") if hasattr(invoice["fecha"], 'strftime') else str(invoice["fecha"])
    
    return invoices

@api_router.post("/invoices", status_code=201)
async def create_invoice(data: InvoiceCreate, current_user: dict = Depends(require_permission("facturas_crear"))):
    user_route = get_user_route_filter(current_user)
    if user_route and data.ruta_id != user_route:
        raise HTTPException(status_code=403, detail="Solo puedes facturar en tu ruta asignada")
    
    store = execute_query(
        "SELECT nombre_tienda, cedula_nit, direccion, ruta_id FROM tiendas WHERE id = :id",
        {"id": data.tienda_id},
        fetch="one"
    )
    if not store:
        raise HTTPException(status_code=400, detail="Tienda no encontrada")
    if store.get("ruta_id") != data.ruta_id:
        raise HTTPException(status_code=400, detail="La tienda no pertenece a esta ruta")
    
    route = execute_query("SELECT nombre FROM rutas WHERE id = :id", {"id": data.ruta_id}, fetch="one")
    if not route:
        raise HTTPException(status_code=400, detail="Ruta no encontrada")
    
    subtotal = 0
    total_devoluciones = 0
    for item in data.items:
        item_total = item.cantidad * item.precio_unitario
        if item.es_devolucion:
            total_devoluciones += item_total
        else:
            subtotal += item_total
    
    subtotal_neto = subtotal - total_devoluciones
    iva = subtotal_neto * 0.19
    total = subtotal_neto + iva
    
    invoice_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    fecha = now.strftime("%Y-%m-%d")
    
    execute_insert(
        """INSERT INTO facturas (id, numero_factura, tienda_id, tienda_nombre, tienda_cedula, tienda_direccion,
           ruta_id, ruta_nombre, vendedor_id, vendedor_nombre, subtotal, iva, total, total_devoluciones,
           observaciones, fecha, created_at, updated_at)
           VALUES (:id, :numero_factura, :tienda_id, :tienda_nombre, :tienda_cedula, :tienda_direccion,
           :ruta_id, :ruta_nombre, :vendedor_id, :vendedor_nombre, :subtotal, :iva, :total, :total_devoluciones,
           :observaciones, TO_DATE(:fecha, 'YYYY-MM-DD'), :created_at, :updated_at)""",
        {
            "id": invoice_id,
            "numero_factura": generate_invoice_number(),
            "tienda_id": data.tienda_id,
            "tienda_nombre": store["nombre_tienda"],
            "tienda_cedula": store["cedula_nit"],
            "tienda_direccion": store["direccion"],
            "ruta_id": data.ruta_id,
            "ruta_nombre": route["nombre"],
            "vendedor_id": current_user["id"],
            "vendedor_nombre": current_user["nombre"],
            "subtotal": round(subtotal, 2),
            "iva": round(iva, 2),
            "total": round(total, 2),
            "total_devoluciones": round(total_devoluciones, 2),
            "observaciones": data.observaciones or "",
            "fecha": fecha,
            "created_at": now,
            "updated_at": now
        }
    )
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        for item in data.items:
            cursor.execute(
                """INSERT INTO facturas_items (id, factura_id, producto_id, producto_codigo, producto_nombre, cantidad, precio_unitario, es_devolucion)
                   VALUES (seq_factura_items.NEXTVAL, :factura_id, :producto_id, :producto_codigo, :producto_nombre, :cantidad, :precio_unitario, :es_devolucion)""",
                {
                    "factura_id": invoice_id,
                    "producto_id": item.producto_id,
                    "producto_codigo": item.producto_codigo,
                    "producto_nombre": item.producto_nombre,
                    "cantidad": item.cantidad,
                    "precio_unitario": item.precio_unitario,
                    "es_devolucion": 1 if item.es_devolucion else 0
                }
            )
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    
    return {"id": invoice_id, "message": "Factura creada correctamente"}

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, current_user: dict = Depends(require_permission("facturas_ver"))):
    invoice = execute_query("SELECT * FROM facturas WHERE id = :id", {"id": invoice_id}, fetch="one")
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    user_route = get_user_route_filter(current_user)
    if user_route and invoice.get("ruta_id") != user_route:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta factura")
    
    items = execute_query("SELECT * FROM facturas_items WHERE factura_id = :factura_id", {"factura_id": invoice_id})
    invoice["items"] = items
    
    if invoice.get("fecha"):
        invoice["fecha"] = invoice["fecha"].strftime("%Y-%m-%d") if hasattr(invoice["fecha"], 'strftime') else str(invoice["fecha"])
    
    return invoice

# ==================== REPORTS ====================

@api_router.get("/reports/daily-sales")
async def get_daily_sales(
    fecha: Optional[str] = None,
    ruta_id: Optional[str] = None,
    current_user: dict = Depends(require_permission("reportes_ver"))
):
    if not fecha:
        fecha = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query = """
        SELECT fi.producto_codigo, fi.producto_nombre,
               SUM(CASE WHEN fi.es_devolucion = 0 THEN fi.cantidad ELSE 0 END) as cantidad_vendida,
               SUM(CASE WHEN fi.es_devolucion = 1 THEN fi.cantidad ELSE 0 END) as cantidad_devuelta,
               SUM(CASE WHEN fi.es_devolucion = 0 THEN fi.cantidad * fi.precio_unitario ELSE 0 END) as total
        FROM facturas f
        JOIN facturas_items fi ON f.id = fi.factura_id
        WHERE f.fecha = TO_DATE(:fecha, 'YYYY-MM-DD')
    """
    params = {"fecha": fecha}
    
    user_route = get_user_route_filter(current_user)
    if user_route:
        query += " AND f.ruta_id = :ruta_id"
        params["ruta_id"] = user_route
    elif ruta_id:
        query += " AND f.ruta_id = :ruta_id"
        params["ruta_id"] = ruta_id
    
    query += " GROUP BY fi.producto_codigo, fi.producto_nombre ORDER BY fi.producto_codigo"
    
    productos = execute_query(query, params)
    
    total_ventas = sum(p.get("total", 0) or 0 for p in productos)
    total_devoluciones = sum((p.get("cantidad_devuelta", 0) or 0) * 1000 for p in productos)
    
    route_name = "Todas las rutas"
    if user_route or ruta_id:
        route = execute_query("SELECT nombre FROM rutas WHERE id = :id", {"id": user_route or ruta_id}, fetch="one")
        route_name = route["nombre"] if route else "Desconocida"
    
    count_query = "SELECT COUNT(*) as cnt FROM facturas WHERE fecha = TO_DATE(:fecha, 'YYYY-MM-DD')"
    count_params = {"fecha": fecha}
    if user_route or ruta_id:
        count_query += " AND ruta_id = :ruta_id"
        count_params["ruta_id"] = user_route or ruta_id
    
    count_result = execute_query(count_query, count_params, fetch="one")
    facturas_count = count_result.get("cnt", 0) if count_result else 0
    
    return {
        "fecha": fecha,
        "ruta": route_name,
        "encargado": current_user["nombre"],
        "productos": productos,
        "total_ventas": round(total_ventas, 2),
        "total_devoluciones": round(total_devoluciones, 2),
        "total_neto": round(total_ventas - total_devoluciones, 2),
        "facturas_count": facturas_count
    }

@api_router.get("/reports/export-excel")
async def export_excel(
    fecha: Optional[str] = None,
    ruta_id: Optional[str] = None,
    current_user: dict = Depends(require_permission("exportar_excel"))
):
    report = await get_daily_sales(fecha, ruta_id, current_user)
    
    output = io.StringIO()
    output.write(f"REPORTE DE VENTAS DIARIAS\n")
    output.write(f"Fecha:,{report['fecha']}\n")
    output.write(f"Ruta:,{report['ruta']}\n")
    output.write(f"Encargado:,{report['encargado']}\n")
    output.write(f"\n")
    output.write("Código,Nombre Producto,Cantidad Vendida,Cantidad Devuelta,Total\n")
    
    for product in report['productos']:
        output.write(f"{product['producto_codigo']},{product['producto_nombre']},{product['cantidad_vendida']},{product['cantidad_devuelta']},{product['total']}\n")
    
    output.write(f"\n")
    output.write(f",,Total Ventas,,{report['total_ventas']}\n")
    output.write(f",,Total Devoluciones,,{report['total_devoluciones']}\n")
    output.write(f",,TOTAL NETO,,{report['total_neto']}\n")
    
    content = output.getvalue()
    output.close()
    
    return StreamingResponse(
        io.BytesIO(content.encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ventas_{report['fecha']}.csv"}
    )

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    user_route = get_user_route_filter(current_user)
    
    store_query = "SELECT COUNT(*) as cnt FROM tiendas"
    store_params = {}
    if user_route:
        store_query += " WHERE ruta_id = :ruta_id"
        store_params["ruta_id"] = user_route
    stores_result = execute_query(store_query, store_params if store_params else None, fetch="one")
    total_stores = stores_result.get("cnt", 0) if stores_result else 0
    
    products_result = execute_query("SELECT COUNT(*) as cnt FROM productos", fetch="one")
    total_products = products_result.get("cnt", 0) if products_result else 0
    
    providers_result = execute_query("SELECT COUNT(*) as cnt FROM proveedores", fetch="one")
    total_providers = providers_result.get("cnt", 0) if providers_result else 0
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sales_query = "SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as cnt FROM facturas WHERE fecha = TO_DATE(:fecha, 'YYYY-MM-DD')"
    sales_params = {"fecha": today}
    if user_route:
        sales_query = sales_query.replace("WHERE", "WHERE ruta_id = :ruta_id AND")
        sales_params["ruta_id"] = user_route
    
    sales_result = execute_query(sales_query, sales_params, fetch="one")
    today_sales = sales_result.get("total", 0) if sales_result else 0
    today_invoices = sales_result.get("cnt", 0) if sales_result else 0
    
    routes = execute_query("SELECT id, nombre FROM rutas WHERE activo = 1")
    stores_per_route = []
    for route in routes:
        count_result = execute_query(
            "SELECT COUNT(*) as cnt FROM tiendas WHERE ruta_id = :ruta_id",
            {"ruta_id": route["id"]},
            fetch="one"
        )
        stores_per_route.append({
            "nombre": route["nombre"],
            "tiendas": count_result.get("cnt", 0) if count_result else 0
        })
    
    days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    stores_per_day = []
    for day in days:
        day_query = "SELECT COUNT(*) as cnt FROM tiendas WHERE dia_entrega = :dia"
        day_params = {"dia": day}
        if user_route:
            day_query += " AND ruta_id = :ruta_id"
            day_params["ruta_id"] = user_route
        
        count_result = execute_query(day_query, day_params, fetch="one")
        stores_per_day.append({
            "dia": day,
            "tiendas": count_result.get("cnt", 0) if count_result else 0
        })
    
    return {
        "total_tiendas": total_stores,
        "total_productos": total_products,
        "total_proveedores": total_providers,
        "ventas_hoy": round(float(today_sales or 0), 2),
        "facturas_hoy": today_invoices,
        "tiendas_por_ruta": stores_per_route,
        "tiendas_por_dia": stores_per_day
    }

# ==================== APP CONFIG ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
