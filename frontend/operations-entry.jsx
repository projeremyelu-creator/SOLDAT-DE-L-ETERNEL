import React from 'react';
import {createRoot} from 'react-dom/client';
import {Operations} from './operations.jsx';
let mounted=false;
function ready(event){
 const portal=event.detail;if(mounted||!portal?.compte?.connecte||!['/mon-espace','/administration'].includes(location.pathname))return;
 const main=document.getElementById('main');if(!main)return;mounted=true;window.SDEOpsReady=true;document.documentElement.dataset.theme='dark';document.body.classList.add('sde-reference',location.pathname==='/administration'?'sde-reference-admin':'sde-reference-member');
 const shell=main.parentElement,side=document.createElement('div');side.id='sde-reference-sidebar';shell.insertBefore(side,shell.firstChild);
 const nav=document.createElement('div'),panel=document.createElement('div');nav.id='sde-operations-nav';panel.id='sde-operations-panel';
 shell.insertBefore(nav,shell.querySelector('.sde-current-bar')||main);shell.insertBefore(panel,main);
 const root=document.createElement('div');root.id='sde-operations-root';document.body.append(root);createRoot(root).render(<Operations portal={portal}/>);
}
document.addEventListener('sde:ready',ready);
if(window.SDEPortal)ready({detail:window.SDEPortal});
