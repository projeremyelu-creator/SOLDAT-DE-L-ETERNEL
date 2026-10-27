/* Formulaires publics : prise de contact, jamais de publication automatique. */
(() => {
  "use strict";
  const labels = {
    "prieres": "Demande de contact — prières et intercession",
    "temoignages": "Proposition de témoignage — prise de contact",
    "soldiers-voice": "Soldiers Voice — renseignements",
    "missions-humanitaires": "Missions humanitaires — participation"
  };
  const init = () => {
    document.querySelectorAll("[data-sde-year]").forEach((el) => el.textContent = String(new Date().getFullYear()));
    document.querySelectorAll("form[data-sde-contact]").forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const type = form.dataset.sdeContact;
        const status = form.querySelector(".sde-form-feedback");
        const submit = form.querySelector('button[type="submit"]');
        if (!labels[type] || !status || !submit) return;
        status.dataset.state = "";
        if (form.elements.website?.value) return;
        const nom = String(form.elements.nom?.value || "").trim();
        const contact = String(form.elements.contact?.value || "").trim();
        const motif = String(form.elements.categorie?.value || "").trim();
        const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact);
        const isPhone = contact.replace(/\D/g, "").length >= 7 && !contact.includes("@");
        if (!nom || !(isEmail || isPhone) || !form.elements.accord?.checked) {
          status.textContent = "Indiquez votre nom, un contact valide et acceptez les conditions.";
          status.dataset.state = "error";
          return;
        }
        const data = {
          nom, email: isEmail ? contact : "", tel: isPhone ? contact : "",
          objet: labels[type], message: "Motif général : " + motif,
          source: "mouvement-sde.org/vitrine/" + type
        };
        status.textContent = "Transmission en cours…";
        submit.disabled = true;
        try {
          const response = await fetch("/api/engager", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify(data)
          });
          const result = await response.json().catch(() => null);
          if (!response.ok || !result?.ok) throw new Error("Envoi non confirmé");
          status.textContent = "Demande enregistrée par le secrétariat SDE. L'équipe pourra vous recontacter.";
          status.dataset.state = "ok";
          form.reset();
        } catch {
          status.textContent = "Envoi indisponible. Réessayez ou écrivez à infosoldat@gmail.com.";
          status.dataset.state = "error";
        } finally {
          submit.disabled = false;
        }
      });
    });
    document.querySelectorAll("form[data-sde-anonymous-prayer]").forEach((form) => {
      form.addEventListener("submit",async(event)=>{
        event.preventDefault();
        const status=form.querySelector(".sde-form-feedback"),submit=form.querySelector('button[type="submit"]');
        if(!status||!submit||!form.reportValidity())return;
        if(form.elements.website?.value)return;
        const sujet=String(form.elements.sujet?.value||"").trim();
        if(!sujet){status.textContent="Écrivez votre sujet de prière.";status.dataset.state="error";return}
        status.textContent="Transmission anonyme en cours…";status.dataset.state="";submit.disabled=true;
        try{
          const response=await fetch("/api/priere-anonyme",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sujet,categorie:String(form.elements.categorie?.value||"Prière générale"),accord:form.elements.accord?.checked===true,website:""})});
          const result=await response.json().catch(()=>null);if(!response.ok||!result?.ok)throw new Error(result?.message||"Envoi non confirmé");
          status.textContent=result.message||"Votre sujet anonyme a été transmis aux intercesseurs SDE.";status.dataset.state="ok";form.reset();
        }catch(error){status.textContent=error.message||"Envoi indisponible. Réessayez plus tard.";status.dataset.state="error"}
        finally{submit.disabled=false}
      });
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
