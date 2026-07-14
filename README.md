
## Activar OIDC en Vercel

La autenticación sin API key requiere habilitar **Secure Backend Access with OIDC Federation**:

1. Vercel → proyecto → **Settings** → **Security**.
2. En **Secure Backend Access with OIDC Federation**, habilita OIDC.
3. Usa el modo de emisor **Team** (recomendado).
4. Guarda y realiza un **Redeploy** sin reutilizar la caché.

En tiempo de ejecución, Vercel entrega el token en el encabezado `x-vercel-oidc-token`; esta versión lo lee desde cada solicitud.

Prueba luego:

- `/api/ia/estado` debe devolver `configurada: true` y `autenticacion: "oidc"`.
- `/api/ia/prueba` debe devolver `operativo: true`.

# Test Julito Cabello — Vercel AI Gateway 4.2

Aplicación de comprensión lectora para los 45 capítulos de *Julito Cabello contra las tribus urbanas*. El banco se mantiene en el servidor, las alternativas se mezclan y las respuestas abiertas reciben una evaluación provisional mediante **Vercel AI Gateway**.


## Estructura del repositorio

```text
/
├── api/
│   ├── ia/
│   │   ├── estado.js
│   │   └── prueba.js
│   ├── evaluar-abierta.js
│   ├── evaluar-cerrada.js
│   └── preguntas.js
├── data/
│   ├── capitulos.js
│   └── preguntas.json
├── lib/
│   ├── ai-gateway.js
│   ├── auth.js
│   ├── http.js
│   └── preguntas.js
├── public/
│   ├── index.html
│   ├── respuestas.html
│   └── ...
├── scripts/
│   ├── build.js
│   └── validar-preguntas.js
├── package.json
└── vercel.json
```

## Despliegue en GitHub y Vercel

1. Sube **el contenido interno de esta carpeta** a la raíz del repositorio de GitHub.
2. En Vercel importa ese repositorio.
3. Usa estas opciones:

```text
Framework Preset: Other
Root Directory: ./
Build Command: npm run build
Output Directory: dist
```

4. Realiza el despliegue.

No agregues `OPENAI_API_KEY`. En producción, Vercel entrega automáticamente el token OIDC al código server-side.

## Activar y comprobar AI Gateway

En el panel de Vercel, entra a **AI Gateway** dentro del mismo equipo donde está el proyecto. El crédito gratuito comienza con la primera solicitud válida.

Después del despliegue abre:

```text
https://TU-DOMINIO.vercel.app/api/ia/estado
```

Debe mostrar algo equivalente a:

```json
{
  "ok": true,
  "configurada": true,
  "proveedor": "Vercel AI Gateway",
  "autenticacion": "oidc",
  "modelo": "google/gemini-3.1-flash-lite"
}
```

Para ejecutar una solicitud real de diagnóstico, abre esta dirección cuando no hayas configurado `TEST_ACCESS_CODE`:

```text
https://TU-DOMINIO.vercel.app/api/ia/prueba
```

Si utilizas `TEST_ACCESS_CODE`, prueba la IA contestando una pregunta abierta desde el propio test, que ya envía el código mediante un encabezado seguro. La prueba consume una cantidad mínima del crédito. Una respuesta correcta se parece a:

```json
{
  "ok": true,
  "configurada": true,
  "operativo": true,
  "proveedor": "Vercel AI Gateway",
  "modelo": "google/gemini-3.1-flash-lite",
  "autenticacion": "oidc"
}
```

## Variables de entorno

### Producción en Vercel

No se requiere ninguna variable para la IA. El código usa:

```text
VERCEL_OIDC_TOKEN
```

Vercel la genera automáticamente en tiempo de ejecución.

Opcionalmente puedes establecer:

```text
AI_GATEWAY_MODEL=google/gemini-3.1-flash-lite
TEST_ACCESS_CODE=un_codigo_para_el_curso
```

### Desarrollo local

Para probar fuera de Vercel, crea una clave en el panel de AI Gateway y usa:

```text
AI_GATEWAY_API_KEY=tu_clave
AI_GATEWAY_MODEL=google/gemini-3.1-flash-lite
```

Luego ejecuta:

```bash
npm install -g vercel
vercel link
vercel env pull .env.local
vercel dev
```

El token OIDC descargado para desarrollo local vence periódicamente; vuelve a ejecutar `vercel env pull` cuando sea necesario.

## Modificar el banco

Edita solamente:

```text
data/preguntas.json
```

Valida antes de publicar:

```bash
npm run validate
```

Cada `push` vuelve a ejecutar la validación y genera `dist/` durante el build.

## Corrección de respuestas abiertas

La evaluación recibe únicamente:

- enunciado;
- respuesta escrita;
- respuesta modelo;
- criterios de corrección;
- puntaje máximo.

El nombre del estudiante no se envía al modelo. La IA entrega una nota provisional, retroalimentación, confianza y una indicación de revisión docente. El docente conserva la decisión final.

## Errores frecuentes

### `/api/ia/estado` muestra `configurada: false`

El proyecto todavía está ejecutando una versión antigua o no se desplegó en Vercel. Comprueba que `lib/ai-gateway.js` esté en GitHub y vuelve a desplegar sin caché.

### `/api/ia/prueba` responde 401

El token no fue aceptado. Haz un nuevo despliegue y comprueba que el proyecto pertenezca al mismo equipo de Vercel que usa AI Gateway.

### Responde 403 o 404

El modelo puede no estar habilitado para ese equipo o para el nivel gratuito. Revisa la lista de modelos de AI Gateway y cambia `AI_GATEWAY_MODEL` por otro modelo elegible.

### Responde 429

Se alcanzó un límite temporal o la cuota gratuita. La aplicación dejará las respuestas abiertas pendientes de revisión docente. Espera y vuelve a intentar.

### El sitio carga, pero las respuestas no quedan centralizadas

Los intentos todavía se guardan en `localStorage`, por lo que quedan en el dispositivo donde se realizó el test. Centralizarlos requiere una base de datos.
