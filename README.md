# Agenda de Visitas - Aplicadores CML

Aplicación web para consultar y publicar la programación CML de forma centralizada.

## Arquitectura actual
- React + Vite + TypeScript.
- Excel `.xlsx/.xls` procesado en el navegador con SheetJS.
- Supabase para autenticación y base de datos.
- Roles: `admin` y `worker`.
- Un administrador publica la programación.
- Cada aplicador autenticado solo puede consultar sus propios registros gracias a Row Level Security (RLS).
- La programación anterior se reemplaza al publicar una nueva.
- Los datos completos del Excel se conservan en `jsonb`, además de campos indexados para búsquedas rápidas.

## Configuración de Supabase
1. Crear un proyecto de Supabase.
2. En **SQL Editor**, ejecutar todo el archivo `supabase/schema.sql`.
3. Crear los usuarios desde **Authentication > Users**.
4. Para cada usuario, crear su fila en `public.profiles` con el mismo UUID de Authentication y su nombre exacto tal como aparece en el Excel.
5. Al administrador asignarle `role = 'admin'`.
6. Configurar en el entorno de Vite `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.

También se acepta `VITE_SUPABASE_ANON_KEY` por compatibilidad con configuraciones anteriores.

Hay una plantilla en `.env.example`.

## Publicación
El proyecto puede publicarse en GitHub Pages, Vercel, Netlify u otro hosting para Vite. Las variables de Supabase deben configurarse como variables de entorno del servicio de publicación.

En GitHub Pages, el workflow de despliegue usa el secreto `VITE_SUPABASE_PUBLISHABLE_KEY` y acepta como respaldo `VITE_SUPABASE_ANON_KEY`.

## Importación
El administrador selecciona el Excel y la aplicación:
1. Lee **Programación nacional** y, si existe, combina **Hoja 1** por código.
2. Identifica el aplicador asignado.
3. Verifica que cada aplicador exista como usuario.
4. Si falta algún usuario, detiene la publicación y muestra los nombres que no pudo relacionar.
5. Publica todos los registros en la base central.
6. Los compañeros ven automáticamente la nueva programación al volver a cargar su agenda.

## Desarrollo
    npm install
    npm run dev
    npm run build
