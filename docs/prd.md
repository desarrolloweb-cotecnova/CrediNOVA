# Documento de Requisitos

## 1. Resumen de la Aplicación

### 1.1 Nombre de la Aplicación
CrediNOVA – Crédito Educativo

### 1.2 Descripción
Aplicación web completa para la gestión digital y semi-autónoma del proceso de crédito educativo de la Corporación de Estudios Tecnológicos del Norte del Valle (Cotecnova). El sistema permite a estudiantes y deudores solidarios crear y consultar solicitudes de crédito de forma pública, mientras que usuarios internos (Administrador, Gestor, Aprobador) gestionan el flujo de aprobación, validación y seguimiento mediante un panel administrativo.

### 1.3 Identidad Visual
- **Logo**: Usar imagen Logo CrediNova V3.png (letra C con birrete de graduación)
- **Paleta de colores**:
  - Principal: #00602F (verde institucional)
  - Secundario: #EE7117 (naranja)
  - Terciario: #525252 (gris oscuro)
  - Fondo: #FFFFFF (blanco)
- **Tipografía**: Google Fonts — Poppins para títulos, Source Sans 3 para cuerpo
- **Estilo**: Diseño sobrio, profesional e institucional. Verde dominante en headers y botones primarios, naranja como acento para estados activos, alertas y CTAs secundarios

---

## 2. Usuarios y Escenarios de Uso

### 2.1 Usuarios Públicos (sin login)
- **Estudiantes**: Crean solicitudes de crédito, consultan estado, realizan acciones según el estado de su solicitud
- **Deudores Solidarios**: Participan en la creación de solicitudes, verifican información mediante OTP
- **Acceso**: Mediante código de solicitud + número de cédula del estudiante

### 2.2 Usuarios Internos (con login)
Tres roles con credenciales iniciales:

| Rol | Correo | Contraseña Provisional | Permisos |
|-----|--------|------------------------|----------|
| Administrador | desarrolloweb@cotecnova.edu.co | CrediNova2025 | Acceso total, gestión de usuarios internos, reportes, configuración |
| Gestor | creditoycartera@cotecnova.edu.co | CrediNova2025 | Gestión de solicitudes, validaciones, aprobación/rechazo |
| Aprobador | contador@cotecnova.edu.co | CrediNova2025 | Aprobación final del crédito, visualización de reportes financieros |

### 2.3 Escenarios de Uso
- Estudiante solicita crédito educativo completando formulario en línea
- Verificación electrónica mediante códigos OTP enviados por correo
- Gestor valida información telefónicamente y aprueba o solicita ajustes
- Estudiante registra pago de cuota inicial y acepta plan de pagos
- Estudiante y deudor solidario firman garantías presencialmente
- Sistema genera autorización de matrícula financiera
- Administrador gestiona usuarios internos y genera reportes

---

## 3. Estructura de Páginas y Funcionalidades

### 3.1 Estructura General

```
CrediNOVA
├── Área Pública
│   ├── Landing Page (/)
│   ├── Nueva Solicitud (/solicitud/nueva)
│   ├── Consultar Solicitud (/solicitud/consultar)
│   └── Vista de Solicitud (/solicitud/:codigo)
└── Área Interna (requiere login)
    ├── Login (/admin/login)
    ├── Dashboard (/admin/dashboard)
    ├── Tabla de Solicitudes (/admin/solicitudes)
    ├── Detalle de Solicitud (/admin/solicitudes/:id)
    ├── Reportes (/admin/reportes)
    └── Gestión de Usuarios (/admin/usuarios)
```

### 3.2 Área Pública

#### 3.2.1 Landing Page (/)
**Elementos:**
- Header con logo CrediNOVA
- Sección hero con título y descripción del servicio
- Información de los planes de crédito:
  - Plan 50/50 (Corto Plazo): máximo 2 cuotas, sin intereses, cuota inicial 50%
  - Plan 20/80 (Mediano Plazo): máximo 3 cuotas, con tasa de interés, cuota inicial 20%
- Botón principal: Solicitar Crédito (redirige a /solicitud/nueva)
- Botón secundario: Consultar Solicitud (redirige a /solicitud/consultar)
- Footer con datos de contacto de Cotecnova

#### 3.2.2 Nueva Solicitud (/solicitud/nueva)
**Formulario dividido en 5 secciones:**

**Sección A – Datos del Deudor Solidario:**
- Nombre completo
- Tipo de documento (CC / CE)
- Número de documento
- Fecha de expedición
- Fecha de nacimiento
- Género
- Estado civil
- Personas a cargo
- Dirección
- Barrio
- Ciudad
- Departamento
- Nivel de estudios (opciones: Primaria / Secundaria / Técnica / Tecnológica / Universitaria / Posgrado / Ninguno)
- Celular
- Correo electrónico
- Ocupación (opciones: Empleado / Pensionado / Independiente / Otro)
- Nombre del cónyuge
- Empresa donde trabaja el cónyuge
- Dirección empresa cónyuge
- Teléfono empresa cónyuge
- Empresa donde trabaja
- Cargo
- Teléfono empresa
- Extensión
- Ciudad empresa
- Tipo de contrato (opciones: Indefinido / Fijo / Prestación de servicios)
- Fecha de ingreso laboral
- Ingreso/salario/pensión
- Gastos mensuales
- Referencia familiar: nombre y teléfono
- Referencia personal: nombre y teléfono
- Si es independiente: proveedor principal (nombre y teléfono), cliente principal (nombre y teléfono)

**Sección B – Datos del Estudiante:**
- Nombre completo
- Tipo de documento (CC / TI)
- Número de documento
- Teléfono
- Correo electrónico
- Dirección de residencia
- Barrio de residencia
- Programa en el que se matricula
- Semestre
- Jornada (opciones: Diurna / Nocturna / Sabatina)
- ¿Trabaja? (Sí/No)
- Si trabaja: nombre empresa, salario, dirección empresa, teléfono empresa
- Relación con el deudor solidario

**Sección C – Información del Pago del Estudio de Crédito:**
- Número de recibo de pago
- Fecha de consignación
- Valor pagado

**Sección D – Selección del Plan de Crédito:**
- Radio buttons para seleccionar:
  - Plan 50/50 (Corto Plazo)
  - Plan 20/80 (Mediano Plazo)
- Al seleccionar cada plan, mostrar descripción resumida

**Sección E – Autorizaciones y Declaraciones:**
- Bloque scrolleable con texto completo de:
  1. Autorización para Consulta y Reporte en Centrales de Riesgo
  2. Autorización para el Tratamiento de Datos Personales (Ley 1581 de 2012, Decreto 1377 de 2013)
  3. Declaración de Origen de Fondos e Ingresos
  4. Autorización para la Gestión de Cobranza
  5. Declaraciones Finales
- Dos checkboxes obligatorios:
  - Acepto las autorizaciones y declaraciones como Estudiante
  - Acepto las autorizaciones y declaraciones como Deudor Solidario

**Verificación OTP:**
- Al hacer clic en Enviar solicitud:
  - Sistema envía código OTP de 6 dígitos al correo del estudiante
  - Sistema envía código OTP de 6 dígitos al correo del deudor solidario
  - Ambos códigos tienen vigencia de 15 minutos
- Pantalla de verificación con dos campos para ingresar los códigos OTP
- Al validar correctamente:
  - Sistema genera código de solicitud único (formato: CN-YYYYMM-XXXX, ejemplo: CN-202605-0042)
  - Muestra código en pantalla con instrucciones para guardarlo
  - Envía correo al estudiante y deudor solidario con el código
  - Solicitud queda en estado En Revisión

#### 3.2.3 Consultar Solicitud (/solicitud/consultar)
**Formulario de consulta:**
- Campo: Código de solicitud
- Campo: Número de cédula del estudiante
- Botón: Consultar
- Al validar correctamente, redirige a /solicitud/:codigo

#### 3.2.4 Vista de Solicitud (/solicitud/:codigo)
**Contenido dinámico según estado:**

**Estado: En Revisión**
- Mensaje: Su solicitud está siendo revisada por nuestro equipo
- Información de la solicitud enviada

**Estado: Requiere Ajustes**
- Mensaje con motivo del rechazo/observaciones
- Formulario editable con los mismos campos de la solicitud original
- Opción para reemplazar o agregar codeudor solidario
- Al reenviar, nueva verificación OTP por correo
- Solicitud regresa a estado En Revisión

**Estado: Aprobado**
- Notificación de aprobación
- Plan de crédito aprobado (50/50 o 20/80)
- Valor de la cuota inicial a pagar
- Tabla con plan de pagos completo: número de cuota, fecha límite de pago, valor de cuota
- Instrucciones para generar recibo de pago en: www.recibo.appcotecnova.es
- Recordatorio: si las cuotas NO se cancelan en los primeros 5 días, se aplica sanción del 10% sobre el valor de cada cuota
- Política de deserción: si hay deserción pasadas 2 semanas, se debe cancelar la totalidad del crédito
- Formulario para registrar pago de cuota inicial:
  - Número de recibo
  - Fecha de consignación
  - Valor pagado
- Checkbox obligatorio: He leído y acepto el plan de pagos propuesto para mi crédito educativo
- Botón: Confirmar pago
- Al confirmar, pasa a estado Pendiente Firma de Garantías

**Estado: Pendiente Firma de Garantías**
- Mensaje: Debes dirigirte a la Oficina de Crédito y Cartera para firmar el Pagaré y la Carta de Instrucciones junto con tu Codeudor Solidario
- Botón: Imprimir Formulario de Solicitud (genera PDF con toda la información de la solicitud incluyendo estado de verificación y aprobación)
- Lista de documentos requeridos:
  - Formulario impreso (generado aquí)
  - Cédula de ciudadanía del Estudiante
  - Cédula de ciudadanía del Deudor Solidario
  - Soportes laborales del Deudor Solidario (carta laboral o desprendibles últimos 3 meses, o certificado de ingresos si es independiente, o desprendibles de pensión)

**Estado: Matrícula Autorizada**
- Notificación de aprobación final con fondo verde institucional
- Botón: Imprimir Autorización de Matrícula Financiera
- PDF generado incluye:
  - Logo de CrediNOVA y encabezado institucional
  - Número de solicitud
  - Nombre completo del estudiante y número de documento
  - Programa, semestre, jornada
  - Plan de crédito aprobado
  - Valor total del semestre, cuota inicial pagada, saldo financiado
  - Plan de pagos (cuotas, fechas, valores)
  - Nombre y documento del Deudor Solidario
  - Fecha de expedición
  - Espacio para firma y sello de la Oficina de Crédito y Cartera
  - Instrucción: Presentar este documento en la Oficina de Registro y Control Académico

### 3.3 Área Interna

#### 3.3.1 Login (/admin/login)
- Campo: Correo electrónico
- Campo: Contraseña
- Botón: Iniciar sesión
- Autenticación mediante JWT con refresh tokens

#### 3.3.2 Dashboard (/admin/dashboard)
**Tarjetas con métricas en tiempo real:**
- Total solicitudes (mes actual / histórico)
- Solicitudes por estado:
  - Nueva
  - En Revisión
  - Requiere Ajustes
  - Aprobadas
  - Rechazadas
  - Finalizadas
- Valor total de créditos aprobados (mes / acumulado)
- Distribución por plan (50/50 vs 20/80)
- Distribución por programa académico

#### 3.3.3 Tabla de Solicitudes (/admin/solicitudes)
**Funcionalidades:**
- Búsqueda por: código de solicitud, nombre estudiante, cédula, programa, estado, rango de fechas
- Filtros combinables
- Columnas:
  - Código
  - Estudiante
  - Programa
  - Plan
  - Valor semestre
  - Estado
  - Fecha solicitud
  - Gestor asignado
- Paginación
- Botón: Exportar a Excel / CSV
- Clic en fila redirige a vista detalle de la solicitud

#### 3.3.4 Detalle de Solicitud (/admin/solicitudes/:id)
**Información completa de la solicitud:**
- Todos los datos del formulario original
- Estado actual
- Historial de cambios de estado

**Para estado En Revisión (Gestor / Aprobador):**
- Sección de Validación Telefónica con tabla:

| Campo a validar | ¿Verificado? | Fecha verificación | Observaciones |
|-----------------|--------------|-------------------|---------------|
| Estabilidad laboral deudor (≥6 meses) | Checkbox | Campo fecha | Campo texto |
| Ingresos declarados | Checkbox | Campo fecha | Campo texto |
| Datos laborales deudor solidario | Checkbox | Campo fecha | Campo texto |
| Referencia familiar | Checkbox | Campo fecha | Campo texto |
| Referencia personal | Checkbox | Campo fecha | Campo texto |
| Pago estudio de crédito | Checkbox | Campo fecha | Campo texto |
| Sin reportes negativos centrales | Checkbox | Campo fecha | Campo texto |

- Botones de acción:
  - Aprobar solicitud (pasa a estado Aprobado)
  - Rechazar / Solicitar corrección (pasa a estado Requiere Ajustes, con campo obligatorio de motivo detallado)

**Para estado Pendiente Firma de Garantías (Gestor):**
- Checkbox: Garantías firmadas — Pagaré y Carta de Instrucciones recibidos
- Campo: Fecha
- Campo: Observaciones
- Botón: Confirmar (pasa a estado Matrícula Autorizada)

#### 3.3.5 Reportes (/admin/reportes)
**Reportes imprimibles:**
- Listado de créditos aprobados por período
- Reporte de cartera (plan de pagos agregado)
- Solicitudes rechazadas con motivo
- Estadísticas por programa, jornada, plan de crédito
- Botón: Exportar a PDF / Excel

#### 3.3.6 Gestión de Usuarios (/admin/usuarios)
**Solo accesible para Administrador:**
- Tabla de usuarios internos con columnas:
  - Nombre
  - Correo
  - Rol
  - Estado (Activo / Inactivo)
  - Fecha de creación
  - Acciones (Editar / Eliminar)
- Botón: Crear nuevo usuario
- Formulario de creación/edición:
  - Nombre completo
  - Correo electrónico
  - Contraseña
  - Rol (Administrador / Gestor / Aprobador)
  - Estado (Activo / Inactivo)
- Log de actividad por usuario

---

## 4. Reglas de Negocio y Lógica

### 4.1 Flujo de Estados de Solicitud

**Estado 1: Nueva Solicitud**
- Estudiante completa formulario
- Sistema envía OTP a correos de estudiante y deudor solidario
- Validación de ambos OTPs (vigencia 15 minutos)
- Generación de código de solicitud único (formato: CN-YYYYMM-XXXX)
- Transición automática a estado En Revisión

**Estado 2: En Revisión**
- Gestor/Aprobador realiza validación telefónica
- Gestor puede:
  - Aprobar → Estado 3 (Aprobado)
  - Rechazar/Solicitar corrección → Estado 2B (Requiere Ajustes)

**Estado 2B: Requiere Ajustes**
- Estudiante puede editar campos y/o reemplazar codeudor
- Al reenviar, nueva verificación OTP
- Regresa a Estado 2 (En Revisión)

**Estado 3: Aprobado**
- Sistema calcula cuota inicial según plan seleccionado
- Sistema genera plan de pagos completo
- Estudiante registra pago de cuota inicial
- Estudiante acepta plan de pagos
- Transición a Estado 4 (Pendiente Firma de Garantías)

**Estado 4: Pendiente Firma de Garantías**
- Estudiante imprime formulario de solicitud
- Gestor marca garantías como firmadas
- Transición a Estado 5 (Matrícula Autorizada)

**Estado 5: Matrícula Autorizada**
- Estado final
- Estudiante puede imprimir Autorización de Matrícula Financiera

### 4.2 Cálculo de Cuotas y Plan de Pagos

**Plan 50/50:**
- Cuota inicial: 50% del valor del semestre
- Saldo: 50% dividido en máximo 2 cuotas
- Sin intereses

**Plan 20/80:**
- Cuota inicial: 20% del valor del semestre
- Saldo: 80% dividido en máximo 3 cuotas
- Con tasa de interés

**Sanciones:**
- Si las cuotas NO se cancelan en los primeros 5 días: sanción del 10% sobre el valor de cada cuota
- Deserción pasadas 2 semanas: cancelar totalidad del crédito

### 4.3 Validación Telefónica
Campos obligatorios a verificar:
- Estabilidad laboral deudor (mínimo 6 meses)
- Ingresos declarados
- Datos laborales deudor solidario
- Referencia familiar
- Referencia personal
- Pago estudio de crédito
- Sin reportes negativos en centrales de riesgo

### 4.4 Notificaciones por Correo
Envío automático en cada cambio de estado:
- Nueva solicitud creada: correo al estudiante y deudor con código de solicitud
- En revisión: confirmación de recepción
- Requiere ajustes: notificación con motivo detallado y enlace para editar
- Aprobado: notificación con plan de pagos y próximos pasos
- Pendiente firma: recordatorio con lista de documentos
- Matrícula autorizada: notificación final con enlace para imprimir autorización

Todos los correos incluyen:
- Logo de CrediNOVA en header
- Pie de página con datos de contacto de Cotecnova

### 4.5 Autorizaciones y Declaraciones
Texto completo que debe aceptarse:
1. Autorización para Consulta y Reporte en Centrales de Riesgo
2. Autorización para el Tratamiento de Datos Personales (Ley 1581 de 2012, Decreto 1377 de 2013)
3. Declaración de Origen de Fondos e Ingresos
4. Autorización para la Gestión de Cobranza (gastos hasta 20% del valor de la obligación, canales: SMS, correo electrónico, llamada telefónica, correo certificado, WhatsApp)
5. Declaraciones Finales (datos veraces, completos y actualizados bajo gravedad de juramento)

---

## 5. Casos Excepcionales y Situaciones Límite

| Situación | Comportamiento del Sistema |
|-----------|---------------------------|
| OTP no recibido | Botón para reenviar código (máximo 3 intentos cada 10 minutos por IP) |
| OTP expirado (>15 minutos) | Mensaje de error, solicitar nuevo código |
| Código de solicitud incorrecto | Mensaje: Código de solicitud no encontrado |
| Cédula incorrecta al consultar | Mensaje: Los datos no coinciden con ninguna solicitud |
| Usuario interno con credenciales incorrectas | Mensaje: Correo o contraseña incorrectos |
| Intento de acceso a solicitud sin autorización | Redirigir a página de consulta |
| Formulario incompleto | Validación en frontend y backend, resaltar campos faltantes |
| Archivo PDF no generado | Mensaje de error, botón para reintentar |
| Correo no enviado | Log de error, reintento automático |
| Sesión de usuario interno expirada | Redirigir a login, mensaje: Su sesión ha expirado |

---

## 6. Criterios de Aceptación

1. Estudiante puede completar formulario de solicitud y recibir código único
2. Sistema envía OTPs de 6 dígitos a correos de estudiante y deudor solidario con vigencia de 15 minutos
3. Código de solicitud sigue formato CN-YYYYMM-XXXX
4. Usuarios internos pueden iniciar sesión con credenciales proporcionadas
5. Gestor puede realizar validación telefónica y aprobar/rechazar solicitudes
6. Sistema calcula correctamente cuota inicial y plan de pagos según plan seleccionado
7. Estudiante puede registrar pago de cuota inicial y aceptar plan de pagos
8. Gestor puede marcar garantías como firmadas
9. Sistema genera PDF de Formulario de Solicitud con toda la información
10. Sistema genera PDF de Autorización de Matrícula Financiera con formato especificado
11. Dashboard muestra métricas en tiempo real
12. Tabla de solicitudes permite búsqueda, filtrado y exportación
13. Administrador puede crear, editar y eliminar usuarios internos
14. Sistema envía notificaciones por correo en cada cambio de estado
15. Todos los correos incluyen logo de CrediNOVA y datos de contacto
16. Validación de formularios en frontend y backend
17. Rate limiting en endpoints de OTP (máximo 3 intentos por IP cada 10 minutos)
18. Contraseñas de usuarios internos hasheadas con bcrypt
19. Logs de auditoría para todas las acciones de usuarios internos
20. Diseño responsive funcional en móvil para flujo público
21. Manejo de errores con mensajes claros en español
22. Variables de entorno para todas las credenciales

---

## 7. Funcionalidades No Incluidas en Esta Versión

- Integración directa con centrales de riesgo
- Pasarela de pago en línea para cuota inicial
- Notificaciones push o SMS
- Módulo de chat en vivo
- Integración con sistemas contables externos
- Firma digital de documentos
- Aplicación móvil nativa
- Recordatorios automáticos de pago
- Portal para deudores solidarios con acceso independiente
- Generación automática de pagarés y cartas de instrucciones
- Análisis predictivo de riesgo crediticio
- Integración con sistemas de información académica de Cotecnova