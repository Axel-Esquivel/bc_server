# 00 – Visión general del proyecto (PROJECT_OVERVIEW)

Este documento describe a alto nivel qué es **Business Control** y qué resuelve el backend.

## 1. Objetivo del sistema

**Business Control** es una plataforma modular de gestión empresarial enfocada en:

- Tiendas, puntos de venta y pequeños negocios.
- Control de inventario, compras y ventas.
- Contabilidad automática a partir de los eventos de negocio.
- Soporte multiempresa y multi-Organization.

El backend debe ser:

- **Robusto**: preparado para crecer en funcionalidades.
- **Modular**: módulos independientes (auth, inventario, POS, etc.).
- **Auditado**: todo debe dejar rastro (quién hizo qué y cuándo).
- **Escalable**: que pueda separarse en microservicios en el futuro.

## 2. Stack tecnológico

- **Lenguaje**: TypeScript.
- **Framework HTTP**: NestJS 11.
- **Base de datos**: MongoDB.
- **ORM / ODM**:
  - `@nestjs/mongoose`
  - `@typegoose/typegoose` (modelos tipados).
- **Patrones principales**:
  - Arquitectura **hexagonal** (dominio en el centro).
  - **CQRS** (commands/queries) y **eventos de dominio**.
  - Uso progresivo de **event sourcing** para módulos clave.

## 3. Multiempresa y multi-Organization

El sistema debe soportar:

- Múltiples empresas dentro de la misma instalación.
- Múltiples Organizations que agrupan datos y configuración.
- Usuarios que pertenecen a uno o varios Organizations, con roles y permisos distintos en cada uno.

Reglas básicas:

- Cada entidad importante de negocio debe incluir `OrganizationId`.
- Donde aplique, también `companyId`.
- Nunca devolver datos de otro Organization en una misma respuesta.

## 4. Módulos principales del backend

Ver detalles en `02_MODULES_OVERVIEW.md`. En resumen:

- **Seguridad y acceso**:
  - Auth, Users, Roles, Permissions, Organizations, Devices.
- **Catálogos y productos**:
  - Products, Variants, UoM, Providers, Price Lists, Catalogs.
- **Inventario y bodega**:
  - Warehouses, Locations, Inventory, Inventory Counts.
- **Operaciones de negocio**:
  - Purchases (compras), POS (ventas), Customers, Credit.
- **Contabilidad y reportes**:
  - Accounting, Taxes, Reports, integración con xlsx-ops.

## 5. Convenciones globales

- Todas las APIs deben usar el formato de respuesta `ApiResponse<T>` (ver `15_API_STYLE_GUIDE.md`).
- Usar siempre DTOs con `class-validator`.
- Manejar errores con HttpException e interceptores globales.
- Registrar en logs las acciones relevantes para auditoría (ver `14_SECURITY_LOGS_AUDIT.md`).

## 6. Futuro del proyecto

- Separar módulos pesados en microservicios (por ejemplo, reportes o xlsx-ops).
- Integrar colas / mensajería (RabbitMQ, Kafka o similar) para eventos de dominio.
- Profundizar en event sourcing para usuarios, roles y contabilidad.
