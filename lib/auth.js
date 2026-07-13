'use strict';
const crypto=require('node:crypto');
const {json}=require('./http');

function requiereCodigo(){return Boolean(process.env.TEST_ACCESS_CODE);}
function compararSeguro(a,b){
  const aa=Buffer.from(String(a||''));
  const bb=Buffer.from(String(b||''));
  return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);
}
function verificarAcceso(req,res){
  const esperado=process.env.TEST_ACCESS_CODE;
  if(!esperado) return true;
  const recibido=req.headers?.['x-test-access-code'];
  if(compararSeguro(recibido,esperado)) return true;
  json(res,401,{ok:false,error:'Código de acceso incorrecto o ausente.'});
  return false;
}
module.exports={requiereCodigo,verificarAcceso};
