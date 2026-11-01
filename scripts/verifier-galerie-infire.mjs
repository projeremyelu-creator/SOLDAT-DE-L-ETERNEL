import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const manifestFile = join(root, 'public/vitrine/albums/infire/album.json');
const pageFile = join(root, 'public/vitrine/album-infire.html');
const programmesFile = join(root, 'public/vitrine/programmes.html');
const ressourcesFile = join(root, 'public/vitrine/ressources.html');
const gallery = JSON.parse(readFileSync(manifestFile,'utf8'));
const errors=[];
if (!Array.isArray(gallery.editions) || gallery.editions.join(',') !== '2024,2025,2026') errors.push('Les trois éditions IN FIRE sont requises.');
if (!Array.isArray(gallery.photos) || gallery.photos.length !== 10) errors.push('Le catalogue attend dix photographies.');
const page=readFileSync(pageFile,'utf8'),programmes=readFileSync(programmesFile,'utf8'),ressources=readFileSync(ressourcesFile,'utf8');
for(const year of gallery.editions){if(!page.includes('data-year="'+year+'"'))errors.push('Onglet '+year+' manquant.');}
for(const [name,html] of [['programmes',programmes],['ressources',ressources]])if(!html.includes('/vitrine/album-infire.html'))errors.push('Lien galerie absent dans '+name+'.');
for(const photo of gallery.photos || []){
 if(!gallery.editions.includes(photo.annee)) errors.push('Année non reconnue pour '+photo.numero);
 for(const key of ['image','miniature']){
   const url=photo[key];
   if(typeof url!=='string' || !url.startsWith('/vitrine/albums/infire/')){errors.push('Chemin de '+key+' invalide pour photo '+photo.numero);continue;}
   const local=join(root,'public',url.slice(1));
   if(!existsSync(local)) errors.push('Fichier absent : '+url);
   if(!page.includes(url))errors.push('Photo non mentionnée dans la galerie : '+url);
 }
}
if(errors.length){
 console.error('Échec du contrôle IN FIRE :\n'+errors.map(e=>' - '+e).join('\n'));
 process.exitCode=1;
}else console.log('Album IN FIRE complet : '+gallery.photos.length+' photos, '+gallery.editions.length+' éditions et tous les fichiers présents.');
