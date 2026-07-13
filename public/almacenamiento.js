(function(){
  'use strict';
  const CLAVE='julito_respuestas_v4';
  const ANTERIORES=['julito_respuestas_v3','julito_respuestas_v2'];

  function leer(){
    try{
      let bruto=localStorage.getItem(CLAVE);
      if(!bruto){
        for(const anterior of ANTERIORES){
          const valor=localStorage.getItem(anterior);
          if(valor){bruto=valor;localStorage.setItem(CLAVE,valor);break;}
        }
      }
      const datos=bruto?JSON.parse(bruto):[];
      return Array.isArray(datos)?datos:[];
    }catch(error){console.warn('No fue posible leer las respuestas:',error);return [];}
  }

  function escribir(intentos){
    try{localStorage.setItem(CLAVE,JSON.stringify(intentos));return true;}
    catch(error){console.warn('No fue posible guardar las respuestas:',error);return false;}
  }

  function guardar(intento){
    const intentos=leer();
    const registro={
      ...intento,
      id:intento.id||`intento-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      fecha:intento.fecha||new Date().toISOString(),
      revisionManual:intento.revisionManual||{}
    };
    intentos.unshift(registro);
    const persistido=escribir(intentos);
    return {...registro,persistido};
  }

  function actualizar(id,cambios){
    const intentos=leer();
    const indice=intentos.findIndex(x=>x.id===id);
    if(indice<0) throw new Error('No se encontró el intento solicitado.');
    intentos[indice]={...intentos[indice],...cambios};
    if(!escribir(intentos)) throw new Error('El navegador bloqueó el almacenamiento local.');
    return intentos[indice];
  }

  function eliminar(id){return escribir(leer().filter(x=>x.id!==id));}
  function limpiar(){try{localStorage.removeItem(CLAVE);return true;}catch(_){return false;}}
  function descargar(nombre,contenido,tipo){
    const blob=new Blob([contenido],{type:tipo||'application/octet-stream'});
    const url=URL.createObjectURL(blob);
    const enlace=document.createElement('a');
    enlace.href=url;enlace.download=nombre;document.body.appendChild(enlace);enlace.click();enlace.remove();URL.revokeObjectURL(url);
  }
  window.StorageRespuestas={clave:CLAVE,listar:leer,guardar,actualizar,eliminar,limpiar,descargar};
})();
