CREATE TABLE IF NOT EXISTS docs (path TEXT PRIMARY KEY, parent TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, maj INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS docs_parent ON docs(parent);
CREATE TABLE IF NOT EXISTS revs (parent TEXT PRIMARY KEY, rev INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS comptes (email TEXT PRIMARY KEY, id TEXT NOT NULL, nom TEXT, photo TEXT, role TEXT NOT NULL DEFAULT 'attente', alias TEXT, cree INTEGER, derniere INTEGER, mdp TEXT, activation TEXT, membreId TEXT, matricule TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS comptes_matricule ON comptes(matricule) WHERE matricule IS NOT NULL;
CREATE TABLE IF NOT EXISTS sessions (jeton TEXT PRIMARY KEY, email TEXT NOT NULL, expire INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS fichiers (id TEXT PRIMARY KEY, type TEXT, taille INTEGER, par TEXT, cree INTEGER);
CREATE TABLE IF NOT EXISTS ia_conso (cle TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS tentatives (cle TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0, depuis INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS medias (id TEXT PRIMARY KEY, titre TEXT NOT NULL, description TEXT, categorie TEXT, genre TEXT NOT NULL, nom TEXT NOT NULL, mime TEXT NOT NULL, taille INTEGER NOT NULL, morceau INTEGER NOT NULL, morceaux INTEGER NOT NULL, stockage TEXT NOT NULL, visibilite TEXT NOT NULL DEFAULT 'membres', miniature TEXT, auteur TEXT, auteurNom TEXT, cree INTEGER, fini INTEGER NOT NULL DEFAULT 0, vues INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS medias_cree ON medias(fini, cree);
CREATE TABLE IF NOT EXISTS media_morceaux (id TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (id, n));
CREATE TABLE IF NOT EXISTS push_subs (userId TEXT NOT NULL, endpoint TEXT NOT NULL, p256dh TEXT, auth TEXT, cree INTEGER, PRIMARY KEY (userId, endpoint));
CREATE TABLE IF NOT EXISTS engagements (id INTEGER PRIMARY KEY AUTOINCREMENT, cree INTEGER NOT NULL, objet TEXT, pole TEXT, source TEXT, nom TEXT NOT NULL, tel TEXT, email TEXT, ville TEXT, message TEXT, traite INTEGER NOT NULL DEFAULT 0, note TEXT);
CREATE INDEX IF NOT EXISTS engagements_cree ON engagements(traite, cree);
CREATE TABLE IF NOT EXISTS meta (cle TEXT PRIMARY KEY, val TEXT);
CREATE INDEX IF NOT EXISTS docs_id ON docs(id);
CREATE INDEX IF NOT EXISTS sessions_expire ON sessions(expire);
CREATE INDEX IF NOT EXISTS ia_conso_cle ON ia_conso(cle);

-- SDE — Grades et Distinctions (tables isolées, sans modification des tables métier).
CREATE TABLE IF NOT EXISTS sde_grade_progress (
  member_ref TEXT PRIMARY KEY, account_id TEXT NOT NULL, matricule TEXT,
  grade_code TEXT NOT NULL DEFAULT 'recrue_iii', grade_since INTEGER NOT NULL,
  points_total INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sde_grade_points (
  id TEXT PRIMARY KEY, member_ref TEXT NOT NULL, account_id TEXT NOT NULL,
  category TEXT NOT NULL, activity_code TEXT NOT NULL, points INTEGER NOT NULL,
  description TEXT NOT NULL, evidence_ref TEXT, submitted_by TEXT NOT NULL,
  validated_by TEXT, status TEXT NOT NULL DEFAULT 'pending', period_key TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, reviewed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sde_grade_points_member ON sde_grade_points(member_ref,status,created_at);
CREATE INDEX IF NOT EXISTS idx_sde_grade_points_period ON sde_grade_points(member_ref,category,period_key,status);
CREATE TABLE IF NOT EXISTS sde_grade_promotions (
  id TEXT PRIMARY KEY, member_ref TEXT NOT NULL, account_id TEXT NOT NULL,
  from_grade TEXT NOT NULL, to_grade TEXT NOT NULL, points_snapshot INTEGER NOT NULL,
  academy_level INTEGER NOT NULL DEFAULT 0, grade_since_snapshot INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', submitted_at INTEGER NOT NULL,
  reviewed_by TEXT, decision_reason TEXT, decision_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sde_grade_promotions_status ON sde_grade_promotions(status,submitted_at);
CREATE TABLE IF NOT EXISTS sde_grade_directoire (
  account_id TEXT PRIMARY KEY, added_by TEXT NOT NULL, added_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sde_grade_awards (
  id TEXT PRIMARY KEY, member_ref TEXT NOT NULL, account_id TEXT NOT NULL,
  distinction_code TEXT NOT NULL, reason TEXT NOT NULL, awarded_by TEXT NOT NULL, awarded_at INTEGER NOT NULL
);
