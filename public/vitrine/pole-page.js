/* Pages de pôle : demande d'engagement transmise au secrétariat (/api/engager). */
(() => {
  "use strict";
  const init = () => {
    document.querySelectorAll("[data-dept]").forEach((lien) => {
      lien.addEventListener("click", () => {
        const select = document.getElementById("pole-dept");
        if (!select) return;
        [...select.options].forEach((o) => { if (o.textContent === lien.dataset.dept) select.value = o.value || o.textContent; });
      });
    });
    document.querySelectorAll("form[data-pole-engager]").forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const status = form.querySelector(".sde-form-feedback");
        const submit = form.querySelector('button[type="submit"]');
        if (!status || !submit) return;
        if (form.elements.piege?.value) return;
        status.dataset.state = "";
        const nom = String(form.elements.nom?.value || "").trim();
        const contact = String(form.elements.contact?.value || "").trim();
        const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact);
        const isPhone = contact.replace(/\D/g, "").length >= 7 && !contact.includes("@");
        if (!nom || !(isEmail || isPhone) || !form.elements.accord?.checked) {
          status.textContent = "Indiquez votre nom, un contact valide et acceptez les conditions.";
          status.dataset.state = "error";
          return;
        }
        const dept = String(form.elements.departement?.value || "").trim();
        const mot = String(form.elements.message?.value || "").trim();
        const message = [dept ? "Département souhaité : " + dept : "", mot ? "Message : " + mot : ""].filter(Boolean).join("\n");
        status.textContent = "Transmission en cours…";
        submit.disabled = true;
        try {
          const response = await fetch("/api/engager", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({
              nom, email: isEmail ? contact : "", tel: isPhone ? contact : "",
              objet: "Servir dans un pôle", pole: form.dataset.pole, message,
              source: "mouvement-sde.org/" + (form.dataset.slug || "pole")
            })
          });
          const result = await response.json().catch(() => null);
          if (!response.ok || !result?.ok) throw new Error(result?.message || "Envoi non confirmé");
          status.textContent = "Merci ! Votre demande est enregistrée par le secrétariat SDE, qui vous recontactera.";
          status.dataset.state = "ok";
          form.reset();
        } catch (err) {
          status.textContent = "Envoi indisponible. Réessayez ou écrivez à infosoldat@gmail.com.";
          status.dataset.state = "error";
        } finally {
          submit.disabled = false;
        }
      });
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
