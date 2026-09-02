import{$n as e,$t as t,At as n,Bn as r,Er as i,Ft as a,Gt as o,In as s,It as c,Jt as l,Kt as u,Ln as d,Lr as f,Lt as p,Mn as m,Nn as h,Pn as g,Tr as _,Tt as v,Vn as y,Wn as b,Wt as x,Xt as S,Yn as C,_r as w,br as T,cr as E,dr as D,en as O,er as k,gr as ee,hr as A,jr as j,kt as M,lt as te,mr as ne,or as N,pr as P,rr as F,sr as re,tr as I,wt as ie,xt as L,zn as R}from"./opensearch-Cf7hXhhS.js";function z(e){return Object.keys(e)}function ae(e){return e.composedPath()[0]||null}function B(e){return e.composedPath()[0]}var oe={mousemoveoutside:new WeakMap,clickoutside:new WeakMap};function se(e,t,n){if(e===`mousemoveoutside`){let e=e=>{t.contains(B(e))||n(e)};return{mousemove:e,touchstart:e}}if(e===`clickoutside`){let e=!1,r=n=>{e=!t.contains(B(n))},i=r=>{e&&(t.contains(B(r))||n(r))};return{mousedown:r,mouseup:i,touchstart:r,touchend:i}}return console.error(`[evtd/create-trap-handler]: name \`${e}\` is invalid. This could be a bug of evtd.`),{}}function ce(e,t,n){let r=oe[e],i=r.get(t);i===void 0&&r.set(t,i=new WeakMap);let a=i.get(n);return a===void 0&&i.set(n,a=se(e,t,n)),a}function le(e,t,n,r){if(e===`mousemoveoutside`||e===`clickoutside`){let i=ce(e,t,n);return Object.keys(i).forEach(e=>{V(e,document,i[e],r)}),!0}return!1}function ue(e,t,n,r){if(e===`mousemoveoutside`||e===`clickoutside`){let i=ce(e,t,n);return Object.keys(i).forEach(e=>{H(e,document,i[e],r)}),!0}return!1}function de(){if(typeof window>`u`)return{on:()=>{},off:()=>{}};let e=new WeakMap,t=new WeakMap;function n(){e.set(this,!0)}function r(){e.set(this,!0),t.set(this,!0)}function i(e,t,n){let r=e[t];return e[t]=function(){return n.apply(e,arguments),r.apply(e,arguments)},e}function a(e,t){e[t]=Event.prototype[t]}let o=new WeakMap,s=Object.getOwnPropertyDescriptor(Event.prototype,`currentTarget`);function c(){return o.get(this)??null}function l(e,t){s!==void 0&&Object.defineProperty(e,"currentTarget",{configurable:!0,enumerable:!0,get:t??s.get})}let u={bubble:{},capture:{}},d={};function f(){let s=function(s){let{type:d,eventPhase:f,bubbles:p}=s,m=B(s);if(f===2)return;let h=f===1?`capture`:`bubble`,g=m,_=[];for(;g===null&&(g=window),_.push(g),g!==window;)g=g.parentNode||null;let v=u.capture[d],y=u.bubble[d];if(i(s,`stopPropagation`,n),i(s,`stopImmediatePropagation`,r),l(s,c),h===`capture`){if(v===void 0)return;for(let n=_.length-1;n>=0&&!e.has(s);--n){let e=_[n],r=v.get(e);if(r!==void 0){o.set(s,e);for(let e of r){if(t.has(s))break;e(s)}}if(n===0&&!p&&y!==void 0){let n=y.get(e);if(n!==void 0)for(let e of n){if(t.has(s))break;e(s)}}}}else if(h===`bubble`){if(y===void 0)return;for(let n=0;n<_.length&&!e.has(s);++n){let e=_[n],r=y.get(e);if(r!==void 0){o.set(s,e);for(let e of r){if(t.has(s))break;e(s)}}}}a(s,`stopPropagation`),a(s,`stopImmediatePropagation`),l(s)};return s.displayName=`evtdUnifiedHandler`,s}function p(){let e=function(e){let{type:t,eventPhase:n}=e;if(n!==2)return;let r=d[t];r!==void 0&&r.forEach(t=>t(e))};return e.displayName=`evtdUnifiedWindowEventHandler`,e}let m=f(),h=p();function g(e,t){let n=u[e];return n[t]===void 0&&(n[t]=new Map,window.addEventListener(t,m,e===`capture`)),n[t]}function _(e){return d[e]===void 0&&(d[e]=new Set,window.addEventListener(e,h)),d[e]}function v(e,t){let n=e.get(t);return n===void 0&&e.set(t,n=new Set),n}function y(e,t,n,r){let i=u[t][n];if(i!==void 0){let t=i.get(e);if(t!==void 0&&t.has(r))return!0}return!1}function b(e,t){let n=d[e];return!!(n!==void 0&&n.has(t))}function x(e,t,n,r){let i;if(i=typeof r==`object`&&r.once===!0?a=>{S(e,t,i,r),n(a)}:n,le(e,t,i,r))return;let a=v(g(r===!0||typeof r==`object`&&r.capture===!0?`capture`:`bubble`,e),t);if(a.has(i)||a.add(i),t===window){let t=_(e);t.has(i)||t.add(i)}}function S(e,t,n,r){if(ue(e,t,n,r))return;let i=r===!0||typeof r==`object`&&r.capture===!0,a=i?`capture`:`bubble`,o=g(a,e),s=v(o,t);if(t===window&&!y(t,i?`bubble`:`capture`,e,n)&&b(e,n)){let t=d[e];t.delete(n),t.size===0&&(window.removeEventListener(e,h),d[e]=void 0)}s.has(n)&&s.delete(n),s.size===0&&o.delete(t),o.size===0&&(window.removeEventListener(e,m,a===`capture`),u[a][e]=void 0)}return{on:x,off:S}}var{on:V,off:H}=de(),fe=(typeof window>`u`?!1:/iPad|iPhone|iPod/.test(navigator.platform)||navigator.platform===`MacIntel`&&navigator.maxTouchPoints>1)&&!window.MSStream;function pe(){return fe}function me(e){let t={isDeactivated:!1},n=!1;return P(()=>{if(t.isDeactivated=!1,!n){n=!0;return}e()}),A(()=>{t.isDeactivated=!0,n||=!0}),t}function he(e){let{left:t,right:n,top:r,bottom:i}=o(e);return`${r} ${t} ${i} ${n}`}var ge=N({render(){return this.$slots.default?.()}}),{cubicBezierEaseInOut:U}=t;function _e({name:e=`fade-in`,enterDuration:t=`0.2s`,leaveDuration:n=`0.2s`,enterCubicBezier:r=U,leaveCubicBezier:i=U}={}){return[h(`&.${e}-transition-enter-active`,{transition:`all ${t} ${r}!important`}),h(`&.${e}-transition-leave-active`,{transition:`all ${n} ${i}!important`}),h(`&.${e}-transition-enter-from, &.${e}-transition-leave-to`,{opacity:0}),h(`&.${e}-transition-leave-from, &.${e}-transition-enter-to`,{opacity:1})]}var ve=g(`scrollbar`,`
 overflow: hidden;
 position: relative;
 z-index: auto;
 height: 100%;
 width: 100%;
`,[h(`>`,[g(`scrollbar-container`,`
 width: 100%;
 overflow: scroll;
 height: 100%;
 min-height: inherit;
 max-height: inherit;
 scrollbar-width: none;
 `,[h(`&::-webkit-scrollbar, &::-webkit-scrollbar-track-piece, &::-webkit-scrollbar-thumb`,`
 width: 0;
 height: 0;
 display: none;
 `),h(`>`,[g(`scrollbar-content`,`
 box-sizing: border-box;
 min-width: 100%;
 `)])])]),h(`>, +`,[g(`scrollbar-rail`,`
 position: absolute;
 pointer-events: none;
 user-select: none;
 background: var(--n-scrollbar-rail-color);
 -webkit-user-select: none;
 `,[d(`horizontal`,`
 height: var(--n-scrollbar-height);
 `,[h(`>`,[s(`scrollbar`,`
 height: var(--n-scrollbar-height);
 border-radius: var(--n-scrollbar-border-radius);
 right: 0;
 `)])]),d(`horizontal--top`,`
 top: var(--n-scrollbar-rail-top-horizontal-top); 
 right: var(--n-scrollbar-rail-right-horizontal-top); 
 bottom: var(--n-scrollbar-rail-bottom-horizontal-top); 
 left: var(--n-scrollbar-rail-left-horizontal-top); 
 `),d(`horizontal--bottom`,`
 top: var(--n-scrollbar-rail-top-horizontal-bottom); 
 right: var(--n-scrollbar-rail-right-horizontal-bottom); 
 bottom: var(--n-scrollbar-rail-bottom-horizontal-bottom); 
 left: var(--n-scrollbar-rail-left-horizontal-bottom); 
 `),d(`vertical`,`
 width: var(--n-scrollbar-width);
 `,[h(`>`,[s(`scrollbar`,`
 width: var(--n-scrollbar-width);
 border-radius: var(--n-scrollbar-border-radius);
 bottom: 0;
 `)])]),d(`vertical--left`,`
 top: var(--n-scrollbar-rail-top-vertical-left); 
 right: var(--n-scrollbar-rail-right-vertical-left); 
 bottom: var(--n-scrollbar-rail-bottom-vertical-left); 
 left: var(--n-scrollbar-rail-left-vertical-left); 
 `),d(`vertical--right`,`
 top: var(--n-scrollbar-rail-top-vertical-right); 
 right: var(--n-scrollbar-rail-right-vertical-right); 
 bottom: var(--n-scrollbar-rail-bottom-vertical-right); 
 left: var(--n-scrollbar-rail-left-vertical-right); 
 `),d(`disabled`,[h(`>`,[s(`scrollbar`,`pointer-events: none;`)])]),h(`>`,[s(`scrollbar`,`
 z-index: 1;
 position: absolute;
 cursor: pointer;
 pointer-events: all;
 background-color: var(--n-scrollbar-color);
 transition: background-color .2s var(--n-scrollbar-bezier);
 `,[_e(),h(`&:hover`,`background-color: var(--n-scrollbar-color-hover);`)])])])])]);function ye(e,t){console.error(`[vueuc/${e}]: ${t}`)}var W=[],be=function(){return W.some(function(e){return e.activeTargets.length>0})},xe=function(){return W.some(function(e){return e.skippedTargets.length>0})},Se=`ResizeObserver loop completed with undelivered notifications.`,G=function(){var e;typeof ErrorEvent==`function`?e=new ErrorEvent(`error`,{message:Se}):(e=document.createEvent(`Event`),e.initEvent(`error`,!1,!1),e.message=Se),window.dispatchEvent(e)},K;(function(e){e.BORDER_BOX=`border-box`,e.CONTENT_BOX=`content-box`,e.DEVICE_PIXEL_CONTENT_BOX=`device-pixel-content-box`})(K||={});var q=function(e){return Object.freeze(e)},Ce=function(){function e(e,t){this.inlineSize=e,this.blockSize=t,q(this)}return e}(),we=function(){function e(e,t,n,r){return this.x=e,this.y=t,this.width=n,this.height=r,this.top=this.y,this.left=this.x,this.bottom=this.top+this.height,this.right=this.left+this.width,q(this)}return e.prototype.toJSON=function(){var e=this;return{x:e.x,y:e.y,top:e.top,right:e.right,bottom:e.bottom,left:e.left,width:e.width,height:e.height}},e.fromRect=function(t){return new e(t.x,t.y,t.width,t.height)},e}(),Te=function(e){return e instanceof SVGElement&&`getBBox`in e},Ee=function(e){if(Te(e)){var t=e.getBBox(),n=t.width,r=t.height;return!n&&!r}var i=e,a=i.offsetWidth,o=i.offsetHeight;return!(a||o||e.getClientRects().length)},De=function(e){if(e instanceof Element)return!0;var t=e?.ownerDocument?.defaultView;return!!(t&&e instanceof t.Element)},Oe=function(e){switch(e.tagName){case`INPUT`:if(e.type!==`image`)break;case`VIDEO`:case`AUDIO`:case`EMBED`:case`OBJECT`:case`CANVAS`:case`IFRAME`:case`IMG`:return!0}return!1},J=typeof window<`u`?window:{},Y=new WeakMap,ke=/auto|scroll/,X=/^tb|vertical/,Ae=/msie|trident/i.test(J.navigator&&J.navigator.userAgent),Z=function(e){return parseFloat(e||`0`)},Q=function(e,t,n){return e===void 0&&(e=0),t===void 0&&(t=0),n===void 0&&(n=!1),new Ce((n?t:e)||0,(n?e:t)||0)},je=q({devicePixelContentBoxSize:Q(),borderBoxSize:Q(),contentBoxSize:Q(),contentRect:new we(0,0,0,0)}),Me=function(e,t){if(t===void 0&&(t=!1),Y.has(e)&&!t)return Y.get(e);if(Ee(e))return Y.set(e,je),je;var n=getComputedStyle(e),r=Te(e)&&e.ownerSVGElement&&e.getBBox(),i=!Ae&&n.boxSizing===`border-box`,a=X.test(n.writingMode||``),o=!r&&ke.test(n.overflowY||``),s=!r&&ke.test(n.overflowX||``),c=r?0:Z(n.paddingTop),l=r?0:Z(n.paddingRight),u=r?0:Z(n.paddingBottom),d=r?0:Z(n.paddingLeft),f=r?0:Z(n.borderTopWidth),p=r?0:Z(n.borderRightWidth),m=r?0:Z(n.borderBottomWidth),h=r?0:Z(n.borderLeftWidth),g=d+l,_=c+u,v=h+p,y=f+m,b=s?e.offsetHeight-y-e.clientHeight:0,x=o?e.offsetWidth-v-e.clientWidth:0,S=i?g+v:0,C=i?_+y:0,w=r?r.width:Z(n.width)-S-x,T=r?r.height:Z(n.height)-C-b,E=w+g+x+v,D=T+_+b+y,O=q({devicePixelContentBoxSize:Q(Math.round(w*devicePixelRatio),Math.round(T*devicePixelRatio),a),borderBoxSize:Q(E,D,a),contentBoxSize:Q(w,T,a),contentRect:new we(d,c,w,T)});return Y.set(e,O),O},$=function(e,t,n){var r=Me(e,n),i=r.borderBoxSize,a=r.contentBoxSize,o=r.devicePixelContentBoxSize;switch(t){case K.DEVICE_PIXEL_CONTENT_BOX:return o;case K.BORDER_BOX:return i;default:return a}},Ne=function(){function e(e){var t=Me(e);this.target=e,this.contentRect=t.contentRect,this.borderBoxSize=q([t.borderBoxSize]),this.contentBoxSize=q([t.contentBoxSize]),this.devicePixelContentBoxSize=q([t.devicePixelContentBoxSize])}return e}(),Pe=function(e){if(Ee(e))return 1/0;for(var t=0,n=e.parentNode;n;)t+=1,n=n.parentNode;return t},Fe=function(){var e=1/0,t=[];W.forEach(function(n){if(n.activeTargets.length!==0){var r=[];n.activeTargets.forEach(function(t){var n=new Ne(t.target),i=Pe(t.target);r.push(n),t.lastReportedSize=$(t.target,t.observedBox),i<e&&(e=i)}),t.push(function(){n.callback.call(n.observer,r,n.observer)}),n.activeTargets.splice(0,n.activeTargets.length)}});for(var n=0,r=t;n<r.length;n++){var i=r[n];i()}return e},Ie=function(e){W.forEach(function(t){t.activeTargets.splice(0,t.activeTargets.length),t.skippedTargets.splice(0,t.skippedTargets.length),t.observationTargets.forEach(function(n){n.isActive()&&(Pe(n.target)>e?t.activeTargets.push(n):t.skippedTargets.push(n))})})},Le=function(){var e=0;for(Ie(e);be();)e=Fe(),Ie(e);return xe()&&G(),e>0},Re,ze=[],Be=function(){return ze.splice(0).forEach(function(e){return e()})},Ve=function(e){if(!Re){var t=0,n=document.createTextNode(``);new MutationObserver(function(){return Be()}).observe(n,{characterData:!0}),Re=function(){n.textContent=`${t?t--:t++}`}}ze.push(e),Re()},He=function(e){Ve(function(){requestAnimationFrame(e)})},Ue=0,We=function(){return!!Ue},Ge=250,Ke={attributes:!0,characterData:!0,childList:!0,subtree:!0},qe=[`resize`,`load`,`transitionend`,`animationend`,`animationstart`,`animationiteration`,`keyup`,`keydown`,`mouseup`,`mousedown`,`mouseover`,`mouseout`,`blur`,`focus`],Je=function(e){return e===void 0&&(e=0),Date.now()+e},Ye=!1,Xe=new(function(){function e(){var e=this;this.stopped=!0,this.listener=function(){return e.schedule()}}return e.prototype.run=function(e){var t=this;if(e===void 0&&(e=Ge),!Ye){Ye=!0;var n=Je(e);He(function(){var r=!1;try{r=Le()}finally{if(Ye=!1,e=n-Je(),!We())return;r?t.run(1e3):e>0?t.run(e):t.start()}})}},e.prototype.schedule=function(){this.stop(),this.run()},e.prototype.observe=function(){var e=this,t=function(){return e.observer&&e.observer.observe(document.body,Ke)};document.body?t():J.addEventListener(`DOMContentLoaded`,t)},e.prototype.start=function(){var e=this;this.stopped&&(this.stopped=!1,this.observer=new MutationObserver(this.listener),this.observe(),qe.forEach(function(t){return J.addEventListener(t,e.listener,!0)}))},e.prototype.stop=function(){var e=this;this.stopped||=(this.observer&&this.observer.disconnect(),qe.forEach(function(t){return J.removeEventListener(t,e.listener,!0)}),!0)},e}()),Ze=function(e){!Ue&&e>0&&Xe.start(),Ue+=e,!Ue&&Xe.stop()},Qe=function(e){return!Te(e)&&!Oe(e)&&getComputedStyle(e).display===`inline`},$e=function(){function e(e,t){this.target=e,this.observedBox=t||K.CONTENT_BOX,this.lastReportedSize={inlineSize:0,blockSize:0}}return e.prototype.isActive=function(){var e=$(this.target,this.observedBox,!0);return Qe(this.target)&&(this.lastReportedSize=e),this.lastReportedSize.inlineSize!==e.inlineSize||this.lastReportedSize.blockSize!==e.blockSize},e}(),et=function(){function e(e,t){this.activeTargets=[],this.skippedTargets=[],this.observationTargets=[],this.observer=e,this.callback=t}return e}(),tt=new WeakMap,nt=function(e,t){for(var n=0;n<e.length;n+=1)if(e[n].target===t)return n;return-1},rt=function(){function e(){}return e.connect=function(e,t){var n=new et(e,t);tt.set(e,n)},e.observe=function(e,t,n){var r=tt.get(e),i=r.observationTargets.length===0;nt(r.observationTargets,t)<0&&(i&&W.push(r),r.observationTargets.push(new $e(t,n&&n.box)),Ze(1),Xe.schedule())},e.unobserve=function(e,t){var n=tt.get(e),r=nt(n.observationTargets,t),i=n.observationTargets.length===1;r>=0&&(i&&W.splice(W.indexOf(n),1),n.observationTargets.splice(r,1),Ze(-1))},e.disconnect=function(e){var t=this,n=tt.get(e);n.observationTargets.slice().forEach(function(n){return t.unobserve(e,n.target)}),n.activeTargets.splice(0,n.activeTargets.length)},e}(),it=function(){function e(e){if(arguments.length===0)throw TypeError(`Failed to construct 'ResizeObserver': 1 argument required, but only 0 present.`);if(typeof e!=`function`)throw TypeError(`Failed to construct 'ResizeObserver': The callback provided as parameter 1 is not a function.`);rt.connect(this,e)}return e.prototype.observe=function(e,t){if(arguments.length===0)throw TypeError(`Failed to execute 'observe' on 'ResizeObserver': 1 argument required, but only 0 present.`);if(!De(e))throw TypeError(`Failed to execute 'observe' on 'ResizeObserver': parameter 1 is not of type 'Element`);rt.observe(this,e,t)},e.prototype.unobserve=function(e){if(arguments.length===0)throw TypeError(`Failed to execute 'unobserve' on 'ResizeObserver': 1 argument required, but only 0 present.`);if(!De(e))throw TypeError(`Failed to execute 'unobserve' on 'ResizeObserver': parameter 1 is not of type 'Element`);rt.unobserve(this,e)},e.prototype.disconnect=function(){rt.disconnect(this)},e.toString=function(){return`function ResizeObserver () { [polyfill code] }`},e}(),at=new class{constructor(){this.handleResize=this.handleResize.bind(this),this.observer=new(typeof window<`u`&&window.ResizeObserver||it)(this.handleResize),this.elHandlersMap=new Map}handleResize(e){for(let t of e){let e=this.elHandlersMap.get(t.target);e!==void 0&&e(t)}}registerHandler(e,t){this.elHandlersMap.set(e,t),this.observer.observe(e)}unregisterHandler(e){this.elHandlersMap.has(e)&&(this.elHandlersMap.delete(e),this.observer.unobserve(e))}},ot=N({name:`ResizeObserver`,props:{onResize:Function},setup(e){let t=!1,n=re().proxy;function r(t){let{onResize:n}=e;n!==void 0&&n(t)}ee(()=>{let e=n.$el;if(e===void 0){ye(`resize-observer`,`$el does not exist.`);return}if(e.nextElementSibling!==e.nextSibling&&e.nodeType===3&&e.nodeValue!==``){ye(`resize-observer`,`$el can not be observed (it may be a text node).`);return}e.nextElementSibling!==null&&(at.registerHandler(e.nextElementSibling,r),t=!0)}),ne(()=>{t&&at.unregisterHandler(n.$el.nextElementSibling)})},render(){return T(this.$slots,`default`)}}),st=[`onMousedown`],ct=[`onScroll`,`onWheel`],lt=[`onMousedown`],ut={...a.props,duration:{type:Number,default:0},scrollable:{type:Boolean,default:!0},xScrollable:Boolean,trigger:{type:String,default:`hover`},useUnifiedContainer:Boolean,triggerDisplayManually:Boolean,container:Function,content:Function,containerClass:String,containerStyle:[String,Object],contentClass:[String,Array],contentStyle:[String,Object],horizontalRailStyle:[String,Object],verticalRailStyle:[String,Object],onScroll:Function,onWheel:Function,onResize:Function,internalOnUpdateScrollLeft:Function,internalHoistYRail:Boolean,internalExposeWidthCssVar:Boolean,yPlacement:{type:String,default:`right`},xPlacement:{type:String,default:`bottom`}},dt=N({name:`Scrollbar`,props:ut,inheritAttrs:!1,setup(t){let{mergedClsPrefixRef:n,inlineThemeDisabled:r,mergedRtlRef:i}=O(t),s=ie(`Scrollbar`,i,n),l=j(null),u=j(null),d=j(null),f=j(null),m=j(null),h=j(null),g=j(null),v=j(null),y=j(null),b=j(null),S=j(null),C=j(0),w=j(0),T=j(!1),E=j(!1),D=!1,k=!1,A,M,te=0,N=0,P=0,F=0,re=pe(),I=a(`Scrollbar`,`-scrollbar`,ve,p,t,n),L=e(()=>{let{value:e}=v,{value:t}=h,{value:n}=b;return e===null||t===null||n===null?0:Math.min(e,n*e/t+x(I.value.self.width)*1.5)}),R=e(()=>`${L.value}px`),z=e(()=>{let{value:e}=y,{value:t}=g,{value:n}=S;return e===null||t===null||n===null?0:n*e/t+x(I.value.self.height)*1.5}),B=e(()=>`${z.value}px`),oe=e(()=>{let{value:e}=v,{value:t}=C,{value:n}=h,{value:r}=b;if(e===null||n===null||r===null)return 0;{let i=n-e;return i?t/i*(r-L.value):0}}),se=e(()=>`${oe.value}px`),ce=e(()=>{let{value:e}=y,{value:t}=w,{value:n}=g,{value:r}=S;if(e===null||n===null||r===null)return 0;{let i=n-e;return i?t/i*(r-z.value):0}}),le=e(()=>`${ce.value}px`),ue=e(()=>{let{value:e}=v,{value:t}=h;return e!==null&&t!==null&&t>e}),de=e(()=>{let{value:e}=y,{value:t}=g;return e!==null&&t!==null&&t>e}),fe=e(()=>{let{trigger:e}=t;return e===`none`||T.value}),ge=e(()=>{let{trigger:e}=t;return e===`none`||E.value}),U=e(()=>{let{container:e}=t;return e?e():u.value}),_e=e(()=>{let{content:e}=t;return e?e():d.value}),ye=(e,n)=>{if(!t.scrollable)return;if(typeof e==`number`){G(e,n??0,0,!1,`auto`);return}let{left:r,top:i,index:a,elSize:o,position:s,behavior:c,el:l,debounce:u=!0}=e;(r!==void 0||i!==void 0)&&G(r??0,i??0,0,!1,c),l===void 0?a!==void 0&&o!==void 0?G(0,a*o,o,u,c):s===`bottom`?G(0,2**53-1,0,!1,c):s===`top`&&G(0,0,0,!1,c):G(0,l.offsetTop,l.offsetHeight,u,c)},W=me(()=>{t.container||ye({top:C.value,left:w.value})}),be=()=>{W.isDeactivated||X()},xe=e=>{if(W.isDeactivated)return;let{onResize:n}=t;n&&n(e),X()},Se=(e,n)=>{if(!t.scrollable)return;let{value:r}=U;r&&(typeof e==`object`?r.scrollBy(e):r.scrollBy(e,n||0))};function G(e,t,n,r,i){let{value:a}=U;if(a){if(r){let{scrollTop:r,offsetHeight:o}=a;if(t>r){t+n<=r+o||a.scrollTo({left:e,top:t+n-o,behavior:i});return}}a.scrollTo({left:e,top:t,behavior:i})}}function K(){Ee(),De(),X()}function q(){Ce()}function Ce(){we(),Te()}function we(){M!==void 0&&window.clearTimeout(M),M=window.setTimeout(()=>{E.value=!1},t.duration)}function Te(){A!==void 0&&window.clearTimeout(A),A=window.setTimeout(()=>{T.value=!1},t.duration)}function Ee(){A!==void 0&&window.clearTimeout(A),T.value=!0}function De(){M!==void 0&&window.clearTimeout(M),E.value=!0}function Oe(e){let{onScroll:n}=t;n&&n(e),J()}function J(){let{value:e}=U;e&&(C.value=e.scrollTop,w.value=e.scrollLeft*(s?.value?-1:1))}function Y(){let{value:e}=_e;e&&(h.value=e.offsetHeight,g.value=e.offsetWidth);let{value:t}=U;t&&(v.value=t.offsetHeight,y.value=t.offsetWidth);let{value:n}=m,{value:r}=f;n&&(S.value=n.offsetWidth),r&&(b.value=r.offsetHeight)}function ke(){let{value:e}=U;e&&(C.value=e.scrollTop,w.value=e.scrollLeft*(s?.value?-1:1),v.value=e.offsetHeight,y.value=e.offsetWidth,h.value=e.scrollHeight,g.value=e.scrollWidth);let{value:t}=m,{value:n}=f;t&&(S.value=t.offsetWidth),n&&(b.value=n.offsetHeight)}function X(){t.scrollable&&(t.useUnifiedContainer?ke():(Y(),J()))}function Ae(e){return!l.value?.contains(ae(e))}function Z(e){e.preventDefault(),e.stopPropagation(),k=!0,V(`mousemove`,window,Q,!0),V(`mouseup`,window,je,!0),N=w.value,P=s?.value?window.innerWidth-e.clientX:e.clientX}function Q(e){if(!k)return;A!==void 0&&window.clearTimeout(A),M!==void 0&&window.clearTimeout(M);let{value:n}=y,{value:r}=g,{value:i}=z;if(n===null||r===null)return;let a=(s?.value?window.innerWidth-e.clientX-P:e.clientX-P)*(r-n)/(n-i),o=r-n,c=N+a;c=Math.min(o,c),c=Math.max(c,0);let{value:l}=U;if(l){l.scrollLeft=c*(s?.value?-1:1);let{internalOnUpdateScrollLeft:e}=t;e&&e(c)}}function je(e){e.preventDefault(),e.stopPropagation(),H(`mousemove`,window,Q,!0),H(`mouseup`,window,je,!0),k=!1,X(),Ae(e)&&Ce()}function Me(e){e.preventDefault(),e.stopPropagation(),D=!0,V(`mousemove`,window,$,!0),V(`mouseup`,window,Ne,!0),te=C.value,F=e.clientY}function $(e){if(!D)return;A!==void 0&&window.clearTimeout(A),M!==void 0&&window.clearTimeout(M);let{value:t}=v,{value:n}=h,{value:r}=L;if(t===null||n===null)return;let i=(e.clientY-F)*(n-t)/(t-r),a=n-t,o=te+i;o=Math.min(a,o),o=Math.max(o,0);let{value:s}=U;s&&(s.scrollTop=o)}function Ne(e){e.preventDefault(),e.stopPropagation(),H(`mousemove`,window,$,!0),H(`mouseup`,window,Ne,!0),D=!1,X(),Ae(e)&&Ce()}_(()=>{let{value:e}=de,{value:t}=ue,{value:r}=n,{value:i}=m,{value:a}=f;i&&(e?i.classList.remove(`${r}-scrollbar-rail--disabled`):i.classList.add(`${r}-scrollbar-rail--disabled`)),a&&(t?a.classList.remove(`${r}-scrollbar-rail--disabled`):a.classList.add(`${r}-scrollbar-rail--disabled`))}),ee(()=>{t.container||X()}),ne(()=>{A!==void 0&&window.clearTimeout(A),M!==void 0&&window.clearTimeout(M),H(`mousemove`,window,$,!0),H(`mouseup`,window,Ne,!0)});let Pe=e(()=>{let{common:{cubicBezierEaseInOut:e},self:{color:t,colorHover:n,height:r,width:i,borderRadius:a,railInsetHorizontalTop:c,railInsetHorizontalBottom:l,railInsetVerticalRight:u,railInsetVerticalLeft:d,railColor:f}}=I.value,{top:p,right:m,bottom:h,left:g}=o(c),{top:_,right:v,bottom:y,left:b}=o(l),{top:x,right:S,bottom:C,left:w}=o(s?.value?he(u):u),{top:T,right:E,bottom:D,left:O}=o(s?.value?he(d):d);return{"--n-scrollbar-bezier":e,"--n-scrollbar-color":t,"--n-scrollbar-color-hover":n,"--n-scrollbar-border-radius":a,"--n-scrollbar-width":i,"--n-scrollbar-height":r,"--n-scrollbar-rail-top-horizontal-top":p,"--n-scrollbar-rail-right-horizontal-top":m,"--n-scrollbar-rail-bottom-horizontal-top":h,"--n-scrollbar-rail-left-horizontal-top":g,"--n-scrollbar-rail-top-horizontal-bottom":_,"--n-scrollbar-rail-right-horizontal-bottom":v,"--n-scrollbar-rail-bottom-horizontal-bottom":y,"--n-scrollbar-rail-left-horizontal-bottom":b,"--n-scrollbar-rail-top-vertical-right":x,"--n-scrollbar-rail-right-vertical-right":S,"--n-scrollbar-rail-bottom-vertical-right":C,"--n-scrollbar-rail-left-vertical-right":w,"--n-scrollbar-rail-top-vertical-left":T,"--n-scrollbar-rail-right-vertical-left":E,"--n-scrollbar-rail-bottom-vertical-left":D,"--n-scrollbar-rail-left-vertical-left":O,"--n-scrollbar-rail-color":f}}),Fe=r?c(`scrollbar`,void 0,Pe,t):void 0;return{scrollTo:ye,scrollBy:Se,sync:X,syncUnifiedContainer:ke,handleMouseEnterWrapper:K,handleMouseLeaveWrapper:q,mergedClsPrefix:n,rtlEnabled:s,containerScrollTop:C,wrapperRef:l,containerRef:u,contentRef:d,yRailRef:f,xRailRef:m,needYBar:ue,needXBar:de,yBarSizePx:R,xBarSizePx:B,yBarTopPx:se,xBarLeftPx:le,isShowXBar:fe,isShowYBar:ge,isIos:re,handleScroll:Oe,handleContentResize:be,handleContainerResize:xe,handleYScrollMouseDown:Me,handleXScrollMouseDown:Z,containerWidth:y,cssVars:r?void 0:Pe,themeClass:Fe?.themeClass,onRender:Fe?.onRender}},render(){let{$slots:e,mergedClsPrefix:t,triggerDisplayManually:n,rtlEnabled:r,internalHoistYRail:i,yPlacement:a,xPlacement:o,xScrollable:s}=this;if(!this.scrollable)return e.default?.();let c=this.trigger===`none`,d=(e,n)=>(w(),F(`div`,{ref:`yRailRef`,class:l([`${t}-scrollbar-rail`,`${t}-scrollbar-rail--vertical`,`${t}-scrollbar-rail--vertical--${a}`,e]),"data-scrollbar-rail":!0,style:f([n||``,this.verticalRailStyle]),"aria-hidden":!0},[S(()=>E(c?ge:b,c?null:{name:`fade-in-transition`},{default:()=>this.needYBar&&this.isShowYBar&&!this.isIos?(w(),F(`div`,{key:1,class:l(`${t}-scrollbar-rail__scrollbar`),style:f({height:this.yBarSizePx,top:this.yBarTopPx}),onMousedown:this.handleYScrollMouseDown},null,46,st)):null}))],6)),p=()=>(this.onRender?.(),E(`div`,D(this.$attrs,{role:`none`,ref:`wrapperRef`,class:[`${t}-scrollbar`,this.themeClass,r&&`${t}-scrollbar--rtl`],style:this.cssVars,onMouseenter:n?void 0:this.handleMouseEnterWrapper,onMouseleave:n?void 0:this.handleMouseLeaveWrapper}),[this.container?e.default?.():(w(),F(`div`,{key:2,role:`none`,ref:`containerRef`,class:l([`${t}-scrollbar-container`,this.containerClass]),style:f([this.containerStyle,this.internalExposeWidthCssVar?{"--n-scrollbar-current-width":u(this.containerWidth)}:void 0]),onScroll:this.handleScroll,onWheel:this.onWheel},[(w(),I(ot,{onResize:this.handleContentResize},{default:()=>(w(),F(`div`,{ref:`contentRef`,role:`none`,style:f([{width:this.xScrollable?`fit-content`:null},this.contentStyle]),class:l([`${t}-scrollbar-content`,this.contentClass])},[S(()=>e.default?.())],6))},1032,[`onResize`]))],46,ct)),i?null:d(void 0,void 0),s&&(w(),F(`div`,{ref:`xRailRef`,class:l([`${t}-scrollbar-rail`,`${t}-scrollbar-rail--horizontal`,`${t}-scrollbar-rail--horizontal--${o}`]),style:f(this.horizontalRailStyle),"data-scrollbar-rail":!0,"aria-hidden":!0},[S(()=>E(c?ge:b,c?null:{name:`fade-in-transition`},{default:()=>this.needXBar&&this.isShowXBar&&!this.isIos?(w(),F(`div`,{key:3,class:l(`${t}-scrollbar-rail__scrollbar`),style:f({width:this.xBarSizePx,right:r?this.xBarLeftPx:void 0,left:r?void 0:this.xBarLeftPx}),onMousedown:this.handleXScrollMouseDown},null,46,lt)):null}))],6))])),m=this.container?p():(w(),I(ot,{key:4,onResize:this.handleContainerResize},{default:p},1032,[`onResize`]));return i?(w(),F(C,{key:5},[S(()=>m),S(()=>d(this.themeClass,this.cssVars))],64)):m}}),ft=dt,pt=g(`card-content`,`
 flex: 1;
 min-width: 0;
 box-sizing: border-box;
 padding: 0 var(--n-padding-left) var(--n-padding-bottom) var(--n-padding-left);
 font-size: var(--n-font-size);
`),mt=h([g(`card`,`
 font-size: var(--n-font-size);
 line-height: var(--n-line-height);
 display: flex;
 flex-direction: column;
 width: 100%;
 box-sizing: border-box;
 position: relative;
 border-radius: var(--n-border-radius);
 background-color: var(--n-color);
 color: var(--n-text-color);
 word-break: break-word;
 transition: 
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `,[m({background:`var(--n-color-modal)`}),d(`hoverable`,[h(`&:hover`,`box-shadow: var(--n-box-shadow);`)]),d(`content-segmented`,[h(`>`,[g(`card-content`,`
 padding-top: var(--n-padding-bottom);
 `),s(`content-scrollbar`,[h(`>`,[g(`scrollbar-container`,[h(`>`,[g(`card-content`,`
 padding-top: var(--n-padding-bottom);
 `)])])])])])]),d(`content-soft-segmented`,[h(`>`,[g(`card-content`,`
 margin: 0 var(--n-padding-left);
 padding: var(--n-padding-bottom) 0;
 `),s(`content-scrollbar`,[h(`>`,[g(`scrollbar-container`,[h(`>`,[g(`card-content`,`
 margin: 0 var(--n-padding-left);
 padding: var(--n-padding-bottom) 0;
 `)])])])])])]),d(`footer-segmented`,[h(`>`,[s(`footer`,`
 padding-top: var(--n-padding-bottom);
 `)])]),d(`footer-soft-segmented`,[h(`>`,[s(`footer`,`
 padding: var(--n-padding-bottom) 0;
 margin: 0 var(--n-padding-left);
 `)])]),h(`>`,[g(`card-header`,`
 box-sizing: border-box;
 display: flex;
 align-items: center;
 font-size: var(--n-title-font-size);
 padding:
 var(--n-padding-top)
 var(--n-padding-left)
 var(--n-padding-bottom)
 var(--n-padding-left);
 `,[s(`main`,`
 font-weight: var(--n-title-font-weight);
 transition: color .3s var(--n-bezier);
 flex: 1;
 min-width: 0;
 color: var(--n-title-text-color);
 `),s(`extra`,`
 display: flex;
 align-items: center;
 font-size: var(--n-font-size);
 font-weight: 400;
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
 `),s(`close`,`
 margin: 0 0 0 8px;
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 `)]),s(`action`,`
 box-sizing: border-box;
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 background-clip: padding-box;
 background-color: var(--n-action-color);
 `),pt,g(`card-content`,[h(`&:first-child`,`
 padding-top: var(--n-padding-bottom);
 `)]),s(`content-scrollbar`,`
 display: flex;
 flex-direction: column;
 `,[h(`>`,[g(`scrollbar-container`,[h(`>`,[pt])])]),h(`&:first-child >`,[g(`scrollbar-container`,[h(`>`,[g(`card-content`,`
 padding-top: var(--n-padding-bottom);
 `)])])])]),s(`footer`,`
 box-sizing: border-box;
 padding: 0 var(--n-padding-left) var(--n-padding-bottom) var(--n-padding-left);
 font-size: var(--n-font-size);
 `,[h(`&:first-child`,`
 padding-top: var(--n-padding-bottom);
 `)]),s(`action`,`
 background-color: var(--n-action-color);
 padding: var(--n-padding-bottom) var(--n-padding-left);
 border-bottom-left-radius: var(--n-border-radius);
 border-bottom-right-radius: var(--n-border-radius);
 `)]),g(`card-cover`,`
 overflow: hidden;
 width: 100%;
 border-radius: var(--n-border-radius) var(--n-border-radius) 0 0;
 `,[h(`img`,`
 display: block;
 width: 100%;
 `)]),d(`bordered`,`
 border: 1px solid var(--n-border-color);
 `,[h(`&:target`,`border-color: var(--n-color-target);`)]),d(`action-segmented`,[h(`>`,[s(`action`,[h(`&:not(:first-child)`,`
 border-top: 1px solid var(--n-border-color);
 `)])])]),d(`content-segmented, content-soft-segmented`,[h(`>`,[g(`card-content`,`
 transition: border-color 0.3s var(--n-bezier);
 `,[h(`&:not(:first-child)`,`
 border-top: 1px solid var(--n-border-color);
 `)]),s(`content-scrollbar`,`
 transition: border-color 0.3s var(--n-bezier);
 `,[h(`&:not(:first-child)`,`
 border-top: 1px solid var(--n-border-color);
 `)])])]),d(`footer-segmented, footer-soft-segmented`,[h(`>`,[s(`footer`,`
 transition: border-color 0.3s var(--n-bezier);
 `,[h(`&:not(:first-child)`,`
 border-top: 1px solid var(--n-border-color);
 `)])])]),d(`embedded`,`
 background-color: var(--n-color-embedded);
 `)]),r(g(`card`,`
 background: var(--n-color-modal);
 `,[d(`embedded`,`
 background-color: var(--n-color-embedded-modal);
 `)])),y(g(`card`,`
 background: var(--n-color-popover);
 `,[d(`embedded`,`
 background-color: var(--n-color-embedded-popover);
 `)]))]),ht={title:[String,Function],contentClass:String,contentStyle:[Object,String],contentScrollable:Boolean,headerClass:String,headerStyle:[Object,String],headerExtraClass:String,headerExtraStyle:[Object,String],footerClass:String,footerStyle:[Object,String],embedded:Boolean,segmented:{type:[Boolean,Object],default:!1},size:String,bordered:{type:Boolean,default:!0},closable:Boolean,hoverable:Boolean,role:String,onClose:[Function,Array],tag:{type:String,default:`div`},cover:Function,content:[String,Function],footer:Function,action:Function,headerExtra:Function,closeFocusable:Boolean};z(ht);var gt={...a.props,...ht},_t=N({name:`Card`,props:gt,slots:Object,setup(t){let r=()=>{let{onClose:e}=t;e&&n(e)},{inlineThemeDisabled:i,mergedClsPrefixRef:s,mergedRtlRef:l,mergedComponentPropsRef:u}=O(t),d=a(`Card`,`-card`,mt,te,t,s),f=ie(`Card`,l,s),p=e(()=>t.size||u?.value?.Card?.size||`medium`),m=e(()=>{let e=p.value,{self:{color:t,colorModal:n,colorTarget:r,textColor:i,titleTextColor:a,titleFontWeight:s,borderColor:c,actionColor:l,borderRadius:u,lineHeight:f,closeIconColor:m,closeIconColorHover:h,closeIconColorPressed:g,closeColorHover:_,closeColorPressed:v,closeBorderRadius:y,closeIconSize:b,closeSize:x,boxShadow:S,colorPopover:C,colorEmbedded:w,colorEmbeddedModal:T,colorEmbeddedPopover:E,[R(`padding`,e)]:D,[R(`fontSize`,e)]:O,[R(`titleFontSize`,e)]:k},common:{cubicBezierEaseInOut:ee}}=d.value,{top:A,left:j,bottom:M}=o(D);return{"--n-bezier":ee,"--n-border-radius":u,"--n-color":t,"--n-color-modal":n,"--n-color-popover":C,"--n-color-embedded":w,"--n-color-embedded-modal":T,"--n-color-embedded-popover":E,"--n-color-target":r,"--n-text-color":i,"--n-line-height":f,"--n-action-color":l,"--n-title-text-color":a,"--n-title-font-weight":s,"--n-close-icon-color":m,"--n-close-icon-color-hover":h,"--n-close-icon-color-pressed":g,"--n-close-color-hover":_,"--n-close-color-pressed":v,"--n-border-color":c,"--n-box-shadow":S,"--n-padding-top":A,"--n-padding-bottom":M,"--n-padding-left":j,"--n-font-size":O,"--n-title-font-size":k,"--n-close-size":x,"--n-close-icon-size":b,"--n-close-border-radius":y}}),h=i?c(`card`,e(()=>p.value[0]),m,t):void 0;return{rtlEnabled:f,mergedClsPrefix:s,mergedTheme:d,handleCloseClick:r,cssVars:i?void 0:m,themeClass:h?.themeClass,onRender:h?.onRender}},render(){let{segmented:e,bordered:t,hoverable:n,mergedClsPrefix:r,rtlEnabled:a,onRender:o,embedded:s,tag:c,$slots:u}=this;return o?.(),w(),I(c,{class:l([`${r}-card`,this.themeClass,s&&`${r}-card--embedded`,{[`${r}-card--rtl`]:a,[`${r}-card--content-scrollable`]:this.contentScrollable,[`${r}-card--content${typeof e!=`boolean`&&e.content===`soft`?`-soft`:``}-segmented`]:e===!0||e!==!1&&e.content,[`${r}-card--footer${typeof e!=`boolean`&&e.footer===`soft`?`-soft`:``}-segmented`]:e===!0||e!==!1&&e.footer,[`${r}-card--action-segmented`]:e===!0||e!==!1&&e.action,[`${r}-card--bordered`]:t,[`${r}-card--hoverable`]:n}]),style:f(this.cssVars),role:this.role},{default:i(()=>[S(()=>M(u.cover,e=>{let t=this.cover?v([this.cover()]):e;return t&&(w(),F(`div`,{class:l(`${r}-card-cover`),role:`none`},[S(()=>t)],2))})),S(()=>M(u.header,e=>{let{title:t}=this,n=t?v(typeof t==`function`?[t()]:[t]):e;return n||this.closable?(w(),F(`div`,{key:1,class:l([`${r}-card-header`,this.headerClass]),style:f(this.headerStyle),role:`heading`},[k(`div`,{class:l(`${r}-card-header__main`),role:`heading`},[S(()=>n)],2),S(()=>M(u[`header-extra`],e=>{let t=this.headerExtra?v([this.headerExtra()]):e;return t&&(w(),F(`div`,{class:l([`${r}-card-header__extra`,this.headerExtraClass]),style:f(this.headerExtraStyle)},[S(()=>t)],6))})),S(()=>this.closable&&(w(),I(L,{clsPrefix:r,class:l(`${r}-card-header__close`),onClick:this.handleCloseClick,focusable:this.closeFocusable,absolute:!0},null,8,[`clsPrefix`,`class`,`onClick`,`focusable`])))],6)):null})),S(()=>M(u.default,e=>{let{content:t}=this,n=t?v(typeof t==`function`?[t()]:[t]):e;return n?this.contentScrollable?(w(),I(dt,{key:2,class:l(`${r}-card__content-scrollbar`),contentClass:[`${r}-card-content`,this.contentClass],contentStyle:this.contentStyle},{default:()=>n},1032,[`class`,`contentClass`,`contentStyle`])):(w(),F(`div`,{key:3,class:l([`${r}-card-content`,this.contentClass]),style:f(this.contentStyle),role:`none`},[S(()=>n)],6)):null})),S(()=>M(u.footer,e=>{let t=this.footer?v([this.footer()]):e;return t&&(w(),F(`div`,{class:l([`${r}-card__footer`,this.footerClass]),style:f(this.footerStyle),role:`none`},[S(()=>t)],6))})),S(()=>M(u.action,e=>{let t=this.action?v([this.action()]):e;return t&&(w(),F(`div`,{class:l(`${r}-card__action`),role:`none`},[S(()=>t)],2))}))]),_:2},1032,[`class`,`style`,`role`])}});export{at as a,V as c,ot as i,ae as l,dt as n,ge as o,ft as r,H as s,_t as t};