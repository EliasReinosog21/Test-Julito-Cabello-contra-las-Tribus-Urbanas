(function(){
  'use strict';
  const CLAVE_CODIGO='julito_codigo_acceso_v4';
  function codigo(){try{return sessionStorage.getItem(CLAVE_CODIGO)||'';}catch(_){return '';}}
  function fijarCodigo(valor){try{sessionStorage.setItem(CLAVE_CODIGO,String(valor||''));}catch(_){}}

  async function solicitar(url,opciones={}){
    const headers={'Content-Type':'application/json',...(opciones.headers||{})};
    if(codigo()) headers['X-Test-Access-Code']=codigo();
    const respuesta=await fetch(url,{...opciones,headers});
    const datos=await respuesta.json().catch(()=>({}));
    if(!respuesta.ok || datos.ok===false) throw new Error(datos.error || `Error ${respuesta.status}`);
    return datos;
  }

  window.JulitoAPI={
    fijarCodigo,
    codigo,
    estadoIA:()=>solicitar('/api/ia/estado'),
    cargarPreguntas:(hasta,cantidad)=>solicitar(`/api/preguntas?hasta=${encodeURIComponent(hasta)}&cantidad=${encodeURIComponent(cantidad)}`),
    evaluarCerrada:(preguntaId,respuesta)=>solicitar('/api/evaluar-cerrada',{method:'POST',body:JSON.stringify({preguntaId,respuesta})}),
    evaluarAbierta:(preguntaId,respuesta)=>solicitar('/api/evaluar-abierta',{method:'POST',body:JSON.stringify({preguntaId,respuesta})})
  };
})();
