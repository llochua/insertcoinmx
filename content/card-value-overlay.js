/**
 * Valor comunitario: SOLO texto SVG transparente.
 * Las áreas limpias y los puntos de colección ya vienen en los WebP
 * generados por cartas/generar.py. Aquí no se tapan ni modifican píxeles.
 * El servidor podrá enviar un POP diferente sin regenerar la carta.
 */
(function(){
 'use strict';
 const NS='http://www.w3.org/2000/svg';
 const VALID=Object.freeze({b:10,e:25,r:50,f:100});
 const isPop=value=>Number.isSafeInteger(value)&&value>=0&&value<=1000;
 function mount(fx,{variant,points,pop=null}={}){
  if(!fx||!Object.prototype.hasOwnProperty.call(VALID,variant))return null;
  const img=fx.querySelector(':scope > img');
  if(!img)return null;
  const previous=fx.querySelector(':scope > svg.icmx-live-pop');
  if(previous)previous.remove();
  const svg=document.createElementNS(NS,'svg');
  svg.classList.add('icmx-live-pop');
  svg.setAttribute('viewBox','0 0 960 1340');
  svg.setAttribute('preserveAspectRatio','none');
  svg.setAttribute('aria-hidden','true');
  const label=document.createElementNS(NS,'text');
  label.setAttribute('x','909');
  label.setAttribute('y',variant==='f'?'1011':'209');
  label.setAttribute('text-anchor','end');
  label.setAttribute('font-family','AV, Avenir Next, sans-serif');
  label.setAttribute('font-weight','700');
  label.setAttribute('font-size',variant==='f'?'79':'74');
  label.setAttribute('fill',variant==='f'?'#ffffff':variant==='e'?'#131111':variant==='r'?'#191203':'#191200');
  label.textContent=isPop(pop)?String(pop):'—';
  svg.appendChild(label);
  img.insertAdjacentElement('afterend',svg);
  svg.dataset.variant=variant;
  svg.dataset.points=points===VALID[variant]?String(points):'—';
  svg.dataset.pop=isPop(pop)?String(pop):'—';
  svg.dataset.ready='true';
  return svg;
 }
 window.ICMX_CARD_VALUE=Object.freeze({mount});
})();
