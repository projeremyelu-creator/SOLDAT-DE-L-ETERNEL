/* SDE MPA: interactions sur pages autonomes, sans changement des API privées. */
(() => {
  "use strict";
  const $=(s,r=document)=>r.querySelector(s);
  const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const page=document.body.dataset.sdePage;
  const start=()=>{
    // Sections publiques conservées : liens contextualisés entre pages.
    document.addEventListener("click",e=>{
      const link=e.target.closest("a[data-sujet]");
      if(link && link.origin===location.origin && link.pathname.startsWith("/vitrine/rejoindre")){
        e.preventDefault();
        const u=new URL(link.href);
        u.searchParams.set("objet",link.dataset.sujet);
        location.href=u.toString();
      }
    });
    if(page==="ressources")setupRessources();
    if(page==="programmes")setupProgrammes();
    if(page==="rejoindre")setupRejoindre();
    if(page==="mouvement")setupPoles();
  };
  function setupRessources(){
    const filters=$("#res-filtres");
    filters?.addEventListener("click",e=>{
      const button=e.target.closest("button[data-filtre]");
      if(!button)return;
      filters.querySelectorAll("button").forEach(b=>b.classList.toggle("actif",b===button));
      const q=$("#sde-search-ressources");
      if(q)q.dispatchEvent(new Event("input",{bubbles:true}));
      else $("#ressources-grille")?.querySelectorAll(".ressource-carte").forEach(card=>card.hidden=button.dataset.filtre!=="tous"&&card.dataset.type!==button.dataset.filtre);
    });
    const cards=[...document.querySelectorAll(".galerie .galerie-ouvrir")];
    if(!cards.length)return;
    const overlay=document.createElement("div");
    overlay.className="sde-modal";
    overlay.setAttribute("aria-hidden","true");
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-modal","true");
    overlay.setAttribute("aria-label","Photo agrandie");
    overlay.innerHTML='<button type="button" class="sde-modal-close" aria-label="Fermer la photo">×</button><button type="button" class="sde-modal-prev" aria-label="Photo précédente">‹</button><figure><img alt=""><figcaption></figcaption></figure><button type="button" class="sde-modal-next" aria-label="Photo suivante">›</button>';
    document.body.append(overlay);
    const img=$("img",overlay),cap=$("figcaption",overlay);
    let previous=null,selected=0;
    const display=()=>{
      const source=cards[selected];
      const original=source.querySelector("img");
      img.src=original?.dataset.grand || original?.src || "";
      img.alt=original?.alt || "Photo SDE";
      cap.textContent=source.querySelector(".galerie-legende")?.textContent||"";
    };
    const go=(delta)=>{selected=(selected+delta+cards.length)%cards.length;display();};
    const close=()=>{
      overlay.setAttribute("aria-hidden","true");
      img.removeAttribute("src");
      document.body.style.overflow="";
      previous?.focus();
    };
    $(".sde-modal-close",overlay).addEventListener("click",close);
    overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
    $(".sde-modal-prev",overlay).addEventListener("click",()=>go(-1));
    $(".sde-modal-next",overlay).addEventListener("click",()=>go(1));
    document.addEventListener("keydown",e=>{
      if(overlay.getAttribute("aria-hidden")!=="false")return;
      if(e.key==="Escape")close();
      if(e.key==="ArrowRight")go(1);
      if(e.key==="ArrowLeft")go(-1);
    });
    cards.forEach((button,index)=>button.addEventListener("click",()=>{
      previous=button;
      selected=index;
      display();
      overlay.setAttribute("aria-hidden","false");
      document.body.style.overflow="hidden";
      $(".sde-modal-close",overlay).focus();
    }));
  }
  function setupProgrammes(){
    const events=new Map();
    events.set("infire",{id:"infire-2026",titre:"IN FIRE 2026",date:"2026-10-31",heure:"08:30",fin:"18:00",lieu:"Église MADEG, Cocody Deux-Plateaux Agban, Abidjan",description:"Conférence internationale pour le réveil spirituel des nations."});
    const toDate=(d,h)=>(d||"").replace(/-/g,"")+"T"+(h||"08:00").replace(":","")+"00Z";
    document.addEventListener("click",e=>{
      const button=e.target.closest("[data-ics]");
      if(!button)return;
      const item=events.get(button.dataset.ics);
      if(!item)return;
      const esc=(v)=>String(v||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/[,;]/g,c=>"\\"+c);
      const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//MPA SDE//Agenda//FR","BEGIN:VEVENT",
        "UID:"+esc(item.id)+"@mouvement-sde.org","DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z",
        "DTSTART:"+toDate(item.date,item.heure),"DTEND:"+toDate(item.date,item.fin||"11:00"),
        "SUMMARY:"+esc(item.titre),"LOCATION:"+esc(item.lieu),"DESCRIPTION:"+esc(item.description),
        "BEGIN:VALARM","TRIGGER:-PT12H","ACTION:DISPLAY","DESCRIPTION:"+esc(item.titre),"END:VALARM","END:VEVENT","END:VCALENDAR"];
      const blob=new Blob([lines.join("\r\n")],{type:"text/calendar;charset=utf-8"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;a.download=(item.titre||"evenement").replace(/[^\w\u00c0-\u017f -]/g,"").replace(/\s+/g,"-")+".ics";
      document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),5000);
    });
    const list=$("#agenda-liste");
    const buttons=$("#agenda-filtres");
    const filter=()=>{
      const type=buttons?.querySelector(".actif")?.dataset.filtre||"tous";
      list?.querySelectorAll(".rdv").forEach(card=>card.hidden=type!=="tous"&&card.dataset.type!==type);
    };
    buttons?.addEventListener("click",e=>{
      const b=e.target.closest("button[data-filtre]");
      if(!b)return;
      buttons.querySelectorAll("button").forEach(x=>x.classList.toggle("actif",x===b));
      filter();
    });
    fetch("/api/public",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(data=>{
      const all=data?.evenements||[];
      const inf=all.find(e=>e.id==="infire-2026");
      if(inf){
        const lines=String(inf.description||"").split(/\n/),start=lines.findIndex(l=>/^\s*programme\b/i.test(l));
        const items=start<0?[]:lines.slice(start+1).map(x=>x.trim()).filter(Boolean);
        const target=$("#if-prog-l");
        if(target&&items.length){target.innerHTML=items.map(x=>"<li>"+escape(x.replace(/^[-•·]\s*/,""))+"</li>").join("");$("#if-prog").hidden=false;}
      }
      const upcoming=all.filter(e=>e.id!=="infire-2026").slice(0,8);
      if(!upcoming.length || !list)return;
      const frMonths=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
      list.innerHTML=upcoming.map(event=>{
        const d=new Date(event.date+"T12:00:00Z");
        if(Number.isNaN(d.getTime()))return "";
        events.set(String(event.id),event);
        return '<article class="programme rdv" data-type="'+escape(event.type||"")+'"><div class="quand"><span class="jour"><b>'+d.getUTCDate()+'</b><small>'+frMonths[d.getUTCMonth()]+'</small></span><span><span class="rythme">'+escape(event.type||"Rencontre")+'</span><br>'+escape(event.heure||"")+'</span></div><h3>'+escape(event.titre||"Rassemblement")+'</h3><p class="lieu">'+escape(event.lieu||"")+'</p><div class="rdv-actions"><a href="/vitrine/rejoindre#rejoindre">Je viens</a><button type="button" data-ics="'+escape(event.id)+'">Ajouter à mon agenda</button></div></article>';
      }).join("");
      filter();
    }).catch(()=>{});
    const form=$("#f-venue");
    form?.addEventListener("submit",async e=>{
      e.preventDefault();
      const nom=$("#v-nom")?.value.trim()||"",nb=$("#v-nb")?.value||"1",msg=$("#v-err"),button=form.querySelector("button[type=submit]");
      if(nom.length<2){msg.hidden=false;msg.textContent="Indiquez votre nom.";$("#v-nom").focus();return;}
      button.disabled=true;
      try{
        const r=await fetch("/api/engager",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({objet:"IN FIRE 2026 — Confirmation de venue",nom,message:"Nombre de personnes : "+nb,source:"mouvement-sde.org/vitrine/programmes"})});
        if(!r.ok)throw Error("échec");
        const json=await r.json();
        if(!json.ok)throw Error("échec");
        msg.textContent="✓ Votre confirmation a bien été reçue au secrétariat.";
        msg.style.color="#7ed8a8";msg.hidden=false;form.reset();
      }catch(_){
        msg.hidden=false;msg.textContent="Envoi indisponible. Vous pouvez contacter infosoldat@gmail.com.";
      }finally{button.disabled=false;}
    });
    const yango=$("#b-yango");
    yango?.addEventListener("click",()=>{
      const address="Église MADEG, Cocody Deux-Plateaux Agban, Abidjan";
      navigator.clipboard?.writeText(address).catch(()=>{});
      if($("#yango-aide"))$("#yango-aide").hidden=false;
    });
    const title=$("#decompte-titre"),days=$("#c-j"),hours=$("#c-h"),mins=$("#c-m"),seconds=$("#c-s");
    if(title&&days&&hours&&mins&&seconds){
      const deadline=new Date("2026-10-31T08:30:00Z").getTime();
      const tick=()=>{
        const delta=Math.max(0,deadline-Date.now());
        days.textContent=Math.floor(delta/864e5);
        hours.textContent=Math.floor(delta%864e5/36e5);
        mins.textContent=Math.floor(delta%36e5/6e4);
        seconds.textContent=Math.floor(delta%6e4/1000);
        if(delta===0){title.textContent="L'édition 2026 est passée.";clearInterval(timer);}
      };
      const timer=setInterval(tick,1000);tick();
    }
  }
  function setupRejoindre(){
    const form=$("#form-rejoindre");
    if(!form)return;
    const subject=new URLSearchParams(location.search).get("objet");
    const select=$("#f-objet");
    if(subject&&select){const found=[...select.options].find(x=>x.value===subject||x.textContent===subject);if(found)select.value=found.value;}
    const error=$("#f-erreur"),box=$("#envoi");
    form.addEventListener("submit",async e=>{
      e.preventDefault();
      const d=new FormData(form),g=k=>String(d.get(k)||"").trim();
      const missing=[];
      if(!g("nom"))missing.push("votre nom");
      if(g("tel").replace(/\D/g,"").length<8)missing.push("un numéro de téléphone valide");
      if(!g("ville"))missing.push("votre ville");
      if(!d.get("accord"))missing.push("votre accord");
      if(missing.length){error.hidden=false;error.textContent="Il manque "+missing.join(", ")+".";return;}
      error.hidden=true;
      const text="Shalom ! Demande depuis mouvement-sde.org\n\nObjet : "+g("objet")+"\nNom : "+g("nom")+"\nTéléphone : "+g("tel")+"\nVille : "+g("ville")+(g("msg")?"\nMessage : "+g("msg"):"");
      if($("#envoi-texte"))$("#envoi-texte").textContent=text;
      if($("#envoi-mail"))$("#envoi-mail").href="mailto:infosoldat@gmail.com?subject="+encodeURIComponent("Demande SDE — "+g("objet"))+"&body="+encodeURIComponent(text);
      const submit=form.querySelector('button[type="submit"]');submit.disabled=true;
      try{
        const r=await fetch("/api/engager",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({objet:g("objet"),nom:g("nom"),tel:g("tel"),email:g("mail"),ville:g("ville"),message:g("msg"),source:"mouvement-sde.org/vitrine/rejoindre"})});
        const data=await r.json();
        if(!r.ok||!data.ok)throw Error(data.message||"L'envoi a échoué");
        $("#envoi-titre").textContent="✓ Votre demande a été transmise au secrétariat.";
        $("#envoi-msg").textContent="Elle est enregistrée. Un responsable vous recontactera.";
      }catch(err){
        $("#envoi-titre").textContent="⚠ Envoi indisponible.";
        $("#envoi-msg").textContent="Vous pouvez adresser votre demande par e-mail au secrétariat.";
      }finally{submit.disabled=false;box.hidden=false;box.scrollIntoView?.({block:"nearest"});}
    });
    $("#envoi-copier")?.addEventListener("click",()=>{
      const text=$("#envoi-texte")?.textContent||"";
      navigator.clipboard?.writeText(text).catch(()=>{});
    });
    document.querySelectorAll("[data-copie]").forEach(b=>b.addEventListener("click",()=>navigator.clipboard?.writeText(document.getElementById(b.dataset.copie)?.textContent||"").catch(()=>{})));
  }
  function setupPoles(){
    document.querySelectorAll("button[data-pole]").forEach(button=>{
      button.addEventListener("click",()=>{
        const n=button.dataset.pole;
        location.href="/#poles";
        try{sessionStorage.setItem("sde-pole-ouvrir",n);}catch(_){}
      });
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();
