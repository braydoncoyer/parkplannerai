import{r}from"./index.Da02gyCa.js";/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),y=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(a,s,t)=>t?t.toUpperCase():s.toLowerCase()),l=e=>{const a=y(e);return a.charAt(0).toUpperCase()+a.slice(1)},d=(...e)=>e.filter((a,s,t)=>!!a&&a.trim()!==""&&t.indexOf(a)===s).join(" ").trim(),h=e=>{for(const a in e)if(a.startsWith("aria-")||a==="role"||a==="title")return!0};/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var v={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=r.forwardRef(({color:e="currentColor",size:a=24,strokeWidth:s=2,absoluteStrokeWidth:t,className:i="",children:o,iconNode:c,...n},m)=>r.createElement("svg",{ref:m,...v,width:a,height:a,stroke:e,strokeWidth:t?Number(s)*24/Number(a):s,className:d("lucide",i),...!o&&!h(n)&&{"aria-hidden":"true"},...n},[...c.map(([g,u])=>r.createElement(g,u)),...Array.isArray(o)?o:[o]]));/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=(e,a)=>{const s=r.forwardRef(({className:t,...i},o)=>r.createElement(k,{ref:o,iconNode:a,className:d(`lucide-${w(l(e))}`,`lucide-${e}`,t),...i}));return s.displayName=l(e),s};/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=[["path",{d:"M12 6v6l4 2",key:"mmk7yg"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]],M=p("clock",f);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _=[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]],I=p("map-pin",_),C={5:{name:"EPCOT",image:"https://cdn1.parksmedia.wdprapps.disney.com/resize/mwImage/1/1349/464/75/vision-dam/digital/parks-platform/parks-global-assets/disney-world/attractions/spaceship-earth/1222ZQ_0247MS_JLM-16x9.jpg?2022-03-10T19:21:55+00:00%201349w"},6:{name:"Magic Kingdom",image:"https://cdn1.parksmedia.wdprapps.disney.com/resize/mwImage/1/1600/900/75/vision-dam/digital/parks-platform/parks-global-assets/disney-world/attractions/cinderella-castle/0724ZQ_0195MS_JLM-16x9.jpg?2023-03-06T17:58:34+00:00"},7:{name:"Disney's Hollywood Studios",image:"https://cdn.sanity.io/images/nxpteyfv/goguides/6ca4d5914070af28a23d545d7590e1028ae18442-1600x1066.jpg"},8:{name:"Disney's Animal Kingdom",image:"https://disneyparksblog.com/app/uploads/2023/04/2023-dak-25-header-scaled.jpg"}},b={16:{name:"Disneyland",image:"https://cdn1.parksmedia.wdprapps.disney.com/resize/mwImage/1/1260/711/75/vision-dam/digital/parks-platform/parks-global-assets/disneyland/events/70th-anniversary/attraction/0237_DLR_70_Environmentals_05212025_JS_B-SUPERMOD-16x9.jpg?2025-06-04T20:48:29+00:00"},17:{name:"Disney California Adventure",image:"https://cdn1.parksmedia.wdprapps.disney.com/resize/mwImage/1/3840/2160/75/vision-dam/digital/parks-platform/parks-global-assets/disneyland/attractions/pixar-pier/dca-pixar-pier-day-16x9.jpg?2022-12-20T22:19:24+00:00%203840w"}},x={64:{name:"Islands of Adventure",image:"https://www.disneydining.com/wp-content/uploads/2024/02/universal-orlando-islands-of-adventure.jpg"},65:{name:"Universal Studios Florida",image:"https://cache.undercovertourist.com/blog/2022/10/1022-best-time-visit-uor-globe.jpg"},67:{name:"Universal Volcano Bay",image:"https://www.thetopvillas.com/blog/wp-content/uploads/2017/06/rsz_1volcano_bay_orlando-1.jpg"},334:{name:"Universal Epic Universe",image:"https://www.universalorlando.com/webdata/k2/en/us/files/Images/gds/ueu-theme-park-chronos-daytime-with-guests-c.jpg"}},j={66:{name:"Universal Studios Hollywood",image:"https://res.cloudinary.com/simpleview/image/upload/v1612197440/clients/anaheimca/uni_studios_hollywood_max_res_default2_3f15e0a6-8283-470c-8870-1f2a89c02952.jpg"}},D={waltDisneyWorld:C,disneylandResort:b,universalOrlando:x,universalHollywood:j};export{M as C,I as M,p as c,D as p};
