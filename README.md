# Agenda de Visitas - Aplicadores CML

Aplicación web para organizar y dar seguimiento a las visitas de aplicadores.

## Stack inicial

- React + TypeScript
- Vite
- Lucide React para iconos

## Estructura

```
src/
├── data/              # Datos iniciales / mocks
│   └── mockVisits.ts
├── App.tsx            # Dashboard inicial
├── main.tsx           # Punto de entrada
├── styles.css         # Estilos globales
└── types.ts           # Tipos del dominio
```

## Próximas etapas

1. Formulario para crear y editar visitas.
2. Calendario y filtros por fecha, aplicador y estado.
3. Gestión de aplicadores y clientes.
4. Persistencia de datos (base de datos/API).
5. Mapa y ubicación de visitas.
6. Autenticación y permisos por usuario.
7. Reportes y exportación.

## Desarrollo

```bash
npm install
npm run dev
```
