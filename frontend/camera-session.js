/* Une activation de caméra annulée ne peut pas se réactiver après une promesse tardive. */
const release=stream=>stream?.getTracks?.().forEach(track=>track.stop());
export class CameraSession{
 constructor(){this.generation=0;this.stream=null;this.controls=null}
 stop(){this.generation++;this.controls?.stop();this.controls=null;release(this.stream);this.stream=null}
 async start(prepare,getStream,onResult){
  this.stop();const session=this.generation;
  try{
   const decode=await prepare();if(session!==this.generation)return false;
   const stream=await getStream();if(session!==this.generation){release(stream);return false}this.stream=stream;
   const controls=await decode(stream,result=>{if(session!==this.generation)return;this.stop();onResult(result)});
   if(session!==this.generation){controls?.stop();return false}this.controls=controls;return true;
  }catch(error){if(session!==this.generation)return false;this.stop();throw error}
 }
}
