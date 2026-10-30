/* SDE MPA: interactions sur pages autonomes, sans changement des API privées. */
(() => {
  "use strict";
  const $=(s,r=document)=>r.querySelector(s);
  const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const page=document.body.dataset.sdePage;
  const start=()=>{
    /* ═══ Scroll reveal .revele → .vu ═══ */
    const reduit=document.documentElement.dataset.motion==="reduced"||window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if(!reduit) document.documentElement.classList.add("anim");
    if("IntersectionObserver" in window && !reduit){
      const obs=new IntersectionObserver((es)=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("vu");obs.unobserve(e.target);}}),{threshold:.15,rootMargin:"0px 0px -40px 0px"});
      document.querySelectorAll(".revele").forEach(el=>obs.observe(el));
    } else { document.querySelectorAll(".revele").forEach(el=>el.classList.add("vu")); }
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
    hydraterSite();
    if(page==="ressources")setupRessources();
    if(page==="programmes")setupProgrammes();
    if(page==="rejoindre")setupRejoindre();
    if(page==="mouvement")setupPoles();
  };
  /* Contenu public piloté depuis l'administration (/api/site) : le HTML écrit en dur reste le repli. */
  let contactMail="infosoldat@gmail.com";
  function hydraterSite(){
    if(!["programmes","rejoindre"].includes(page))return;
    fetch("/api/site").then(r=>r.ok?r.json():null).then(site=>{
      if(!site||typeof site!=="object")return;
      const c=site.contact||{};
      if(c.email){
        contactMail=c.email;
        if($("#c-mail"))$("#c-mail").textContent=c.email;
        document.querySelectorAll("[data-contact-mail]").forEach(a=>{a.textContent=c.email;if(a.tagName==="A")a.href="mailto:"+c.email;});
      }
      if(c.telephone&&$("#c-tel"))$("#c-tel").textContent=c.telephone;
      const liste=Array.isArray(site.programmes)?site.programmes:[];
      const grille=$(".programmes");
      if(liste.length&&grille&&page==="programmes"){
        grille.innerHTML=liste.map((p,i)=>{
          const lien=p.lien||"/contact#rejoindre";
          const sujet=p.lien?"":' data-sujet="'+escape(p.titre)+'"';
          return '<article class="programme revele vu'+(p.feu?" feu":"")+'">'+(p.image?'<img class="prog-img" src="'+escape(p.image)+'" alt="" width="600" height="260" loading="lazy">':"")+
            (p.rythme?'<span class="rythme">'+escape(p.rythme)+'</span>':"")+'<h3>'+escape(p.titre)+'</h3>'+(p.texte?'<p>'+escape(p.texte)+'</p>':"")+
            '<a href="'+escape(lien)+'"'+sujet+'>'+escape(p.libelle||"Participer")+' <svg aria-hidden="true"><use href="#i-fleche"/></svg></a></article>';
        }).join("");
      }
      const select=$("#f-objet");
      if(liste.length&&select){
        const connus=new Set([...select.options].map(o=>o.value||o.textContent));
        liste.forEach(p=>{if(!connus.has(p.titre)){const o=document.createElement("option");o.textContent=p.titre;select.append(o);}});
        const sujet=new URLSearchParams(location.search).get("objet");
        const found=sujet&&[...select.options].find(x=>x.value===sujet||x.textContent===sujet);
        if(found)select.value=found.value;
      }
      const b=site.banniere||{};
      if(b.texte&&!$(".site-banniere")){
        const el=document.createElement(b.lien?"a":"p");
        el.className="site-banniere";el.textContent=b.texte;if(b.lien)el.href=b.lien;
        el.style.cssText="display:block;text-align:center;padding:.6rem 1rem;background:#D4AF37;color:#0b1530;font-weight:600;text-decoration:none";
        document.body.prepend(el);
      }
    }).catch(()=>{});
  }
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
    // Les types réels de l'agenda (Culte, Conférence, Évangélisation, « Prière et intercession »…)
    // sont regroupés sous les trois filtres affichés.
    const groupe=t=>/^pri[èe]re/i.test(t||"")?"Prière":/^formation/i.test(t||"")?"Formation":"Rencontre";
    const filter=()=>{
      const type=buttons?.querySelector(".actif")?.dataset.filtre||"tous";
      list?.querySelectorAll(".rdv").forEach(card=>card.hidden=type!=="tous"&&groupe(card.dataset.type)!==type);
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
      const nom=$("#v-nom")?.value.trim()||"",tel=$("#v-tel")?.value.trim()||"",nb=$("#v-nb")?.value||"1",msg=$("#v-err"),button=form.querySelector("button[type=submit]");
      if(nom.length<2){msg.hidden=false;msg.textContent="Indiquez votre nom.";$("#v-nom").focus();return;}
      if(tel.replace(/\D/g,"").length<7){msg.hidden=false;msg.textContent="Indiquez un numéro de téléphone valide.";$("#v-tel").focus();return;}
      if(!$("#v-accord")?.checked){msg.hidden=false;msg.textContent="Confirmez votre accord pour l’enregistrement de ces informations.";$("#v-accord").focus();return;}
      button.disabled=true;
      try{
        const r=await fetch("/api/engager",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({objet:"IN FIRE 2026 — Confirmation de venue",nom,tel,message:"Nombre de personnes : "+nb,source:"mouvement-sde.org/vitrine/programmes"})});
        if(!r.ok)throw Error("échec");
        const json=await r.json();
        if(!json.ok)throw Error("échec");
        msg.textContent="✓ Votre venue a été enregistrée. Le secrétariat peut vous recontacter au numéro indiqué.";
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
      // Abidjan = UTC+0 : début 8 h 30, fin 18 h le samedi 31 octobre 2026.
      const deadline=new Date("2026-10-31T08:30:00Z").getTime();
      const end=new Date("2026-10-31T18:00:00Z").getTime();
      const counter=$(".decompte");
      let timer=null;
      const calm=()=>document.documentElement.dataset.motion==="reduced"||document.body.dataset.motion==="paused"||!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      // Braises : décor discret derrière les chiffres ; leur nombre augmente à l'approche de l'événement.
      let embers=[];
      if(counter&&!calm()){
        const layer=document.createElement("span");layer.className="decompte-braises";layer.setAttribute("aria-hidden","true");
        for(let i=0;i<14;i++){const e=document.createElement("i");e.style.setProperty("--x",(4+i*6.9+(i%3)*2)+"%");e.style.setProperty("--w",(i*0.37%4.2).toFixed(2)+"s");e.style.setProperty("--d",(3.4+(i%4)*0.55).toFixed(2)+"s");e.style.setProperty("--dx",((i%2?1:-1)*(6+i%5*3))+"px");e.style.setProperty("--a",(0.55+(i%3)*0.15).toFixed(2));layer.append(e);embers.push(e);}
        counter.append(layer);
      }
      const show=(el,value,frac)=>{
        const text=String(value);
        const cell=el.closest(".decompte-cel");
        if(cell)cell.style.setProperty("--p",Math.round(Math.max(0,Math.min(1,frac))*100));
        if(el.textContent===text)return;
        el.textContent=text;
        if(!calm()&&el.animate)el.animate([{transform:"translateY(-28%)",opacity:.15},{transform:"none",opacity:1}],{duration:380,easing:"cubic-bezier(.25,1,.5,1)"});
      };
      const hide=(el)=>{if(el)el.hidden=true;};
      const tick=()=>{
        const now=Date.now();
        if(now>=end){
          title.textContent="IN FIRE 2026 s'est tenue le samedi 31 octobre. Merci à tous ! Rendez-vous à la prochaine édition.";
          hide(counter);
          // L'édition est terminée : on retire les actions d'inscription et de trajet.
          hide($('[data-ics="infire"]'));hide($("#b-yango"));hide($("#yango-aide"));
          document.querySelectorAll(".if-orateurs,.if-lieu").forEach(hide);
          const venue=$("#f-venue");
          if(venue){hide(venue);const h=venue.previousElementSibling;if(h&&h.tagName==="H3")hide(h);}
          if(timer)clearInterval(timer);
          return;
        }
        if(now>=deadline){
          title.textContent="IN FIRE 2026 a commencé : rejoignez-nous à l'Église MADEG jusqu'à 18 h !";
          hide(counter);
          return;
        }
        const delta=deadline-now;
        const d=Math.floor(delta/864e5),h=Math.floor(delta%864e5/36e5),m=Math.floor(delta%36e5/6e4),sec=Math.floor(delta%6e4/1000);
        const two=n=>String(n).padStart(2,"0");
        show(days,d,Math.min(1,delta/(30*864e5)));show(hours,two(h),h/24);show(mins,two(m),m/60);show(seconds,two(sec),sec/60);
        if(counter)counter.classList.toggle("decompte--proche",delta<864e5);
        // 0 à 14 braises : 3 au-delà d'une semaine, toutes le dernier jour.
        const visibles=Math.round(3+11*Math.max(0,Math.min(1,1-delta/(7*864e5))));
        embers.forEach((e,i)=>{e.hidden=i>=visibles;});
      };
      timer=setInterval(tick,1000);tick();
    }
  }
  function setupRejoindre(){
    const form=$("#form-rejoindre");
    if(!form)return;
    const subject=new URLSearchParams(location.search).get("objet");
    const select=$("#f-objet");
    if(subject&&select){const found=[...select.options].find(x=>x.value===subject||x.textContent===subject);if(found)select.value=found.value;}
    const adhesion=$("#f-adhesion"),mail=$("#f-mail");
    const syncAdhesion=()=>{const active=select?.value==="Devenir membre";if(adhesion)adhesion.hidden=!active;if(mail){mail.required=active;mail.closest(".champ")?.querySelector(".facult")?.replaceChildren(active?"obligatoire":"facultatif");}for(const id of ["f-pole","f-programme","f-motivation"]){const input=$("#"+id);if(input)input.required=active;}};
    select?.addEventListener("change",syncAdhesion);syncAdhesion();
    const error=$("#f-erreur"),box=$("#envoi");
    form.addEventListener("submit",async e=>{
      e.preventDefault();
      const d=new FormData(form),g=k=>String(d.get(k)||"").trim();
      const missing=[];
      if(!g("nom"))missing.push("votre nom");
      if(g("tel").replace(/\D/g,"").length<8)missing.push("un numéro de téléphone valide");
      if(!g("ville"))missing.push("votre ville");
      if(g("objet")==="Devenir membre"){
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g("mail")))missing.push("une adresse e-mail valide");
        if(!g("pole"))missing.push("un pôle d’intérêt");
        if(!g("programme"))missing.push("un programme");
        if(!g("motivation"))missing.push("votre motivation");
      }
      if(!d.get("accord"))missing.push("votre accord");
      if(missing.length){error.hidden=false;error.textContent="Il manque "+missing.join(", ")+".";return;}
      error.hidden=true;
      const text="Shalom ! Demande depuis mouvement-sde.org\n\nObjet : "+g("objet")+"\nNom : "+g("nom")+"\nTéléphone : "+g("tel")+"\nVille : "+g("ville")+(g("pole")?"\nPôle : "+g("pole"):"")+(g("programme")?"\nProgramme : "+g("programme"):"")+(g("motivation")?"\nMotivation : "+g("motivation"):"")+(g("msg")?"\nMessage : "+g("msg"):"");
      if($("#envoi-texte"))$("#envoi-texte").textContent=text;
      if($("#envoi-mail"))$("#envoi-mail").href="mailto:"+contactMail+"?subject="+encodeURIComponent("Demande SDE — "+g("objet"))+"&body="+encodeURIComponent(text);
      const submit=form.querySelector('button[type="submit"]');submit.disabled=true;
      try{
        const r=await fetch("/api/engager",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({objet:g("objet"),nom:g("nom"),tel:g("tel"),email:g("mail"),ville:g("ville"),pole:g("pole"),programme:g("programme"),motivation:g("motivation"),message:g("msg"),piege:g("site_web"),source:"mouvement-sde.org/vitrine/rejoindre"})});
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
