'use strict';

const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');

const raiz = path.resolve(__dirname, '..');
const origen = path.join(raiz, 'public');
const destino = path.join(raiz, 'dist');

// 1. Detiene el despliegue si el banco de preguntas es inválido.
execFileSync(process.execPath, [path.join(__dirname, 'validar-preguntas.js')], {
  cwd: raiz,
  stdio: 'inherit'
});

// 2. Genera explícitamente el directorio que Vercel publicará.
if (!fs.existsSync(origen)) {
  throw new Error(`No existe el directorio de origen: ${origen}`);
}

fs.rmSync(destino, {recursive: true, force: true});
fs.cpSync(origen, destino, {recursive: true});

const archivos = fs.readdirSync(destino);
if (!archivos.includes('index.html')) {
  throw new Error('La compilación terminó sin dist/index.html');
}

console.log(`Sitio generado correctamente en dist/ (${archivos.length} archivos).`);
