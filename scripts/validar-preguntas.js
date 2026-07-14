'use strict';
const {validarBanco}=require('../lib/preguntas');
const validacion=validarBanco();
const tipos={alternativa:0,verdadero_falso:0,abierta:0,pareados:0};
const banco=require('../data/preguntas');

banco.forEach(p=>{
  if(Object.prototype.hasOwnProperty.call(tipos,p.tipo)) tipos[p.tipo]++;
});

const porcentajePareados=validacion.total
  ? (tipos.pareados/validacion.total*100).toFixed(2)
  : '0.00';

console.log(`Banco: ${validacion.total} preguntas`);
console.log(
  `Alternativas: ${tipos.alternativa} · Verdadero/Falso: ${tipos.verdadero_falso} · `+
  `Abiertas: ${tipos.abierta} · Pareados: ${tipos.pareados} (${porcentajePareados} %)`
);

if(tipos.pareados/validacion.total>0.05){
  validacion.errores.push('El banco supera el 5 % de actividades de términos pareados.');
  validacion.ok=false;
}

if(!validacion.ok){
  console.error('\nErrores de validación:');
  validacion.errores.forEach(error=>console.error(`- ${error}`));
  process.exit(1);
}

console.log('Validación correcta: capítulos 1 al 45 cubiertos por alternativas, verdadero/falso y abiertas.');
console.log('Los pareados relacionan varios capítulos y usan como cap el capítulo máximo requerido.');
