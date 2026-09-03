import{At as e,Bn as t,Dr as n,Er as r,Et as i,Fn as a,Gn as o,Gt as s,Hn as c,It as l,Kt as u,Ln as d,Lt as f,Mr as p,Nn as m,Pn as h,Rn as g,Rr as _,Rt as v,St as y,Tt as b,Vn as x,Xn as S,Yt as C,Zt as w,_r as T,cr as E,en as D,er as O,fr as k,gr as A,hr as ee,ir as j,jt as M,lr as N,mr as te,nr as P,qt as ne,sr as F,tn as re,tr as ie,ut as ae,vr as I,xr as oe}from"./opensearch-BzfVJc20.js";function L(e){return Object.keys(e)}function se(e){return e.composedPath()[0]||null}function R(e){return e.composedPath()[0]}var ce={mousemoveoutside:new WeakMap,clickoutside:new WeakMap};function le(e,t,n){if(e===`mousemoveoutside`){let e=e=>{t.contains(R(e))||n(e)};return{mousemove:e,touchstart:e}}if(e===`clickoutside`){let e=!1,r=n=>{e=!t.contains(R(n))},i=r=>{e&&(t.contains(R(r))||n(r))};return{mousedown:r,mouseup:i,touchstart:r,touchend:i}}return console.error(`[evtd/create-trap-handler]: name \`${e}\` is invalid. This could be a bug of evtd.`),{}}function ue(e,t,n){let r=ce[e],i=r.get(t);i===void 0&&r.set(t,i=new WeakMap);let a=i.get(n);return a===void 0&&i.set(n,a=le(e,t,n)),a}function de(e,t,n,r){if(e===`mousemoveoutside`||e===`clickoutside`){let i=ue(e,t,n);return Object.keys(i).forEach(e=>{z(e,document,i[e],r)}),!0}return!1}function fe(e,t,n,r){if(e===`mousemoveoutside`||e===`clickoutside`){let i=ue(e,t,n);return Object.keys(i).forEach(e=>{B(e,document,i[e],r)}),!0}return!1}function pe(){if(typeof window>`u`)return{on:()=>{},off:()=>{}};let e=new WeakMap,t=new WeakMap;function n(){e.set(this,!0)}function r(){e.set(this,!0),t.set(this,!0)}function i(e,t,n){let r=e[t];return e[t]=function(){return n.apply(e,arguments),r.apply(e,arguments)},e}function a(e,t){e[t]=Event.prototype[t]}let o=new WeakMap,s=Object.getOwnPropertyDescriptor(Event.prototype,`currentTarget`);function c(){return o.get(this)??null}function l(e,t){s!==void 0&&Object.defineProperty(e,"currentTarget",{configurable:!0,enumerable:!0,get:t??s.get})}let u={bubble:{},capture:{}},d={};function f(){let s=function(s){let{type:d,eventPhase:f,bubbles:p}=s,m=R(s);if(f===2)return;let h=f===1?`capture`:`bubble`,g=m,_=[];for(;g===null&&(g=window),_.push(g),g!==window;)g=g.parentNode||null;let v=u.capture[d],y=u.bubble[d];if(i(s,`stopPropagation`,n),i(s,`stopImmediatePropagation`,r),l(s,c),h===`capture`){if(v===void 0)return;for(let n=_.length-1;n>=0&&!e.has(s);--n){let e=_[n],r=v.get(e);if(r!==void 0){o.set(s,e);for(let e of r){if(t.has(s))break;e(s)}}if(n===0&&!p&&y!==void 0){let n=y.get(e);if(n!==void 0)for(let e of n){if(t.has(s))break;e(s)}}}}else if(h===`bubble`){if(y===void 0)return;for(let n=0;n<_.length&&!e.has(s);++n){let e=_[n],r=y.get(e);if(r!==void 0){o.set(s,e);for(let e of r){if(t.has(s))break;e(s)}}}}a(s,`stopPropagation`),a(s,`stopImmediatePropagation`),l(s)};return s.displayName=`evtdUnifiedHandler`,s}function p(){let e=function(e){let{type:t,eventPhase:n}=e;if(n!==2)return;let r=d[t];r!==void 0&&r.forEach(t=>t(e))};return e.displayName=`evtdUnifiedWindowEventHandler`,e}let m=f(),h=p();function g(e,t){let n=u[e];return n[t]===void 0&&(n[t]=new Map,window.addEventListener(t,m,e===`capture`)),n[t]}function _(e){return d[e]===void 0&&(d[e]=new Set,window.addEventListener(e,h)),d[e]}function v(e,t){let n=e.get(t);return n===void 0&&e.set(t,n=new Set),n}function y(e,t,n,r){let i=u[t][n];if(i!==void 0){let t=i.get(e);if(t!==void 0&&t.has(r))return!0}return!1}function b(e,t){let n=d[e];return!!(n!==void 0&&n.has(t))}function x(e,t,n,r){let i;if(i=typeof r==`object`&&r.once===!0?a=>{S(e,t,i,r),n(a)}:n,de(e,t,i,r))return;let a=v(g(r===!0||typeof r==`object`&&r.capture===!0?`capture`:`bubble`,e),t);if(a.has(i)||a.add(i),t===window){let t=_(e);t.has(i)||t.add(i)}}function S(e,t,n,r){if(fe(e,t,n,r))return;let i=r===!0||typeof r==`object`&&r.capture===!0,a=i?`capture`:`bubble`,o=g(a,e),s=v(o,t);if(t===window&&!y(t,i?`bubble`:`capture`,e,n)&&b(e,n)){let t=d[e];t.delete(n),t.size===0&&(window.removeEventListener(e,h),d[e]=void 0)}s.has(n)&&s.delete(n),s.size===0&&o.delete(t),o.size===0&&(window.removeEventListener(e,m,a===`capture`),u[a][e]=void 0)}return{on:x,off:S}}var{on:z,off:B}=pe(),me=(typeof window>`u`?!1:/iPad|iPhone|iPod/.test(navigator.platform)||navigator.platform===`MacIntel`&&navigator.maxTouchPoints>1)&&!window.MSStream;function he(){return me}function ge(e){let t={isDeactivated:!1},n=!1;return te(()=>{if(t.isDeactivated=!1,!n){n=!0;return}e()}),A(()=>{t.isDeactivated=!0,n||=!0}),t}function _e(e){let{left:t,right:n,top:r,bottom:i}=u(e);return`${r} ${t} ${i} ${n}`}var V=F({render(){return this.$slots.default?.()}}),{cubicBezierEaseInOut:H}=D;function ve({name:e=`fade-in`,enterDuration:t=`0.2s`,leaveDuration:n=`0.2s`,enterCubicBezier:r=H,leaveCubicBezier:i=H}={}){return[h(`&.${e}-transition-enter-active`,{transition:`all ${t} ${r}!important`}),h(`&.${e}-transition-leave-active`,{transition:`all ${n} ${i}!important`}),h(`&.${e}-transition-enter-from, &.${e}-transition-leave-to`,{opacity:0}),h(`&.${e}-transition-leave-from, &.${e}-transition-enter-to`,{opacity:1})]}var ye=a(`scrollbar`,`
 overflow: hidden;
 position: relative;
 z-index: auto;
 height: 100%;
 width: 100%;
`,[h(`>`,[a(`scrollbar-container`,`
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
 `),h(`>`,[a(`scrollbar-content`,`
 box-sizing: border-box;
 min-width: 100%;
 `)])])]),h(`>, +`,[a(`scrollbar-rail`,`
 position: absolute;
 pointer-events: none;
 user-select: none;
 background: var(--n-scrollbar-rail-color);
 -webkit-user-select: none;
 `,[g(`horizontal`,`
 height: var(--n-scrollbar-height);
 `,[h(`>`,[d(`scrollbar`,`
 height: var(--n-scrollbar-height);
 border-radius: var(--n-scrollbar-border-radius);
 right: 0;
 `)])]),g(`horizontal--top`,`
 top: var(--n-scrollbar-rail-top-horizontal-top); 
 right: var(--n-scrollbar-rail-right-horizontal-top); 
 bottom: var(--n-scrollbar-rail-bottom-horizontal-top); 
 left: var(--n-scrollbar-rail-left-horizontal-top); 
 `),g(`horizontal--bottom`,`
 top: var(--n-scrollbar-rail-top-horizontal-bottom); 
 right: var(--n-scrollbar-rail-right-horizontal-bottom); 
 bottom: var(--n-scrollbar-rail-bottom-horizontal-bottom); 
 left: var(--n-scrollbar-rail-left-horizontal-bottom); 
 `),g(`vertical`,`
 width: var(--n-scrollbar-width);
 `,[h(`>`,[d(`scrollbar`,`
 width: var(--n-scrollbar-width);
 border-radius: var(--n-scrollbar-border-radius);
 bottom: 0;
 `)])]),g(`vertical--left`,`
 top: var(--n-scrollbar-rail-top-vertical-left); 
 right: var(--n-scrollbar-rail-right-vertical-left); 
 bottom: var(--n-scrollbar-rail-bottom-vertical-left); 
 left: var(--n-scrollbar-rail-left-vertical-left); 
 `),g(`vertical--right`,`
 top: var(--n-scrollbar-rail-top-vertical-right); 
 right: var(--n-scrollbar-rail-right-vertical-right); 
 bottom: var(--n-scrollbar-rail-bottom-vertical-right); 
 left: var(--n-scrollbar-rail-left-vertical-right); 
 `),g(`disabled`,[h(`>`,[d(`scrollbar`,`pointer-events: none;`)])]),h(`>`,[d(`scrollbar`,`
 z-index: 1;
 position: absolute;
 cursor: pointer;
 pointer-events: all;
 background-color: var(--n-scrollbar-color);
 transition: background-color .2s var(--n-scrollbar-bezier);
 `,[ve(),h(`&:hover`,`background-color: var(--n-scrollbar-color-hover);`)])])])])]);function U(e,t){console.error(`[vueuc/${e}]: ${t}`)}var W=[],be=function(){return W.some(function(e){return e.activeTargets.length>0})},xe=function(){return W.some(function(e){return e.skippedTargets.length>0})},Se=`ResizeObserver loop completed with undelivered notifications.`,G=function(){var e;typeof ErrorEvent==`function`?e=new ErrorEvent(`error`,{message:Se}):(e=document.createEvent(`Event`),e.initEvent(`error`,!1,!1),e.message=Se),window.dispatchEvent(e)},K;(function(e){e.BORDER_BOX=`border-box`,e.CONTENT_BOX=`content-box`,e.DEVICE_PIXEL_CONTENT_BOX=`device-pixel-content-box`})(K||={});var q=function(e){return Object.freeze(e)},Ce=function(){function e(e,t){this.inlineSize=e,this.blockSize=t,q(this)}return e}(),we=function(){function e(e,t,n,r){return this.x=e,this.y=t,this.width=n,this.height=r,this.top=this.y,this.left=this.x,this.bottom=this.top+this.height,this.right=this.left+this.width,q(this)}return e.prototype.toJSON=function(){var e=this;return{x:e.x,y:e.y,top:e.top,right:e.right,bottom:e.bottom,left:e.left,width:e.width,height:e.height}},e.fromRect=function(t){return new e(t.x,t.y,t.width,t.height)},e}(),Te=function(e){return e instanceof SVGElement&&`getBBox`in e},Ee=function(e){if(Te(e)){var t=e.getBBox(),n=t.width,r=t.height;return!n&&!r}var i=e,a=i.offsetWidth,o=i.offsetHeight;return!(a||o||e.getClientRects().length)},De=function(e){if(e instanceof Element)return!0;var t=e?.ownerDocument?.defaultView;return!!(t&&e instanceof t.Element)},Oe=function(e){switch(e.tagName){case`INPUT`:if(e.type!==`image`)break;case`VIDEO`:case`AUDIO`:case`EMBED`:case`OBJECT`:case`CANVAS`:case`IFRAME`:case`IMG`:return!0}return!1},J=typeof window<`u`?window:{},Y=new WeakMap,ke=/auto|scroll/,X=/^tb|vertical/,Ae=/msie|trident/i.test(J.navigator&&J.navigator.userAgent),Z=function(e){return parseFloat(e||`0`)},Q=function(e,t,n){return e===void 0&&(e=0),t===void 0&&(t=0),n===void 0&&(n=!1),new Ce((n?t:e)||0,(n?e:t)||0)},je=q({devicePixelContentBoxSize:Q(),borderBoxSize:Q(),contentBoxSize:Q(),contentRect:new we(0,0,0,0)}),Me=function(e,t){if(t===void 0&&(t=!1),Y.has(e)&&!t)return Y.get(e);if(Ee(e))return Y.set(e,je),je;var n=getComputedStyle(e),r=Te(e)&&e.ownerSVGElement&&e.getBBox(),i=!Ae&&n.boxSizing===`border-box`,a=X.test(n.writingMode||``),o=!r&&ke.test(n.overflowY||``),s=!r&&ke.test(n.overflowX||``),c=r?0:Z(n.paddingTop),l=r?0:Z(n.paddingRight),u=r?0:Z(n.paddingBottom),d=r?0:Z(n.paddingLeft),f=r?0:Z(n.borderTopWidth),p=r?0:Z(n.borderRightWidth),m=r?0:Z(n.borderBottomWidth),h=r?0:Z(n.borderLeftWidth),g=d+l,_=c+u,v=h+p,y=f+m,b=s?e.offsetHeight-y-e.clientHeight:0,x=o?e.offsetWidth-v-e.clientWidth:0,S=i?g+v:0,C=i?_+y:0,w=r?r.width:Z(n.width)-S-x,T=r?r.height:Z(n.height)-C-b,E=w+g+x+v,D=T+_+b+y,O=q({devicePixelContentBoxSize:Q(Math.round(w*devicePixelRatio),Math.round(T*devicePixelRatio),a),borderBoxSize:Q(E,D,a),contentBoxSize:Q(w,T,a),contentRect:new we(d,c,w,T)});return Y.set(e,O),O},$=function(e,t,n){var r=Me(e,n),i=r.borderBoxSize,a=r.contentBoxSize,o=r.devicePixelContentBoxSize;switch(t){case K.DEVICE_PIXEL_CONTENT_BOX:return o;case K.BORDER_BOX:return i;default:return a}},Ne=function(){function e(e){var t=Me(e);this.target=e,this.contentRect=t.contentRect,this.borderBoxSize=q([t.borderBoxSize]),this.contentBoxSize=q([t.contentBoxSize]),this.devicePixelContentBoxSize=q([t.devicePixelContentBoxSize])}return e}(),Pe=function(e){if(Ee(e))return 1/0;for(var t=0,n=e.parentNode;n;)t+=1,n=n.parentNode;return t},Fe=function(){var e=1/0,t=[];W.forEach(function(n){if(n.activeTargets.length!==0){var r=[];n.activeTargets.forEach(function(t){var n=new Ne(t.target),i=Pe(t.target);r.push(n),t.lastReportedSize=$(t.target,t.observedBox),i<e&&(e=i)}),t.push(function(){n.callback.call(n.observer,r,n.observer)}),n.activeTargets.splice(0,n.activeTargets.length)}});for(var n=0,r=t;n<r.length;n++){var i=r[n];i()}return e},Ie=function(e){W.forEach(function(t){t.activeTargets.splice(0,t.activeTargets.length),t.skippedTargets.splice(0,t.skippedTargets.length),t.observationTargets.forEach(function(n){n.isActive()&&(Pe(n.target)>e?t.activeTargets.push(n):t.skippedTargets.push(n))})})},Le=function(){var e=0;for(Ie(e);be();)e=Fe(),Ie(e);return xe()&&G(),e>0},Re,ze=[],Be=function(){return ze.splice(0).forEach(function(e){return e()})},Ve=function(e){if(!Re){var t=0,n=document.createTextNode(``);new MutationObserver(function(){return Be()}).observe(n,{characterData:!0}),Re=function(){n.textContent=`${t?t--:t++}`}}ze.push(e),Re()},He=function(e){Ve(function(){requestAnimationFrame(e)})},Ue=0,We=function(){return!!Ue},Ge=250,Ke={attributes:!0,characterData:!0,childList:!0,subtree:!0},qe=[`resize`,`load`,`transitionend`,`animationend`,`animationstart`,`animationiteration`,`keyup`,`keydown`,`mouseup`,`mousedown`,`mouseover`,`mouseout`,`blur`,`focus`],Je=function(e){return e===void 0&&(e=0),Date.now()+e},Ye=!1,Xe=new(function(){function e(){var e=this;this.stopped=!0,this.listener=function(){return e.schedule()}}return e.prototype.run=function(e){var t=this;if(e===void 0&&(e=Ge),!Ye){Ye=!0;var n=Je(e);He(function(){var r=!1;try{r=Le()}finally{if(Ye=!1,e=n-Je(),!We())return;r?t.run(1e3):e>0?t.run(e):t.start()}})}},e.prototype.schedule=function(){this.stop(),this.run()},e.prototype.observe=function(){var e=this,t=function(){return e.observer&&e.observer.observe(document.body,Ke)};document.body?t():J.addEventListener(`DOMContentLoaded`,t)},e.prototype.start=function(){var e=this;this.stopped&&(this.stopped=!1,this.observer=new MutationObserver(this.listener),this.observe(),qe.forEach(function(t){return J.addEventListener(t,e.listener,!0)}))},e.prototype.stop=function(){var e=this;this.stopped||=(this.observer&&this.observer.disconnect(),qe.forEach(function(t){return J.removeEventListener(t,e.listener,!0)}),!0)},e}()),Ze=function(e){!Ue&&e>0&&Xe.start(),Ue+=e,!Ue&&Xe.stop()},Qe=function(e){return!Te(e)&&!Oe(e)&&getComputedStyle(e).display===`inline`},$e=function(){function e(e,t){this.target=e,this.observedBox=t||K.CONTENT_BOX,this.lastReportedSize={inlineSize:0,blockSize:0}}return e.prototype.isActive=function(){var e=$(this.target,this.observedBox,!0);return Qe(this.target)&&(this.lastReportedSize=e),this.lastReportedSize.inlineSize!==e.inlineSize||this.lastReportedSize.blockSize!==e.blockSize},e}(),et=function(){function e(e,t){this.activeTargets=[],this.skippedTargets=[],this.observationTargets=[],this.observer=e,this.callback=t}return e}(),tt=new WeakMap,nt=function(e,t){for(var n=0;n<e.length;n+=1)if(e[n].target===t)return n;return-1},rt=function(){function e(){}return e.connect=function(e,t){var n=new et(e,t);tt.set(e,n)},e.observe=function(e,t,n){var r=tt.get(e),i=r.observationTargets.length===0;nt(r.observationTargets,t)<0&&(i&&W.push(r),r.observationTargets.push(new $e(t,n&&n.box)),Ze(1),Xe.schedule())},e.unobserve=function(e,t){var n=tt.get(e),r=nt(n.observationTargets,t),i=n.observationTargets.length===1;r>=0&&(i&&W.splice(W.indexOf(n),1),n.observationTargets.splice(r,1),Ze(-1))},e.disconnect=function(e){var t=this,n=tt.get(e);n.observationTargets.slice().forEach(function(n){return t.unobserve(e,n.target)}),n.activeTargets.splice(0,n.activeTargets.length)},e}(),it=function(){function e(e){if(arguments.length===0)throw TypeError(`Failed to construct 'ResizeObserver': 1 argument required, but only 0 present.`);if(typeof e!=`function`)throw TypeError(`Failed to construct 'ResizeObserver': The callback provided as parameter 1 is not a function.`);rt.connect(this,e)}return e.prototype.observe=function(e,t){if(arguments.length===0)throw TypeError(`Failed to execute 'observe' on 'ResizeObserver': 1 argument required, but only 0 present.`);if(!De(e))throw TypeError(`Failed to execute 'observe' on 'ResizeObserver': parameter 1 is not of type 'Element`);rt.observe(this,e,t)},e.prototype.unobserve=function(e){if(arguments.length===0)throw TypeError(`Failed to execute 'unobserve' on 'ResizeObserver': 1 argument required, but only 0 present.`);if(!De(e))throw TypeError(`Failed to execute 'unobserve' on 'ResizeObserver': parameter 1 is not of type 'Element`);rt.unobserve(this,e)},e.prototype.disconnect=function(){rt.disconnect(this)},e.toString=function(){return`function ResizeObserver () { [polyfill code] }`},e}(),at=new class{constructor(){this.handleResize=this.handleResize.bind(this),this.observer=new(typeof window<`u`&&window.ResizeObserver||it)(this.handleResize),this.elHandlersMap=new Map}handleResize(e){for(let t of e){let e=this.elHandlersMap.get(t.target);e!==void 0&&e(t)}}registerHandler(e,t){this.elHandlersMap.set(e,t),this.observer.observe(e)}unregisterHandler(e){this.elHandlersMap.has(e)&&(this.elHandlersMap.delete(e),this.observer.unobserve(e))}},ot=F({name:`ResizeObserver`,props:{onResize:Function},setup(e){let t=!1,n=E().proxy;function r(t){let{onResize:n}=e;n!==void 0&&n(t)}T(()=>{let e=n.$el;if(e===void 0){U(`resize-observer`,`$el does not exist.`);return}if(e.nextElementSibling!==e.nextSibling&&e.nodeType===3&&e.nodeValue!==``){U(`resize-observer`,`$el can not be observed (it may be a text node).`);return}e.nextElementSibling!==null&&(at.registerHandler(e.nextElementSibling,r),t=!0)}),ee(()=>{t&&at.unregisterHandler(n.$el.nextElementSibling)})},render(){return oe(this.$slots,`default`)}}),st=[`onMousedown`],ct=[`onScroll`,`onWheel`],lt=[`onMousedown`],ut={...l.props,duration:{type:Number,default:0},scrollable:{type:Boolean,default:!0},xScrollable:Boolean,trigger:{type:String,default:`hover`},useUnifiedContainer:Boolean,triggerDisplayManually:Boolean,container:Function,content:Function,containerClass:String,containerStyle:[String,Object],contentClass:[String,Array],contentStyle:[String,Object],horizontalRailStyle:[String,Object],verticalRailStyle:[String,Object],onScroll:Function,onWheel:Function,onResize:Function,internalOnUpdateScrollLeft:Function,internalHoistYRail:Boolean,internalExposeWidthCssVar:Boolean,yPlacement:{type:String,default:`right`},xPlacement:{type:String,default:`bottom`}},dt=F({name:`Scrollbar`,props:ut,inheritAttrs:!1,setup(e){let{mergedClsPrefixRef:t,inlineThemeDisabled:n,mergedRtlRef:i}=re(e),a=b(`Scrollbar`,i,t),o=p(null),c=p(null),d=p(null),m=p(null),h=p(null),g=p(null),_=p(null),y=p(null),x=p(null),S=p(null),C=p(null),w=p(0),E=p(0),D=p(!1),k=p(!1),A=!1,j=!1,M,N,te=0,P=0,ne=0,F=0,ie=he(),ae=l(`Scrollbar`,`-scrollbar`,ye,v,e,t),I=O(()=>{let{value:e}=y,{value:t}=g,{value:n}=S;return e===null||t===null||n===null?0:Math.min(e,n*e/t+s(ae.value.self.width)*1.5)}),oe=O(()=>`${I.value}px`),L=O(()=>{let{value:e}=x,{value:t}=_,{value:n}=C;return e===null||t===null||n===null?0:n*e/t+s(ae.value.self.height)*1.5}),R=O(()=>`${L.value}px`),ce=O(()=>{let{value:e}=y,{value:t}=w,{value:n}=g,{value:r}=S;if(e===null||n===null||r===null)return 0;{let i=n-e;return i?t/i*(r-I.value):0}}),le=O(()=>`${ce.value}px`),ue=O(()=>{let{value:e}=x,{value:t}=E,{value:n}=_,{value:r}=C;if(e===null||n===null||r===null)return 0;{let i=n-e;return i?t/i*(r-L.value):0}}),de=O(()=>`${ue.value}px`),fe=O(()=>{let{value:e}=y,{value:t}=g;return e!==null&&t!==null&&t>e}),pe=O(()=>{let{value:e}=x,{value:t}=_;return e!==null&&t!==null&&t>e}),me=O(()=>{let{trigger:t}=e;return t===`none`||D.value}),V=O(()=>{let{trigger:t}=e;return t===`none`||k.value}),H=O(()=>{let{container:t}=e;return t?t():c.value}),ve=O(()=>{let{content:t}=e;return t?t():d.value}),U=(t,n)=>{if(!e.scrollable)return;if(typeof t==`number`){G(t,n??0,0,!1,`auto`);return}let{left:r,top:i,index:a,elSize:o,position:s,behavior:c,el:l,debounce:u=!0}=t;(r!==void 0||i!==void 0)&&G(r??0,i??0,0,!1,c),l===void 0?a!==void 0&&o!==void 0?G(0,a*o,o,u,c):s===`bottom`?G(0,2**53-1,0,!1,c):s===`top`&&G(0,0,0,!1,c):G(0,l.offsetTop,l.offsetHeight,u,c)},W=ge(()=>{e.container||U({top:w.value,left:E.value})}),be=()=>{W.isDeactivated||X()},xe=t=>{if(W.isDeactivated)return;let{onResize:n}=e;n&&n(t),X()},Se=(t,n)=>{if(!e.scrollable)return;let{value:r}=H;r&&(typeof t==`object`?r.scrollBy(t):r.scrollBy(t,n||0))};function G(e,t,n,r,i){let{value:a}=H;if(a){if(r){let{scrollTop:r,offsetHeight:o}=a;if(t>r){t+n<=r+o||a.scrollTo({left:e,top:t+n-o,behavior:i});return}}a.scrollTo({left:e,top:t,behavior:i})}}function K(){Ee(),De(),X()}function q(){Ce()}function Ce(){we(),Te()}function we(){N!==void 0&&window.clearTimeout(N),N=window.setTimeout(()=>{k.value=!1},e.duration)}function Te(){M!==void 0&&window.clearTimeout(M),M=window.setTimeout(()=>{D.value=!1},e.duration)}function Ee(){M!==void 0&&window.clearTimeout(M),D.value=!0}function De(){N!==void 0&&window.clearTimeout(N),k.value=!0}function Oe(t){let{onScroll:n}=e;n&&n(t),J()}function J(){let{value:e}=H;e&&(w.value=e.scrollTop,E.value=e.scrollLeft*(a?.value?-1:1))}function Y(){let{value:e}=ve;e&&(g.value=e.offsetHeight,_.value=e.offsetWidth);let{value:t}=H;t&&(y.value=t.offsetHeight,x.value=t.offsetWidth);let{value:n}=h,{value:r}=m;n&&(C.value=n.offsetWidth),r&&(S.value=r.offsetHeight)}function ke(){let{value:e}=H;e&&(w.value=e.scrollTop,E.value=e.scrollLeft*(a?.value?-1:1),y.value=e.offsetHeight,x.value=e.offsetWidth,g.value=e.scrollHeight,_.value=e.scrollWidth);let{value:t}=h,{value:n}=m;t&&(C.value=t.offsetWidth),n&&(S.value=n.offsetHeight)}function X(){e.scrollable&&(e.useUnifiedContainer?ke():(Y(),J()))}function Ae(e){return!o.value?.contains(se(e))}function Z(e){e.preventDefault(),e.stopPropagation(),j=!0,z(`mousemove`,window,Q,!0),z(`mouseup`,window,je,!0),P=E.value,ne=a?.value?window.innerWidth-e.clientX:e.clientX}function Q(t){if(!j)return;M!==void 0&&window.clearTimeout(M),N!==void 0&&window.clearTimeout(N);let{value:n}=x,{value:r}=_,{value:i}=L;if(n===null||r===null)return;let o=(a?.value?window.innerWidth-t.clientX-ne:t.clientX-ne)*(r-n)/(n-i),s=r-n,c=P+o;c=Math.min(s,c),c=Math.max(c,0);let{value:l}=H;if(l){l.scrollLeft=c*(a?.value?-1:1);let{internalOnUpdateScrollLeft:t}=e;t&&t(c)}}function je(e){e.preventDefault(),e.stopPropagation(),B(`mousemove`,window,Q,!0),B(`mouseup`,window,je,!0),j=!1,X(),Ae(e)&&Ce()}function Me(e){e.preventDefault(),e.stopPropagation(),A=!0,z(`mousemove`,window,$,!0),z(`mouseup`,window,Ne,!0),te=w.value,F=e.clientY}function $(e){if(!A)return;M!==void 0&&window.clearTimeout(M),N!==void 0&&window.clearTimeout(N);let{value:t}=y,{value:n}=g,{value:r}=I;if(t===null||n===null)return;let i=(e.clientY-F)*(n-t)/(t-r),a=n-t,o=te+i;o=Math.min(a,o),o=Math.max(o,0);let{value:s}=H;s&&(s.scrollTop=o)}function Ne(e){e.preventDefault(),e.stopPropagation(),B(`mousemove`,window,$,!0),B(`mouseup`,window,Ne,!0),A=!1,X(),Ae(e)&&Ce()}r(()=>{let{value:e}=pe,{value:n}=fe,{value:r}=t,{value:i}=h,{value:a}=m;i&&(e?i.classList.remove(`${r}-scrollbar-rail--disabled`):i.classList.add(`${r}-scrollbar-rail--disabled`)),a&&(n?a.classList.remove(`${r}-scrollbar-rail--disabled`):a.classList.add(`${r}-scrollbar-rail--disabled`))}),T(()=>{e.container||X()}),ee(()=>{M!==void 0&&window.clearTimeout(M),N!==void 0&&window.clearTimeout(N),B(`mousemove`,window,$,!0),B(`mouseup`,window,Ne,!0)});let Pe=O(()=>{let{common:{cubicBezierEaseInOut:e},self:{color:t,colorHover:n,height:r,width:i,borderRadius:o,railInsetHorizontalTop:s,railInsetHorizontalBottom:c,railInsetVerticalRight:l,railInsetVerticalLeft:d,railColor:f}}=ae.value,{top:p,right:m,bottom:h,left:g}=u(s),{top:_,right:v,bottom:y,left:b}=u(c),{top:x,right:S,bottom:C,left:w}=u(a?.value?_e(l):l),{top:T,right:E,bottom:D,left:O}=u(a?.value?_e(d):d);return{"--n-scrollbar-bezier":e,"--n-scrollbar-color":t,"--n-scrollbar-color-hover":n,"--n-scrollbar-border-radius":o,"--n-scrollbar-width":i,"--n-scrollbar-height":r,"--n-scrollbar-rail-top-horizontal-top":p,"--n-scrollbar-rail-right-horizontal-top":m,"--n-scrollbar-rail-bottom-horizontal-top":h,"--n-scrollbar-rail-left-horizontal-top":g,"--n-scrollbar-rail-top-horizontal-bottom":_,"--n-scrollbar-rail-right-horizontal-bottom":v,"--n-scrollbar-rail-bottom-horizontal-bottom":y,"--n-scrollbar-rail-left-horizontal-bottom":b,"--n-scrollbar-rail-top-vertical-right":x,"--n-scrollbar-rail-right-vertical-right":S,"--n-scrollbar-rail-bottom-vertical-right":C,"--n-scrollbar-rail-left-vertical-right":w,"--n-scrollbar-rail-top-vertical-left":T,"--n-scrollbar-rail-right-vertical-left":E,"--n-scrollbar-rail-bottom-vertical-left":D,"--n-scrollbar-rail-left-vertical-left":O,"--n-scrollbar-rail-color":f}}),Fe=n?f(`scrollbar`,void 0,Pe,e):void 0;return{scrollTo:U,scrollBy:Se,sync:X,syncUnifiedContainer:ke,handleMouseEnterWrapper:K,handleMouseLeaveWrapper:q,mergedClsPrefix:t,rtlEnabled:a,containerScrollTop:w,wrapperRef:o,containerRef:c,contentRef:d,yRailRef:m,xRailRef:h,needYBar:fe,needXBar:pe,yBarSizePx:oe,xBarSizePx:R,yBarTopPx:le,xBarLeftPx:de,isShowXBar:me,isShowYBar:V,isIos:ie,handleScroll:Oe,handleContentResize:be,handleContainerResize:xe,handleYScrollMouseDown:Me,handleXScrollMouseDown:Z,containerWidth:x,cssVars:n?void 0:Pe,themeClass:Fe?.themeClass,onRender:Fe?.onRender}},render(){let{$slots:e,mergedClsPrefix:t,triggerDisplayManually:n,rtlEnabled:r,internalHoistYRail:i,yPlacement:a,xPlacement:s,xScrollable:c}=this;if(!this.scrollable)return e.default?.();let l=this.trigger===`none`,u=(e,n)=>(I(),j(`div`,{ref:`yRailRef`,class:C([`${t}-scrollbar-rail`,`${t}-scrollbar-rail--vertical`,`${t}-scrollbar-rail--vertical--${a}`,e]),"data-scrollbar-rail":!0,style:_([n||``,this.verticalRailStyle]),"aria-hidden":!0},[w(()=>N(l?V:o,l?null:{name:`fade-in-transition`},{default:()=>this.needYBar&&this.isShowYBar&&!this.isIos?(I(),j(`div`,{key:1,class:C(`${t}-scrollbar-rail__scrollbar`),style:_({height:this.yBarSizePx,top:this.yBarTopPx}),onMousedown:this.handleYScrollMouseDown},null,46,st)):null}))],6)),d=()=>(this.onRender?.(),N(`div`,k(this.$attrs,{role:`none`,ref:`wrapperRef`,class:[`${t}-scrollbar`,this.themeClass,r&&`${t}-scrollbar--rtl`],style:this.cssVars,onMouseenter:n?void 0:this.handleMouseEnterWrapper,onMouseleave:n?void 0:this.handleMouseLeaveWrapper}),[this.container?e.default?.():(I(),j(`div`,{key:2,role:`none`,ref:`containerRef`,class:C([`${t}-scrollbar-container`,this.containerClass]),style:_([this.containerStyle,this.internalExposeWidthCssVar?{"--n-scrollbar-current-width":ne(this.containerWidth)}:void 0]),onScroll:this.handleScroll,onWheel:this.onWheel},[(I(),P(ot,{onResize:this.handleContentResize},{default:()=>(I(),j(`div`,{ref:`contentRef`,role:`none`,style:_([{width:this.xScrollable?`fit-content`:null},this.contentStyle]),class:C([`${t}-scrollbar-content`,this.contentClass])},[w(()=>e.default?.())],6))},1032,[`onResize`]))],46,ct)),i?null:u(void 0,void 0),c&&(I(),j(`div`,{ref:`xRailRef`,class:C([`${t}-scrollbar-rail`,`${t}-scrollbar-rail--horizontal`,`${t}-scrollbar-rail--horizontal--${s}`]),style:_(this.horizontalRailStyle),"data-scrollbar-rail":!0,"aria-hidden":!0},[w(()=>N(l?V:o,l?null:{name:`fade-in-transition`},{default:()=>this.needXBar&&this.isShowXBar&&!this.isIos?(I(),j(`div`,{key:3,class:C(`${t}-scrollbar-rail__scrollbar`),style:_({width:this.xBarSizePx,right:r?this.xBarLeftPx:void 0,left:r?void 0:this.xBarLeftPx}),onMousedown:this.handleXScrollMouseDown},null,46,lt)):null}))],6))])),f=this.container?d():(I(),P(ot,{key:4,onResize:this.handleContainerResize},{default:d},1032,[`onResize`]));return i?(I(),j(S,{key:5},[w(()=>f),w(()=>u(this.themeClass,this.cssVars))],64)):f}}),ft=dt,pt=a(`card-content`,`
 flex: 1;
 min-width: 0;
 box-sizing: border-box;
 padding: 0 var(--n-padding-left) var(--n-padding-bottom) var(--n-padding-left);
 font-size: var(--n-font-size);
`),mt=h([a(`card`,`
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
 `,[m({background:`var(--n-color-modal)`}),g(`hoverable`,[h(`&:hover`,`box-shadow: var(--n-box-shadow);`)]),g(`content-segmented`,[h(`>`,[a(`card-content`,`
 padding-top: var(--n-padding-bottom);
 `),d(`content-scrollbar`,[h(`>`,[a(`scrollbar-container`,[h(`>`,[a(`card-content`,`
 padding-top: var(--n-padding-bottom);
 `)])])])])])]),g(`content-soft-segmented`,[h(`>`,[a(`card-content`,`
 margin: 0 var(--n-padding-left);
 padding: var(--n-padding-bottom) 0;
 `),d(`content-scrollbar`,[h(`>`,[a(`scrollbar-container`,[h(`>`,[a(`card-content`,`
 margin: 0 var(--n-padding-left);
 padding: var(--n-padding-bottom) 0;
 `)])])])])])]),g(`footer-segmented`,[h(`>`,[d(`footer`,`
 padding-top: var(--n-padding-bottom);
 `)])]),g(`footer-soft-segmented`,[h(`>`,[d(`footer`,`
 padding: var(--n-padding-bottom) 0;
 margin: 0 var(--n-padding-left);
 `)])]),h(`>`,[a(`card-header`,`
 box-sizing: border-box;
 display: flex;
 align-items: center;
 font-size: var(--n-title-font-size);
 padding:
 var(--n-padding-top)
 var(--n-padding-left)
 var(--n-padding-bottom)
 var(--n-padding-left);
 `,[d(`main`,`
 font-weight: var(--n-title-font-weight);
 transition: color .3s var(--n-bezier);
 flex: 1;
 min-width: 0;
 color: var(--n-title-text-color);
 `),d(`extra`,`
 display: flex;
 align-items: center;
 font-size: var(--n-font-size);
 font-weight: 400;
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
 `),d(`close`,`
 margin: 0 0 0 8px;
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 `)]),d(`action`,`
 box-sizing: border-box;
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 background-clip: padding-box;
 background-color: var(--n-action-color);
 `),pt,a(`card-content`,[h(`&:first-child`,`
 padding-top: var(--n-padding-bottom);
 `)]),d(`content-scrollbar`,`
 display: flex;
 flex-direction: column;
 `,[h(`>`,[a(`scrollbar-container`,[h(`>`,[pt])])]),h(`&:first-child >`,[a(`scrollbar-container`,[h(`>`,[a(`card-content`,`
 padding-top: var(--n-padding-bottom);
 `)])])])]),d(`footer`,`
 box-sizing: border-box;
 padding: 0 var(--n-padding-left) var(--n-padding-bottom) var(--n-padding-left);
 font-size: var(--n-font-size);
 `,[h(`&:first-child`,`
 padding-top: var(--n-padding-bottom);
 `)]),d(`action`,`
 background-color: var(--n-action-color);
 padding: var(--n-padding-bottom) var(--n-padding-left);
 border-bottom-left-radius: var(--n-border-radius);
 border-bottom-right-radius: var(--n-border-radius);
 `)]),a(`card-cover`,`
 overflow: hidden;
 width: 100%;
 border-radius: var(--n-border-radius) var(--n-border-radius) 0 0;
 `,[h(`img`,`
 display: block;
 width: 100%;
 `)]),g(`bordered`,`
 border: 1px solid var(--n-border-color);
 `,[h(`&:target`,`border-color: var(--n-color-target);`)]),g(`action-segmented`,[h(`>`,[d(`action`,[h(`&:not(:first-child)`,`
 border-top: 1px solid var(--n-border-color);
 `)])])]),g(`content-segmented, content-soft-segmented`,[h(`>`,[a(`card-content`,`
 transition: border-color 0.3s var(--n-bezier);
 `,[h(`&:not(:first-child)`,`
 border-top: 1px solid var(--n-border-color);
 `)]),d(`content-scrollbar`,`
 transition: border-color 0.3s var(--n-bezier);
 `,[h(`&:not(:first-child)`,`
 border-top: 1px solid var(--n-border-color);
 `)])])]),g(`footer-segmented, footer-soft-segmented`,[h(`>`,[d(`footer`,`
 transition: border-color 0.3s var(--n-bezier);
 `,[h(`&:not(:first-child)`,`
 border-top: 1px solid var(--n-border-color);
 `)])])]),g(`embedded`,`
 background-color: var(--n-color-embedded);
 `)]),x(a(`card`,`
 background: var(--n-color-modal);
 `,[g(`embedded`,`
 background-color: var(--n-color-embedded-modal);
 `)])),c(a(`card`,`
 background: var(--n-color-popover);
 `,[g(`embedded`,`
 background-color: var(--n-color-embedded-popover);
 `)]))]),ht={title:[String,Function],contentClass:String,contentStyle:[Object,String],contentScrollable:Boolean,headerClass:String,headerStyle:[Object,String],headerExtraClass:String,headerExtraStyle:[Object,String],footerClass:String,footerStyle:[Object,String],embedded:Boolean,segmented:{type:[Boolean,Object],default:!1},size:String,bordered:{type:Boolean,default:!0},closable:Boolean,hoverable:Boolean,role:String,onClose:[Function,Array],tag:{type:String,default:`div`},cover:Function,content:[String,Function],footer:Function,action:Function,headerExtra:Function,closeFocusable:Boolean};L(ht);var gt={...l.props,...ht},_t=F({name:`Card`,props:gt,slots:Object,setup(e){let n=()=>{let{onClose:t}=e;t&&M(t)},{inlineThemeDisabled:r,mergedClsPrefixRef:i,mergedRtlRef:a,mergedComponentPropsRef:o}=re(e),s=l(`Card`,`-card`,mt,ae,e,i),c=b(`Card`,a,i),d=O(()=>e.size||o?.value?.Card?.size||`medium`),p=O(()=>{let e=d.value,{self:{color:n,colorModal:r,colorTarget:i,textColor:a,titleTextColor:o,titleFontWeight:c,borderColor:l,actionColor:f,borderRadius:p,lineHeight:m,closeIconColor:h,closeIconColorHover:g,closeIconColorPressed:_,closeColorHover:v,closeColorPressed:y,closeBorderRadius:b,closeIconSize:x,closeSize:S,boxShadow:C,colorPopover:w,colorEmbedded:T,colorEmbeddedModal:E,colorEmbeddedPopover:D,[t(`padding`,e)]:O,[t(`fontSize`,e)]:k,[t(`titleFontSize`,e)]:A},common:{cubicBezierEaseInOut:ee}}=s.value,{top:j,left:M,bottom:N}=u(O);return{"--n-bezier":ee,"--n-border-radius":p,"--n-color":n,"--n-color-modal":r,"--n-color-popover":w,"--n-color-embedded":T,"--n-color-embedded-modal":E,"--n-color-embedded-popover":D,"--n-color-target":i,"--n-text-color":a,"--n-line-height":m,"--n-action-color":f,"--n-title-text-color":o,"--n-title-font-weight":c,"--n-close-icon-color":h,"--n-close-icon-color-hover":g,"--n-close-icon-color-pressed":_,"--n-close-color-hover":v,"--n-close-color-pressed":y,"--n-border-color":l,"--n-box-shadow":C,"--n-padding-top":j,"--n-padding-bottom":N,"--n-padding-left":M,"--n-font-size":k,"--n-title-font-size":A,"--n-close-size":S,"--n-close-icon-size":x,"--n-close-border-radius":b}}),m=r?f(`card`,O(()=>d.value[0]),p,e):void 0;return{rtlEnabled:c,mergedClsPrefix:i,mergedTheme:s,handleCloseClick:n,cssVars:r?void 0:p,themeClass:m?.themeClass,onRender:m?.onRender}},render(){let{segmented:t,bordered:r,hoverable:a,mergedClsPrefix:o,rtlEnabled:s,onRender:c,embedded:l,tag:u,$slots:d}=this;return c?.(),I(),P(u,{class:C([`${o}-card`,this.themeClass,l&&`${o}-card--embedded`,{[`${o}-card--rtl`]:s,[`${o}-card--content-scrollable`]:this.contentScrollable,[`${o}-card--content${typeof t!=`boolean`&&t.content===`soft`?`-soft`:``}-segmented`]:t===!0||t!==!1&&t.content,[`${o}-card--footer${typeof t!=`boolean`&&t.footer===`soft`?`-soft`:``}-segmented`]:t===!0||t!==!1&&t.footer,[`${o}-card--action-segmented`]:t===!0||t!==!1&&t.action,[`${o}-card--bordered`]:r,[`${o}-card--hoverable`]:a}]),style:_(this.cssVars),role:this.role},{default:n(()=>[w(()=>e(d.cover,e=>{let t=this.cover?i([this.cover()]):e;return t&&(I(),j(`div`,{class:C(`${o}-card-cover`),role:`none`},[w(()=>t)],2))})),w(()=>e(d.header,t=>{let{title:n}=this,r=n?i(typeof n==`function`?[n()]:[n]):t;return r||this.closable?(I(),j(`div`,{key:1,class:C([`${o}-card-header`,this.headerClass]),style:_(this.headerStyle),role:`heading`},[ie(`div`,{class:C(`${o}-card-header__main`),role:`heading`},[w(()=>r)],2),w(()=>e(d[`header-extra`],e=>{let t=this.headerExtra?i([this.headerExtra()]):e;return t&&(I(),j(`div`,{class:C([`${o}-card-header__extra`,this.headerExtraClass]),style:_(this.headerExtraStyle)},[w(()=>t)],6))})),w(()=>this.closable&&(I(),P(y,{clsPrefix:o,class:C(`${o}-card-header__close`),onClick:this.handleCloseClick,focusable:this.closeFocusable,absolute:!0},null,8,[`clsPrefix`,`class`,`onClick`,`focusable`])))],6)):null})),w(()=>e(d.default,e=>{let{content:t}=this,n=t?i(typeof t==`function`?[t()]:[t]):e;return n?this.contentScrollable?(I(),P(dt,{key:2,class:C(`${o}-card__content-scrollbar`),contentClass:[`${o}-card-content`,this.contentClass],contentStyle:this.contentStyle},{default:()=>n},1032,[`class`,`contentClass`,`contentStyle`])):(I(),j(`div`,{key:3,class:C([`${o}-card-content`,this.contentClass]),style:_(this.contentStyle),role:`none`},[w(()=>n)],6)):null})),w(()=>e(d.footer,e=>{let t=this.footer?i([this.footer()]):e;return t&&(I(),j(`div`,{class:C([`${o}-card__footer`,this.footerClass]),style:_(this.footerStyle),role:`none`},[w(()=>t)],6))})),w(()=>e(d.action,e=>{let t=this.action?i([this.action()]):e;return t&&(I(),j(`div`,{class:C(`${o}-card__action`),role:`none`},[w(()=>t)],2))}))]),_:2},1032,[`class`,`style`,`role`])}});export{at as a,z as c,ot as i,se as l,dt as n,V as o,ft as r,B as s,_t as t};