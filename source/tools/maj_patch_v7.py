p = '/home/claude/sde/patch_v5.py'
s = open(p).read()
if "m5_eliezer" in s:
    raise SystemExit("déjà appliqué")
s = s.replace('"m3_cotis.js", "m4_projets.js"])', '"m3_cotis.js", "m4_projets.js", "m5_affiches.js", "m5_eliezer.js"])')
s = s.replace('''(d / "m4_actions.js").read_text() + \'\'\'''', '''(d / "m4_actions.js").read_text() + (d / "m5_actions.js").read_text() + \'\'\'''')
s = s.replace('+ "\\n" + (d / "style_v6.css").read_text()', '+ "\\n" + (d / "style_v6.css").read_text() + "\\n" + (d / "style_v7.css").read_text()')
bloc = r'''# 19. Éliézer et affiches
rep('    { id: "garnisons", ico: "i-fort"', '    { id: "assistant", ico: "i-spark", court: "Éliézer", long: "Éliézer · assistant IA", desc: "Questions, analyses et rédaction" },\n    { id: "garnisons", ico: "i-fort"')
rep('"chambre", "projets"].includes(o.id)', '"chambre", "projets", "assistant"].includes(o.id)')
rep('projets: [], projetsFin: [], projetOnglet: "apercu",', 'projets: [], projetsFin: [], projetOnglet: "apercu", affiches: [], sample: null,')
rep('projets: false, projetsFin: false },', 'projets: false, projetsFin: false, affiches: false },')
rep("""    if (accesRegistre()) suivre("projets", "projets", null); else S.pret.projets = true;""", """    if (accesRegistre()) suivre("projets", "projets", null); else S.pret.projets = true;
    if (accesRegistre()) suivre("affiches", "affiches", null); else S.pret.affiches = true;""")
rep("""    const cartes = [];
    if (accesFinances()) cartes.push(carteCaisse());""", """    const cartes = [];
    if (accesRegistre() && S.sample) cartes.push(carteEliezer());
    if (accesFinances()) cartes.push(carteCaisse());""")
rep("""    out += sousOnglets("portevoix", [["annonces", "Annonces", actives.length], ["messages", "Messages ciblés", S.diffusions.length]]);""", """    out += sousOnglets("portevoix", [["annonces", "Annonces", actives.length], ["messages", "Messages ciblés", S.diffusions.length], ["affiches", "Affiches", S.pret.affiches ? S.affiches.length : null]]);
    if (S.sous.portevoix === "affiches") return out + vueAffiches();""")
rep("""actions: ecr ? btn("ajout-annonce", "Nouvelle annonce", { ico: "i-plus" }) + btn("ecrire", "Nouveau message", { ico: "i-horn", cls: "btn-primary" }) : "" });""", """actions: ecr ? btn("affiche-libre", "Nouvelle affiche", { ico: "i-image" }) + btn("ajout-annonce", "Nouvelle annonce", { ico: "i-plus" }) + btn("ecrire", "Nouveau message", { ico: "i-horn", cls: "btn-primary" }) : "" });""")
rep("""      ${ecr ? `<hr class="sep"><div class="btn-row">${btn("editer-evt", "Modifier\"""", """      ${accesRegistre() ? `<div class="btn-row" style="margin-top:12px">${btn("affiche-evt", "Créer l’affiche", { ico: "i-image", sm: true, data: `data-id="${esc(e.id)}"` })}</div>` : ""}
      ${ecr ? `<hr class="sep"><div class="btn-row">${btn("editer-evt", "Modifier\"""")
rep("""<div class="btn-row">${btn("partager-annonce", "Partager", { ico: "i-msg", sm: true, data: `data-id="${esc(a.id)}"` })}${ecr ?""", """<div class="btn-row">${btn("partager-annonce", "Partager", { ico: "i-msg", sm: true, data: `data-id="${esc(a.id)}"` })}${accesRegistre() && S.etat === "pret" ? btn("affiche-annonce", "Affiche", { ico: "i-image", sm: true, data: `data-id="${esc(a.id)}"` }) : ""}${ecr ?""")
rep("""${btn("voeux", "Préparer le message", { ico: "i-cake", sm: true, data: `data-id="${esc(m.id)}"` })}""", """${btn("voeux", "Préparer le message", { ico: "i-cake", sm: true, data: `data-id="${esc(m.id)}"` })}${btn("affiche-anniv", "Affiche d’anniversaire", { ico: "i-image", sm: true, data: `data-id="${esc(m.id)}"` })}""")
rep("""  function ouvrirFormAnnonce(id) {
    const a = id ? S.annonces.find((x) => x.id === id) : {};""", """  function ouvrirFormAnnonce(id, preset) {
    const a = id ? S.annonces.find((x) => x.id === id) : { ...(preset || {}) };""")
rep("""    S.user = user; S.dl = dl; S.assets = assets;""", """    S.user = user; S.dl = dl; S.assets = assets;
    sur(c.use("sample")).then((sm) => { S.sample = typeof sm === "function" ? sm : null; render(); });""")
rep("""    if (id === "projets") return""", """    if (id === "assistant") return S.sample ? "Posez vos questions, faites rédiger vos textes" : "Disponible dans Claude";
    if (id === "projets") return""")

app.write_text(s)
mk = d / "markup.html"'''
s = s.replace('''app.write_text(s)
mk = d / "markup.html"''', bloc)
s = s.replace('''    mk.write_text(m)''', '''    mk.write_text(m)
m = mk.read_text()
if 'id="i-spark"' not in m:
    m = m.replace('<symbol id="i-flag"', '<symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/></symbol><symbol id="i-flag"', 1)
    mk.write_text(m)''', 1)
open(p, 'w').write(s)
print("patch_v5 mis à jour")
