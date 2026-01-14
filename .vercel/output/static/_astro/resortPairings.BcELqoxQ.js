import{c as o}from"./parkImages.BwOBi-JW.js";/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],p=o("calendar",i);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]],u=o("chevron-up",l);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=[["path",{d:"M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528",key:"1jaruq"}]],k=o("flag",d);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",key:"1s2grr"}],["path",{d:"M20 2v4",key:"1rf3ol"}],["path",{d:"M22 4h-4",key:"gwowj6"}],["circle",{cx:"4",cy:"20",r:"2",key:"6kqj1y"}]],y=o("sparkles",c);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]],N=o("star",m),n=[{resortId:"disneyland-resort",resortName:"Disneyland Resort",parks:[{id:16,name:"Disneyland",shortName:"DL"},{id:17,name:"Disney California Adventure",shortName:"DCA"}],transitionTime:15},{resortId:"walt-disney-world",resortName:"Walt Disney World",parks:[{id:6,name:"Magic Kingdom",shortName:"MK"},{id:5,name:"EPCOT",shortName:"EP"},{id:7,name:"Hollywood Studios",shortName:"HS"},{id:8,name:"Animal Kingdom",shortName:"AK"}],transitionTime:30},{resortId:"universal-orlando",resortName:"Universal Orlando Resort",parks:[{id:65,name:"Universal Studios Florida",shortName:"USF"},{id:64,name:"Islands of Adventure",shortName:"IOA"},{id:334,name:"Epic Universe",shortName:"EU"}],transitionTime:20},{resortId:"universal-hollywood",resortName:"Universal Hollywood",parks:[{id:66,name:"Universal Studios Hollywood",shortName:"USH"}],transitionTime:0}];function s(e){return n.find(a=>a.parks.some(r=>r.id===e))||null}function v(e){const a=s(e);return a?a.parks.filter(r=>r.id!==e):[]}function f(e){const a=s(e);return a!==null&&a.parks.length>1}function M(e){for(const a of n){const r=a.parks.find(t=>t.id===e);if(r)return r.shortName}return""}function A(e,a){const r=s(e),t=s(a);return!r||!t||r.resortId!==t.resortId?30:r.transitionTime}const g=[{value:"10:30 AM",label:"10:30 AM"},{value:"11:00 AM",label:"11:00 AM"},{value:"11:30 AM",label:"11:30 AM"}];export{p as C,k as F,y as S,g as T,u as a,N as b,v as c,s as d,A as e,M as g,f as s};
