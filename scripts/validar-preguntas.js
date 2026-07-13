'use strict';
const {validarBanco}=require('../lib/preguntas');
const validacion=validarBanco();
const tipos={alternativa:0,verdadero_falso:0,abierta:0};
const banco=require('../data/preguntas');
banco.forEach(p=>tipos[p.tipo]++);
console.log(`Banco: ${validacion.total} preguntas`);
console.log(`Alternativas: ${tipos.alternativa} · Verdadero/Falso: ${tipos.verdadero_falso} · Abiertas: ${tipos.abierta}`);
if(!validacion.ok){
  console.error('\nErrores de validación:');
  validacion.errores.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}
console.log('Validación correcta: capítulos 1 al 45 cubiertos por los tres tipos de pregunta.');
