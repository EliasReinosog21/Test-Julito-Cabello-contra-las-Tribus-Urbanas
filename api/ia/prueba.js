'use strict';
const {soloMetodo,json}=require('../../lib/http');
const {verificarAcceso}=require('../../lib/auth');
const {probarConexion}=require('../../lib/ai-gateway');

module.exports=async function handler(req,res){
  if(!soloMetodo(req,res,'GET')) return;
  if(!verificarAcceso(req,res)) return;

  try{
    const resultado=await probarConexion(req);
    if(!resultado.configurada){
      return json(res,503,{
        ok:false,
        configurada:false,
        error:'No se encontró AI_GATEWAY_API_KEY ni un token OIDC en la solicitud. Verifica que OIDC Federation esté habilitado en Vercel.'
      });
    }

    return json(res,200,{
      ok:true,
      configurada:true,
      operativo:resultado.operativo,
      proveedor:'Vercel AI Gateway',
      modelo:resultado.modelo,
      autenticacion:resultado.autenticacion
    });
  }catch(error){
    console.error('Error en prueba de AI Gateway:',error);
    return json(res,error.status && error.status>=400 && error.status<600 ? error.status : 502,{
      ok:false,
      configurada:true,
      proveedor:'Vercel AI Gateway',
      error:error.message || 'No fue posible contactar AI Gateway.',
      tipo:error.tipo || null
    });
  }
};
