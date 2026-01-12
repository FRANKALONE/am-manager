# Diferencias Usuario Premium vs Estándar

## Resumen Ejecutivo

Los usuarios Premium tienen acceso a funcionalidades avanzadas que no están disponibles para usuarios Estándar. La condición de Premium se determina automáticamente por:

1. **Rol Premium**: Roles marcados con el flag `isPremium = 1` (ADMIN, GERENTE, DIRECTOR)
2. **Work Package Premium**: Clientes con períodos de vigencia premium activos

---

## Tabla Comparativa

| Funcionalidad | Usuario Estándar | Usuario Premium |
|--------------|------------------|-----------------|
| **Ver Dashboard de Consumos** | ✅ Sí | ✅ Sí |
| **Descargar Reportes CSV** | ✅ Sí | ✅ Sí |
| **Ver Evolutivos** | ✅ Sí | ✅ Sí |
| **Solicitar Revisión de Imputaciones** | ❌ No | ✅ Sí |
| **Badge en Admin** | Sin badge | ⭐ Premium |

---

## Funcionalidades Exclusivas Premium

### 1. Solicitar Revisión de Imputaciones (Reclamaciones)

**Descripción:** Permite reclamar horas imputadas que el cliente considera incorrectas o indebidas.

**Requisitos:**
- ✅ Ser usuario Premium (por rol o por WP)
- ✅ Tener permiso `request_review` asignado en el rol

**Proceso:**
1. Acceder al dashboard de consumos de un Work Package
2. Expandir el detalle mensual
3. Seleccionar las imputaciones mediante checkboxes
4. Click en "Solicitar Revisión"
5. Escribir motivo de la reclamación
6. El administrador revisa y aprueba/rechaza

**Impacto:**
- Las imputaciones aprobadas se marcan como "DEVUELTO" en rojo
- Se ajusta automáticamente el balance de horas del período
- El cliente recibe notificación del estado de su solicitud

**Restricción:**
- Los usuarios Estándar **NO VEN** los checkboxes ni el botón "Solicitar Revisión"
- Incluso si el permiso está activado en su rol, necesitan ser Premium para usar esta función

---

## Identificación de Usuarios Premium

### En la Tabla de Usuarios (Admin)

**Usuario Premium:**
```
┌─────────────────────────────────────────────┐
│ Juan Pérez         │ CLIENTE_VIP │ ⭐ Premium │
│ María García       │ GERENTE     │ ⭐ Premium │
└─────────────────────────────────────────────┘
```

**Usuario Estándar:**
```
┌─────────────────────────────────────────────┐
│ Pedro López        │ CLIENTE     │ Standard  │
└─────────────────────────────────────────────┘
```

### Cómo se Determina

El sistema verifica **en cascada**:

1. **Primero**: ¿El rol tiene `isPremium = 1`?
   - Si SÍ → Usuario Premium ⭐
   
2. **Si NO**: ¿El cliente tiene algún WP con período premium activo?
   - Si SÍ → Usuario Premium ⭐
   
3. **Si NO**: Usuario Estándar

---

## Configuración de Roles Premium

### Para Crear un Rol Premium

1. Ir a **Admin** → **Roles** → **Nuevo Rol**
2. Rellenar datos básicos (nombre, descripción)
3. Seleccionar permisos deseados
4. ✅ Marcar "**⭐ Rol Premium**"
5. Guardar

### Roles Premium por Defecto

- `ADMIN` - Siempre premium
- `GERENTE` - Siempre premium  
- `DIRECTOR` - Siempre premium

### Ejemplo: Rol Cliente VIP

```
Nombre: CLIENTE_VIP
Descripción: Cliente con servicios premium
Permisos:
  ✅ Ver Dashboard de Cliente
  ✅ ⭐ Solicitar Revisión de Imputaciones (Premium)
  ✅ Ver Evolutivos
⭐ Rol Premium: SÍ
```

---

## Casos de Uso

### Caso 1: Cliente con Contrato Premium

**Escenario:**
- Usuario: `cliente@empresa.com`
- Rol: `CLIENTE` (isPremium = 0)
- Work Package: "Soporte 2025" con período premium activo

**Resultado:** ✅ Usuario Premium (por WP)
- Puede solicitar revisiones
- Aparece con badge "⭐ Premium" en admin

---

### Caso 2: Cliente VIP sin WP Premium

**Escenario:**
- Usuario: `vip@empresa.com`
- Rol: `CLIENTE_VIP` (isPremium = 1)
- Work Package: Sin períodos premium

**Resultado:** ✅ Usuario Premium (por rol)
- Puede solicitar revisiones
- Aparece con badge "⭐ Premium" en admin

---

### Caso 3: Cliente Standard

**Escenario:**
- Usuario: `basico@empresa.com`
- Rol: `CLIENTE_BASICO` (isPremium = 0)
- Work Package: Sin períodos premium

**Resultado:** ❌ Usuario Estándar
- NO puede solicitar revisiones (aunque tenga el permiso)
- Aparece como "Standard" en admin

---

## Permisos que Requieren Premium

| Permiso | Nombre | Requiere Premium |
|---------|--------|------------------|
| `view_client_dashboard` | Ver Dashboard de Cliente | ❌ No |
| `view_manager_dashboard` | Ver Dashboard de Gerente | ❌ No |
| `view_admin_dashboard` | Ver Dashboard Admin | ❌ No |
| `request_review` | ⭐ Solicitar Revisión (Premium) | ✅ **SÍ** |

---

## Preguntas Frecuentes

### ¿Puedo dar el permiso `request_review` a un rol Standard?

**Sí**, puedes asignarlo anticipadamente. Sin embargo, la funcionalidad **NO estará activa** hasta que el usuario sea Premium (por rol o por WP).

### ¿Qué pasa si un usuario pierde el estado Premium?

Si un usuario era Premium por tener un WP con período premium y ese período expira:
- Pierde automáticamente el estado Premium
- Ya no puede crear nuevas reclamaciones
- Las reclamaciones anteriores siguen siendo válidas

### ¿Los gerentes y admins son siempre Premium?

Sí, los roles `ADMIN`, `GERENTE` y `DIRECTOR` están marcados como premium de forma permanente en la base de datos.

### ¿Cómo convertir un cliente en Premium permanentemente?

Opción 1: **Por Rol**
- Crear rol `CLIENTE_VIP` con flag premium
- Asignar ese rol al usuario

Opción 2: **Por Contrato**
- Marcar el período de vigencia del WP como premium (`isPremium = true`)
- El usuario será premium mientras ese período esté activo

---

## Impacto en la Experiencia de Usuario

### Dashboard de Consumos - Usuario Estándar

```
[Vista Mensual]
  Mes: Enero 2025
  
  [Tipo de Ticket: Incidencias]
    Ticket INC-123: Resolver error login
      📅 10/01/25 - Juan Pérez - INC - 2.5h
      📅 11/01/25 - María López - INC - 1.0h
      
    Ticket INC-124: Configurar VPN
      📅 12/01/25 - Pedro Gómez - INC - 3.0h
      
  Total: 6.5h
```

### Dashboard de Consumos - Usuario Premium

```
[Vista Mensual]
  Mes: Enero 2025
  
  [✓ Seleccionar Todo] [📊 Exportar Excel]
  
  [Tipo de Ticket: Incidencias]
    [✓] Ticket INC-123: Resolver error login  ← Checkboxes visibles
      ☑ 📅 10/01/25 - Juan Pérez - INC - 2.5h
      ☐ 📅 11/01/25 - María López - INC - 1.0h
      
      [🕐 Solicitar Revisión]                   ← Botón visible
      
    [☐] Ticket INC-124: Configurar VPN
      ☐ 📅 12/01/25 - Pedro Gómez - INC - 3.0h
      
  Total: 6.5h
```

---

## Resumen

✅ **Usuario Premium = Más Control**
- Puede reclamar imputaciones incorrectas
- Mayor transparencia y gestión activa de consumos

❌ **Usuario Estándar = Vista de Solo Lectura**
- Solo visualización de consumos
- Sin capacidad de reclamación

💡 **Recomendación:** Para clientes que requieren control fino sobre facturación, asignar rol Premium o marcar períodos de WP como premium.
