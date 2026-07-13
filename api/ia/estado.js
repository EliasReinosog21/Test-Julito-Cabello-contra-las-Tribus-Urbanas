'use strict';
const {soloMetodo,json}=require('../../lib/http');
const {requiereCodigo}=require('../../lib/auth');
const {
  obtenerCredencial,
  modoAutenticacion,
  modeloConfigurado
}=require('../../lib/ai-gateway');

module.exports=function handler(req,res){
  if(!soloMetodo(req,res,'GET')) return;

  const configurada=Boolean(obtenerCredencial(req));
  const autenticacion=modoAutenticacion(req);

  return json(res,200,{
    ok:true,
    configurada,
    proveedor:'Vercel AI Gateway',
    autenticacion,
    requiereCodigo:requiereCodigo(),
    modelo:configurada?modeloConfigurado():null,
    mensaje:configurada
      ? `Corrección automática disponible mediante ${autenticacion==='oidc'?'OIDC de Vercel':'una clave de AI Gateway'}.`
      : 'No se encontró autenticación para AI Gateway; las respuestas abiertas quedarán para revisión docente.'
  });
};
