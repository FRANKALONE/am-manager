# Guía de Permisos y Roles - AM Manager

## Introducción

El sistema de roles de AM Manager permite configurar diferentes niveles de acceso para los usuarios. Cada rol puede tener una combinación de permisos que determinan qué funcionalidades puede utilizar el usuario.

## Permisos Disponibles

### 📊 General

#### `view_dashboard` - Ver Dashboard de Consumos
**Descripción**: Permite al usuario acceder al dashboard principal de consumos donde puede visualizar métricas, evolución mensual y reportes de tickets.

**Acceso a**:
- Dashboard de consumos en tiempo real
- Métricas de contratado vs consumido
- Evolución mensual con desglose
- Reporte de consumo por ticket
- Gráficos y estadísticas de uso

**Recomendado para**: Todos los roles que necesiten consultar información de consumos (clientes, gestores, administradores).

---

#### `view_cierres` - Ver Gestión de Cierres
**Descripción**: Permite acceder a la sección de gestión de cierres mensuales.

**Acceso a**:
- Vista de cierres mensuales
- Histórico de cierres
- Detalles de facturación mensual

**Recomendado para**: Roles de gestión y administración que necesiten revisar cierres contables.

---

#### `request_review` - Solicitar Revisión de Imputaciones
**Descripción**: Permite a los clientes seleccionar imputaciones específicas y solicitar una revisión formal si consideran que hay errores.

**Acceso a**:
- Checkboxes de selección en el detalle mensual de consumos
- Botón "Solicitar Revisión"
- Formulario de reclamación de horas
- Historial de reclamaciones enviadas

**Recomendado para**: Usuarios cliente que necesiten auditar y reclamar imputaciones.

---

### 🔧 Administración

#### `manage_users` - Gestionar Usuarios
**Descripción**: Permite crear, editar y eliminar usuarios del sistema.

**Acceso a**:
- Listado de usuarios
- Crear nuevos usuarios
- Editar información de usuarios existentes
- Asignar roles a usuarios
- Activar/desactivar usuarios
- Eliminar usuarios

**Recomendado para**: Solo administradores del sistema.

---

#### `manage_clients` - Gestionar Clientes
**Descripción**: Permite administrar la información de clientes en el sistema.

**Acceso a**:
- Listado de clientes
- Crear nuevos clientes
- Editar información de clientes
- Ver detalles completos de clientes
- Configurar URL del portal JIRA del cliente

**Recomendado para**: Administradores y gestores de cuenta.

---

#### `manage_wps` - Gestionar Work Packages
**Descripción**: Permite administrar Work Packages (contratos/proyectos).

**Acceso a**:
- Listado de Work Packages
- Crear nuevos WPs
- Editar configuración de WPs
- Gestionar periodos de validez
- Configurar parámetros de facturación
- Sincronizar con JIRA/Tempo
- Gestionar regularizaciones

**Recomendado para**: Administradores y gestores de proyectos.

---

#### `manage_roles` - Gestionar Roles
**Descripción**: Permite crear y configurar roles del sistema.

**Acceso a**:
- Listado de roles
- Crear nuevos roles
- Editar permisos de roles existentes
- Activar/desactivar roles

**Recomendado para**: Solo administradores del sistema.

---

### 💰 Finanzas

#### `view_costs` - Ver Tarifas y Costes
**Descripción**: Permite visualizar información financiera sensible como tarifas, costes y regularizaciones.

**Acceso a**:
- Columna de "Regularización" en detalle mensual
- Tarifas de Work Packages
- Precios premium
- Tarifas de regularización
- Información de costes en general

**Impacto en Dashboard**:
- **CON permiso**: Muestra columna "Regularización" en tabla mensual
- **SIN permiso**: Oculta información de regularizaciones y tarifas

**Recomendado para**: Administradores, gestores financieros y clientes que deban ver información de facturación detallada.

---

#### `edit_billing` - Editar Regularizaciones
**Descripción**: Permite crear y modificar regularizaciones de facturación.

**Acceso a**:
- Crear regularizaciones manuales
- Editar regularizaciones existentes
- Eliminar regularizaciones
- Tipos de regularización:
  - **EXCESS**: Exceso de consumo
  - **RETURN**: Devolución de horas
  - **MANUAL_CONSUMPTION**: Consumo manual

**Recomendado para**: Solo administradores y gestores financieros autorizados.

---

## Roles Recomendados

### 👤 Cliente Básico
**Permisos sugeridos**:
- ✅ `view_dashboard`

**Descripción**: Usuario cliente que solo necesita consultar sus consumos sin ver información financiera detallada.

---

### 👤 Cliente Premium
**Permisos sugeridos**:
- ✅ `view_dashboard`
- ✅ `view_costs`

**Descripción**: Usuario cliente que necesita ver información completa incluyendo regularizaciones y costes.

---

### 👤 Gestor de Proyecto
**Permisos sugeridos**:
- ✅ `view_dashboard`
- ✅ `view_cierres`
- ✅ `manage_wps`
- ✅ `view_costs`

**Descripción**: Usuario interno que gestiona Work Packages pero no tiene acceso a administración completa.

---

### 👤 Administrador Financiero
**Permisos sugeridos**:
- ✅ `view_dashboard`
- ✅ `view_cierres`
- ✅ `manage_clients`
- ✅ `manage_wps`
- ✅ `view_costs`
- ✅ `edit_billing`

**Descripción**: Usuario con acceso completo a gestión financiera y facturación.

---

### 👤 Administrador del Sistema
**Permisos sugeridos**:
- ✅ Todos los permisos

**Descripción**: Usuario con acceso total al sistema.

---

## Matriz de Permisos

| Permiso | Cliente Básico | Cliente Premium | Gestor | Admin Financiero | Admin Sistema |
|---------|:--------------:|:---------------:|:------:|:----------------:|:-------------:|
| view_dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| view_cierres | ❌ | ❌ | ✅ | ✅ | ✅ |
| manage_users | ❌ | ❌ | ❌ | ❌ | ✅ |
| manage_clients | ❌ | ❌ | ❌ | ✅ | ✅ |
| manage_wps | ❌ | ❌ | ✅ | ✅ | ✅ |
| manage_roles | ❌ | ❌ | ❌ | ❌ | ✅ |
| view_costs | ❌ | ✅ | ✅ | ✅ | ✅ |
| edit_billing | ❌ | ❌ | ❌ | ✅ | ✅ |
| request_review | ✅ | ✅ | ✅ | ✅ | ✅ |
| manage_reviews | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## Consideraciones de Seguridad

### 🔒 Información Sensible
- Los permisos `view_costs` y `edit_billing` controlan el acceso a información financiera sensible
- Solo otorgar estos permisos a usuarios de confianza
- Revisar periódicamente quién tiene acceso a información de costes

### 🔒 Permisos Administrativos
- Los permisos de gestión (`manage_*`) permiten modificar configuraciones críticas
- Limitar estos permisos solo a personal autorizado
- El permiso `manage_roles` es especialmente crítico ya que permite modificar otros roles

### 🔒 Auditoría
- Todos los cambios realizados por usuarios con permisos de edición quedan registrados
- Revisar regularmente los logs de actividad
- Mantener un número mínimo de usuarios con permisos administrativos

---

## Preguntas Frecuentes

### ¿Puedo crear roles personalizados?
Sí, puedes crear tantos roles como necesites combinando los permisos disponibles según tus necesidades específicas.

### ¿Qué pasa si un usuario no tiene ningún permiso?
El usuario podrá iniciar sesión pero no tendrá acceso a ninguna funcionalidad del sistema.

### ¿Puedo cambiar los permisos de un rol existente?
Sí, puedes editar los permisos de cualquier rol. Los cambios se aplicarán inmediatamente a todos los usuarios con ese rol.

### ¿Un usuario puede tener múltiples roles?
No, cada usuario tiene asignado un único rol. Si necesitas diferentes combinaciones de permisos, crea roles personalizados.

---

## Versión del Documento
- **Versión**: 1.0
- **Fecha**: Diciembre 2024
- **Sistema**: AM Manager v2512.003
