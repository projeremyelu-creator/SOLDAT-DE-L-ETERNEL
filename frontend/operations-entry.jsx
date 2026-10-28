import React from 'react';
import {createRoot} from 'react-dom/client';
import {Operations} from './operations.jsx';
let mounted=false;
function ready(event){
 const portal=event.detail;if(mounted||!portal?.compte?.connecte||!['/mon-espace','/administration'].includes(location.pathname))return;
 const main=document.getElementById('main');if(!main)return;mounted=true;window.SDEOpsReady=true;
 const shell=main.parentElement,nav=document.createElement('div'),panel=document.createElement('div');nav.id='sde-operations-nav';panel.id='sde-operations-panel';
 shell.insertBefore(nav,document.getElementById('sde-current-bar')||main);shell.insertBefore(panel,main);
 const root=document.createElement('div');root.id='sde-operations-root';document.body.append(root);createRoot(root).render(<Operations portal={portal}/>);
}
document.addEventListener('sde:ready',ready);
if(window.SDEPortal)ready({detail:window.SDEPortal});
