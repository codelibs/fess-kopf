import{Ct as e,Dr as t,Dt as n,Et as r,Fn as i,Hn as a,In as o,Jt as s,Kn as c,Kt as l,Lt as u,Mt as d,Nr as f,Or as p,Pn as m,Qt as h,Rn as g,Rt as _,Sr as v,Un as y,Vn as b,Xt as x,Zn as S,_r as C,ar as w,cr as T,dt as E,gr as D,hr as O,jt as k,lr as A,nn as ee,nr as te,pr as ne,qt as j,rr as M,tn as re,tr as N,ur as P,vr as ie,yr as F,zn as I,zr as L,zt as ae}from"./opensearch-BwskXaa4.js";function oe(e){return Object.keys(e)}function se(e){return e.composedPath()[0]||null}function R(e){return e.composedPath()[0]}var ce={mousemoveoutside:new WeakMap,clickoutside:new WeakMap};function le(e,t,n){if(e===`mousemoveoutside`){let e=e=>{t.contains(R(e))||n(e)};return{mousemove:e,touchstart:e}}if(e===`clickoutside`){let e=!1,r=n=>{e=!t.contains(R(n))},i=r=>{e&&(t.contains(R(r))||n(r))};return{mousedown:r,mouseup:i,touchstart:r,touchend:i}}return console.error(`[evtd/create-trap-handler]: name \`${e}\` is invalid. This could be a bug of evtd.`),{}}function ue(e,t,n){let r=ce[e],i=r.get(t);i===void 0&&r.set(t,i=new WeakMap);let a=i.get(n);return a===void 0&&i.set(n,a=le(e,t,n)),a}function de(e,t,n,r){if(e===`mousemoveoutside`||e===`clickoutside`){let i=ue(e,t,n);return Object.keys(i).forEach(e=>{z(e,document,i[e],r)}),!0}return!1}function fe(e,t,n,r){if(e===`mousemoveoutside`||e===`clickoutside`){let i=ue(e,t,n);return Object.keys(i).forEach(e=>{B(e,document,i[e],r)}),!0}return!1}function pe(){if(typeof window>`u`)return{on:()=>{},off:()=>{}};let e=new WeakMap,t=new WeakMap;function n(){e.set(this,!0)}function r(){e.set(this,!0),t.set(this,!0)}function i(e,t,n){let r=e[t];return e[t]=function(){return n.apply(e,arguments),r.apply(e,arguments)},e}function a(e,t){e[t]=Event.prototype[t]}let o=new WeakMap,s=Object.getOwnPropertyDescriptor(Event.prototype,`currentTarget`);function c(){return o.get(this)??null}function l(e,t){s!==void 0&&Object.defineProperty(e,"currentTarget",{configurable:!0,enumerable:!0,get:t??s.get})}let u={bubble:{},capture:{}},d={};function f(){let s=function(s){let{type:d,eventPhase:f,bubbles:p}=s,m=R(s);if(f===2)return;let h=f===1?`capture`:`bubble`,g=m,_=[];for(;g===null&&(g=window),_.push(g),g!==window;)g=g.parentNode||null;let v=u.capture[d],y=u.bubble[d];if(i(s,`stopPropagation`,n),i(s,`stopImmediatePropagation`,r),l(s,c),h===`capture`){if(v===void 0)return;for(let n=_.length-1;n>=0&&!e.has(s);--n){let e=_[n],r=v.get(e);if(r!==void 0){o.set(s,e);for(let e of r){if(t.has(s))break;e(s)}}if(n===0&&!p&&y!==void 0){let n=y.get(e);if(n!==void 0)for(let e of n){if(t.has(s))break;e(s)}}}}else if(h===`bubble`){if(y===void 0)return;for(let n=0;n<_.length&&!e.has(s);++n){let e=_[n],r=y.get(e);if(r!==void 0){o.set(s,e);for(let e of r){if(t.has(s))break;e(s)}}}}a(s,`stopPropagation`),a(s,`stopImmediatePropagation`),l(s)};return s.displayName=`evtdUnifiedHandler`,s}function p(){let e=function(e){let{type:t,eventPhase:n}=e;if(n!==2)return;let r=d[t];r!==void 0&&r.forEach(t=>t(e))};return e.displayName=`evtdUnifiedWindowEventHandler`,e}let m=f(),h=p();function g(e,t){let n=u[e];return n[t]===void 0&&(n[t]=new Map,window.addEventListener(t,m,e===`capture`)),n[t]}function _(e){return d[e]===void 0&&(d[e]=new Set,window.addEventListener(e,h)),d[e]}function v(e,t){let n=e.get(t);return n===void 0&&e.set(t,n=new Set),n}function y(e,t,n,r){let i=u[t][n];if(i!==void 0){let t=i.get(e);if(t!==void 0&&t.has(r))return!0}return!1}function b(e,t){let n=d[e];return!!(n!==void 0&&n.has(t))}function x(e,t,n,r){let i;if(i=typeof r==`object`&&r.once===!0?a=>{S(e,t,i,r),n(a)}:n,de(e,t,i,r))return;let a=v(g(r===!0||typeof r==`object`&&r.capture===!0?`capture`:`bubble`,e),t);if(a.has(i)||a.add(i),t===window){let t=_(e);t.has(i)||t.add(i)}}function S(e,t,n,r){if(fe(e,t,n,r))return;let i=r===!0||typeof r==`object`&&r.capture===!0,a=i?`capture`:`bubble`,o=g(a,e),s=v(o,t);if(t===window&&!y(t,i?`bubble`:`capture`,e,n)&&b(e,n)){let t=d[e];t.delete(n),t.size===0&&(window.removeEventListener(e,h),d[e]=void 0)}s.has(n)&&s.delete(n),s.size===0&&o.delete(t),o.size===0&&(window.removeEventListener(e,m,a===`capture`),u[a][e]=void 0)}return{on:x,off:S}}var{on:z,off:B}=pe(),me=(typeof window>`u`?!1:/iPad|iPhone|iPod/.test(navigator.platform)||navigator.platform===`MacIntel`&&navigator.maxTouchPoints>1)&&!window.MSStream;function he(){return me}function ge(e){let t={isDeactivated:!1},n=!1;return O(()=>{if(t.isDeactivated=!1,!n){n=!0;return}e()}),C(()=>{t.isDeactivated=!0,n||=!0}),t}function _e(e){let{left:t,right:n,top:r,bottom:i}=j(e);return`${r} ${t} ${i} ${n}`}var V=T({render(){return this.$slots.default?.()}}),{cubicBezierEaseInOut:H}=re;function ve({name:e=`fade-in`,enterDuration:t=`0.2s`,leaveDuration:n=`0.2s`,enterCubicBezier:r=H,leaveCubicBezier:a=H}={}){return[i(`&.${e}-transition-enter-active`,{transition:`all ${t} ${r}!important`}),i(`&.${e}-transition-leave-active`,{transition:`all ${n} ${a}!important`}),i(`&.${e}-transition-enter-from, &.${e}-transition-leave-to`,{opacity:0}),i(`&.${e}-transition-leave-from, &.${e}-transition-enter-to`,{opacity:1})]}var ye=o(`scrollbar`,`
 overflow: hidden;
 position: relative;
 z-index: auto;
 height: 100%;
 width: 100%;
`,[i(`>`,[o(`scrollbar-container`,`
 width: 100%;
 overflow: scroll;
 height: 100%;
 min-height: inherit;
 max-height: inherit;
 scrollbar-width: none;
 `,[i(`&::-webkit-scrollbar, &::-webkit-scrollbar-track-piece, &::-webkit-scrollbar-thumb`,`
 width: 0;
 height: 0;
 display: none;
 `),i(`>`,[o(`scrollbar-content`,`
 box-sizing: border-box;
 min-width: 100%;
 `)])])]),i(`>, +`,[o(`scrollbar-rail`,`
 position: absolute;
 pointer-events: none;
 user-select: none;
 background: var(--n-scrollbar-rail-color);
 -webkit-user-select: none;
 `,[I(`horizontal`,`
 height: var(--n-scrollbar-height);
 `,[i(`>`,[g(`scrollbar`,`
 height: var(--n-scrollbar-height);
 border-radius: var(--n-scrollbar-border-radius);
 right: 0;
 `)])]),I(`horizontal--top`,`
 top: var(--n-scrollbar-rail-top-horizontal-top); 
 right: var(--n-scrollbar-rail-right-horizontal-top); 
 bottom: var(--n-scrollbar-rail-bottom-horizontal-top); 
 left: var(--n-scrollbar-rail-left-horizontal-top); 
 `),I(`horizontal--bottom`,`
 top: var(--n-scrollbar-rail-top-horizontal-bottom); 
 right: var(--n-scrollbar-rail-right-horizontal-bottom); 
 bottom: var(--n-scrollbar-rail-bottom-horizontal-bottom); 
 left: var(--n-scrollbar-rail-left-horizontal-bottom); 
 `),I(`vertical`,`
 width: var(--n-scrollbar-width);
 `,[i(`>`,[g(`scrollbar`,`
 width: var(--n-scrollbar-width);
 border-radius: var(--n-scrollbar-border-radius);
 bottom: 0;
 `)])]),I(`vertical--left`,`
 top: var(--n-scrollbar-rail-top-vertical-left); 
 right: var(--n-scrollbar-rail-right-vertical-left); 
 bottom: var(--n-scrollbar-rail-bottom-vertical-left); 
 left: var(--n-scrollbar-rail-left-vertical-left); 
 `),I(`vertical--right`,`
 top: var(--n-scrollbar-rail-top-vertical-right); 
 right: var(--n-scrollbar-rail-right-vertical-right); 
 bottom: var(--n-scrollbar-rail-bottom-vertical-right); 
 left: var(--n-scrollbar-rail-left-vertical-right); 
 `),I(`disabled`,[i(`>`,[g(`scrollbar`,`pointer-events: none;`)])]),i(`>`,[g(`scrollbar`,`
 z-index: 1;
 position: absolute;
 cursor: pointer;
 pointer-events: all;
 background-color: var(--n-scrollbar-color);
 transition: background-color .2s var(--n-scrollbar-bezier);
 `,[ve(),i(`&:hover`,`background-color: var(--n-scrollbar-color-hover);`)])])])])]);function be(e,t){console.error(`[vueuc/${e}]: ${t}`)}var U=[],xe=function(){return U.some(function(e){return e.activeTargets.length>0})},Se=function(){return U.some(function(e){return e.skippedTargets.length>0})},Ce=`ResizeObserver loop completed with undelivered notifications.`,W=function(){var e;typeof ErrorEvent==`function`?e=new ErrorEvent(`error`,{message:Ce}):(e=document.createEvent(`Event`),e.initEvent(`error`,!1,!1),e.message=Ce),window.dispatchEvent(e)},G;(function(e){e.BORDER_BOX=`border-box`,e.CONTENT_BOX=`content-box`,e.DEVICE_PIXEL_CONTENT_BOX=`device-pixel-content-box`})(G||={});var K=function(e){return Object.freeze(e)},we=function(){function e(e,t){this.inlineSize=e,this.blockSize=t,K(this)}return e}(),Te=function(){function e(e,t,n,r){return this.x=e,this.y=t,this.width=n,this.height=r,this.top=this.y,this.left=this.x,this.bottom=this.top+this.height,this.right=this.left+this.width,K(this)}return e.prototype.toJSON=function(){var e=this;return{x:e.x,y:e.y,top:e.top,right:e.right,bottom:e.bottom,left:e.left,width:e.width,height:e.height}},e.fromRect=function(t){return new e(t.x,t.y,t.width,t.height)},e}(),Ee=function(e){return e instanceof SVGElement&&`getBBox`in e},De=function(e){if(Ee(e)){var t=e.getBBox(),n=t.width,r=t.height;return!n&&!r}var i=e,a=i.offsetWidth,o=i.offsetHeight;return!(a||o||e.getClientRects().length)},Oe=function(e){if(e instanceof Element)return!0;var t=e?.ownerDocument?.defaultView;return!!(t&&e instanceof t.Element)},ke=function(e){switch(e.tagName){case`INPUT`:if(e.type!==`image`)break;case`VIDEO`:case`AUDIO`:case`EMBED`:case`OBJECT`:case`CANVAS`:case`IFRAME`:case`IMG`:return!0}return!1},q=typeof window<`u`?window:{},J=new WeakMap,Ae=/auto|scroll/,Y=/^tb|vertical/,je=/msie|trident/i.test(q.navigator&&q.navigator.userAgent),X=function(e){return parseFloat(e||`0`)},Z=function(e,t,n){return e===void 0&&(e=0),t===void 0&&(t=0),n===void 0&&(n=!1),new we((n?t:e)||0,(n?e:t)||0)},Q=K({devicePixelContentBoxSize:Z(),borderBoxSize:Z(),contentBoxSize:Z(),contentRect:new Te(0,0,0,0)}),Me=function(e,t){if(t===void 0&&(t=!1),J.has(e)&&!t)return J.get(e);if(De(e))return J.set(e,Q),Q;var n=getComputedStyle(e),r=Ee(e)&&e.ownerSVGElement&&e.getBBox(),i=!je&&n.boxSizing===`border-box`,a=Y.test(n.writingMode||``),o=!r&&Ae.test(n.overflowY||``),s=!r&&Ae.test(n.overflowX||``),c=r?0:X(n.paddingTop),l=r?0:X(n.paddingRight),u=r?0:X(n.paddingBottom),d=r?0:X(n.paddingLeft),f=r?0:X(n.borderTopWidth),p=r?0:X(n.borderRightWidth),m=r?0:X(n.borderBottomWidth),h=r?0:X(n.borderLeftWidth),g=d+l,_=c+u,v=h+p,y=f+m,b=s?e.offsetHeight-y-e.clientHeight:0,x=o?e.offsetWidth-v-e.clientWidth:0,S=i?g+v:0,C=i?_+y:0,w=r?r.width:X(n.width)-S-x,T=r?r.height:X(n.height)-C-b,E=w+g+x+v,D=T+_+b+y,O=K({devicePixelContentBoxSize:Z(Math.round(w*devicePixelRatio),Math.round(T*devicePixelRatio),a),borderBoxSize:Z(E,D,a),contentBoxSize:Z(w,T,a),contentRect:new Te(d,c,w,T)});return J.set(e,O),O},$=function(e,t,n){var r=Me(e,n),i=r.borderBoxSize,a=r.contentBoxSize,o=r.devicePixelContentBoxSize;switch(t){case G.DEVICE_PIXEL_CONTENT_BOX:return o;case G.BORDER_BOX:return i;default:return a}},Ne=function(){function e(e){var t=Me(e);this.target=e,this.contentRect=t.contentRect,this.borderBoxSize=K([t.borderBoxSize]),this.contentBoxSize=K([t.contentBoxSize]),this.devicePixelContentBoxSize=K([t.devicePixelContentBoxSize])}return e}(),Pe=function(e){if(De(e))return 1/0;for(var t=0,n=e.parentNode;n;)t+=1,n=n.parentNode;return t},Fe=function(){var e=1/0,t=[];U.forEach(function(n){if(n.activeTargets.length!==0){var r=[];n.activeTargets.forEach(function(t){var n=new Ne(t.target),i=Pe(t.target);r.push(n),t.lastReportedSize=$(t.target,t.observedBox),i<e&&(e=i)}),t.push(function(){n.callback.call(n.observer,r,n.observer)}),n.activeTargets.splice(0,n.activeTargets.length)}});for(var n=0,r=t;n<r.length;n++){var i=r[n];i()}return e},Ie=function(e){U.forEach(function(t){t.activeTargets.splice(0,t.activeTargets.length),t.skippedTargets.splice(0,t.skippedTargets.length),t.observationTargets.forEach(function(n){n.isActive()&&(Pe(n.target)>e?t.activeTargets.push(n):t.skippedTargets.push(n))})})},Le=function(){var e=0;for(Ie(e);xe();)e=Fe(),Ie(e);return Se()&&W(),e>0},Re,ze=[],Be=function(){return ze.splice(0).forEach(function(e){return e()})},Ve=function(e){if(!Re){var t=0,n=document.createTextNode(``);new MutationObserver(function(){return Be()}).observe(n,{characterData:!0}),Re=function(){n.textContent=`${t?t--:t++}`}}ze.push(e),Re()},He=function(e){Ve(function(){requestAnimationFrame(e)})},Ue=0,We=function(){return!!Ue},Ge=250,Ke={attributes:!0,characterData:!0,childList:!0,subtree:!0},qe=[`resize`,`load`,`transitionend`,`animationend`,`animationstart`,`animationiteration`,`keyup`,`keydown`,`mouseup`,`mousedown`,`mouseover`,`mouseout`,`blur`,`focus`],Je=function(e){return e===void 0&&(e=0),Date.now()+e},Ye=!1,Xe=new(function(){function e(){var e=this;this.stopped=!0,this.listener=function(){return e.schedule()}}return e.prototype.run=function(e){var t=this;if(e===void 0&&(e=Ge),!Ye){Ye=!0;var n=Je(e);He(function(){var r=!1;try{r=Le()}finally{if(Ye=!1,e=n-Je(),!We())return;r?t.run(1e3):e>0?t.run(e):t.start()}})}},e.prototype.schedule=function(){this.stop(),this.run()},e.prototype.observe=function(){var e=this,t=function(){return e.observer&&e.observer.observe(document.body,Ke)};document.body?t():q.addEventListener(`DOMContentLoaded`,t)},e.prototype.start=function(){var e=this;this.stopped&&(this.stopped=!1,this.observer=new MutationObserver(this.listener),this.observe(),qe.forEach(function(t){return q.addEventListener(t,e.listener,!0)}))},e.prototype.stop=function(){var e=this;this.stopped||=(this.observer&&this.observer.disconnect(),qe.forEach(function(t){return q.removeEventListener(t,e.listener,!0)}),!0)},e}()),Ze=function(e){!Ue&&e>0&&Xe.start(),Ue+=e,!Ue&&Xe.stop()},Qe=function(e){return!Ee(e)&&!ke(e)&&getComputedStyle(e).display===`inline`},$e=function(){function e(e,t){this.target=e,this.observedBox=t||G.CONTENT_BOX,this.lastReportedSize={inlineSize:0,blockSize:0}}return e.prototype.isActive=function(){var e=$(this.target,this.observedBox,!0);return Qe(this.target)&&(this.lastReportedSize=e),this.lastReportedSize.inlineSize!==e.inlineSize||this.lastReportedSize.blockSize!==e.blockSize},e}(),et=function(){function e(e,t){this.activeTargets=[],this.skippedTargets=[],this.observationTargets=[],this.observer=e,this.callback=t}return e}(),tt=new WeakMap,nt=function(e,t){for(var n=0;n<e.length;n+=1)if(e[n].target===t)return n;return-1},rt=function(){function e(){}return e.connect=function(e,t){var n=new et(e,t);tt.set(e,n)},e.observe=function(e,t,n){var r=tt.get(e),i=r.observationTargets.length===0;nt(r.observationTargets,t)<0&&(i&&U.push(r),r.observationTargets.push(new $e(t,n&&n.box)),Ze(1),Xe.schedule())},e.unobserve=function(e,t){var n=tt.get(e),r=nt(n.observationTargets,t),i=n.observationTargets.length===1;r>=0&&(i&&U.splice(U.indexOf(n),1),n.observationTargets.splice(r,1),Ze(-1))},e.disconnect=function(e){var t=this,n=tt.get(e);n.observationTargets.slice().forEach(function(n){return t.unobserve(e,n.target)}),n.activeTargets.splice(0,n.activeTargets.length)},e}(),it=function(){function e(e){if(arguments.length===0)throw TypeError(`Failed to construct 'ResizeObserver': 1 argument required, but only 0 present.`);if(typeof e!=`function`)throw TypeError(`Failed to construct 'ResizeObserver': The callback provided as parameter 1 is not a function.`);rt.connect(this,e)}return e.prototype.observe=function(e,t){if(arguments.length===0)throw TypeError(`Failed to execute 'observe' on 'ResizeObserver': 1 argument required, but only 0 present.`);if(!Oe(e))throw TypeError(`Failed to execute 'observe' on 'ResizeObserver': parameter 1 is not of type 'Element`);rt.observe(this,e,t)},e.prototype.unobserve=function(e){if(arguments.length===0)throw TypeError(`Failed to execute 'unobserve' on 'ResizeObserver': 1 argument required, but only 0 present.`);if(!Oe(e))throw TypeError(`Failed to execute 'unobserve' on 'ResizeObserver': parameter 1 is not of type 'Element`);rt.unobserve(this,e)},e.prototype.disconnect=function(){rt.disconnect(this)},e.toString=function(){return`function ResizeObserver () { [polyfill code] }`},e}(),at=new class{constructor(){this.handleResize=this.handleResize.bind(this),this.observer=new(typeof window<`u`&&window.ResizeObserver||it)(this.handleResize),this.elHandlersMap=new Map}handleResize(e){for(let t of e){let e=this.elHandlersMap.get(t.target);e!==void 0&&e(t)}}registerHandler(e,t){this.elHandlersMap.set(e,t),this.observer.observe(e)}unregisterHandler(e){this.elHandlersMap.has(e)&&(this.elHandlersMap.delete(e),this.observer.unobserve(e))}},ot=T({name:`ResizeObserver`,props:{onResize:Function},setup(e){let t=!1,n=A().proxy;function r(t){let{onResize:n}=e;n!==void 0&&n(t)}ie(()=>{let e=n.$el;if(e===void 0){be(`resize-observer`,`$el does not exist.`);return}if(e.nextElementSibling!==e.nextSibling&&e.nodeType===3&&e.nodeValue!==``){be(`resize-observer`,`$el can not be observed (it may be a text node).`);return}e.nextElementSibling!==null&&(at.registerHandler(e.nextElementSibling,r),t=!0)}),D(()=>{t&&at.unregisterHandler(n.$el.nextElementSibling)})},render(){return v(this.$slots,`default`)}}),st=[`onMousedown`],ct=[`onScroll`,`onWheel`],lt=[`onMousedown`],ut={...u.props,duration:{type:Number,default:0},scrollable:{type:Boolean,default:!0},xScrollable:Boolean,trigger:{type:String,default:`hover`},useUnifiedContainer:Boolean,triggerDisplayManually:Boolean,container:Function,content:Function,containerClass:String,containerStyle:[String,Object],contentClass:[String,Array],contentStyle:[String,Object],horizontalRailStyle:[String,Object],verticalRailStyle:[String,Object],onScroll:Function,onWheel:Function,onResize:Function,internalOnUpdateScrollLeft:Function,internalHoistYRail:Boolean,internalExposeWidthCssVar:Boolean,yPlacement:{type:String,default:`right`},xPlacement:{type:String,default:`bottom`}},dt=T({name:`Scrollbar`,props:ut,inheritAttrs:!1,setup(e){let{mergedClsPrefixRef:n,inlineThemeDisabled:i,mergedRtlRef:a}=ee(e),o=r(`Scrollbar`,a,n),s=f(null),c=f(null),d=f(null),p=f(null),m=f(null),h=f(null),g=f(null),v=f(null),y=f(null),b=f(null),x=f(null),S=f(0),C=f(0),w=f(!1),T=f(!1),E=!1,O=!1,k,A,te=0,ne=0,M=0,re=0,P=he(),F=u(`Scrollbar`,`-scrollbar`,ye,ae,e,n),I=N(()=>{let{value:e}=v,{value:t}=h,{value:n}=b;return e===null||t===null||n===null?0:Math.min(e,n*e/t+l(F.value.self.width)*1.5)}),L=N(()=>`${I.value}px`),oe=N(()=>{let{value:e}=y,{value:t}=g,{value:n}=x;return e===null||t===null||n===null?0:n*e/t+l(F.value.self.height)*1.5}),R=N(()=>`${oe.value}px`),ce=N(()=>{let{value:e}=v,{value:t}=S,{value:n}=h,{value:r}=b;if(e===null||n===null||r===null)return 0;{let i=n-e;return i?t/i*(r-I.value):0}}),le=N(()=>`${ce.value}px`),ue=N(()=>{let{value:e}=y,{value:t}=C,{value:n}=g,{value:r}=x;if(e===null||n===null||r===null)return 0;{let i=n-e;return i?t/i*(r-oe.value):0}}),de=N(()=>`${ue.value}px`),fe=N(()=>{let{value:e}=v,{value:t}=h;return e!==null&&t!==null&&t>e}),pe=N(()=>{let{value:e}=y,{value:t}=g;return e!==null&&t!==null&&t>e}),me=N(()=>{let{trigger:t}=e;return t===`none`||w.value}),V=N(()=>{let{trigger:t}=e;return t===`none`||T.value}),H=N(()=>{let{container:t}=e;return t?t():c.value}),ve=N(()=>{let{content:t}=e;return t?t():d.value}),be=(t,n)=>{if(!e.scrollable)return;if(typeof t==`number`){W(t,n??0,0,!1,`auto`);return}let{left:r,top:i,index:a,elSize:o,position:s,behavior:c,el:l,debounce:u=!0}=t;(r!==void 0||i!==void 0)&&W(r??0,i??0,0,!1,c),l===void 0?a!==void 0&&o!==void 0?W(0,a*o,o,u,c):s===`bottom`?W(0,2**53-1,0,!1,c):s===`top`&&W(0,0,0,!1,c):W(0,l.offsetTop,l.offsetHeight,u,c)},U=ge(()=>{e.container||be({top:S.value,left:C.value})}),xe=()=>{U.isDeactivated||Y()},Se=t=>{if(U.isDeactivated)return;let{onResize:n}=e;n&&n(t),Y()},Ce=(t,n)=>{if(!e.scrollable)return;let{value:r}=H;r&&(typeof t==`object`?r.scrollBy(t):r.scrollBy(t,n||0))};function W(e,t,n,r,i){let{value:a}=H;if(a){if(r){let{scrollTop:r,offsetHeight:o}=a;if(t>r){t+n<=r+o||a.scrollTo({left:e,top:t+n-o,behavior:i});return}}a.scrollTo({left:e,top:t,behavior:i})}}function G(){De(),Oe(),Y()}function K(){we()}function we(){Te(),Ee()}function Te(){A!==void 0&&window.clearTimeout(A),A=window.setTimeout(()=>{T.value=!1},e.duration)}function Ee(){k!==void 0&&window.clearTimeout(k),k=window.setTimeout(()=>{w.value=!1},e.duration)}function De(){k!==void 0&&window.clearTimeout(k),w.value=!0}function Oe(){A!==void 0&&window.clearTimeout(A),T.value=!0}function ke(t){let{onScroll:n}=e;n&&n(t),q()}function q(){let{value:e}=H;e&&(S.value=e.scrollTop,C.value=e.scrollLeft*(o?.value?-1:1))}function J(){let{value:e}=ve;e&&(h.value=e.offsetHeight,g.value=e.offsetWidth);let{value:t}=H;t&&(v.value=t.offsetHeight,y.value=t.offsetWidth);let{value:n}=m,{value:r}=p;n&&(x.value=n.offsetWidth),r&&(b.value=r.offsetHeight)}function Ae(){let{value:e}=H;e&&(S.value=e.scrollTop,C.value=e.scrollLeft*(o?.value?-1:1),v.value=e.offsetHeight,y.value=e.offsetWidth,h.value=e.scrollHeight,g.value=e.scrollWidth);let{value:t}=m,{value:n}=p;t&&(x.value=t.offsetWidth),n&&(b.value=n.offsetHeight)}function Y(){e.scrollable&&(e.useUnifiedContainer?Ae():(J(),q()))}function je(e){return!s.value?.contains(se(e))}function X(e){e.preventDefault(),e.stopPropagation(),O=!0,z(`mousemove`,window,Z,!0),z(`mouseup`,window,Q,!0),ne=C.value,M=o?.value?window.innerWidth-e.clientX:e.clientX}function Z(t){if(!O)return;k!==void 0&&window.clearTimeout(k),A!==void 0&&window.clearTimeout(A);let{value:n}=y,{value:r}=g,{value:i}=oe;if(n===null||r===null)return;let a=(o?.value?window.innerWidth-t.clientX-M:t.clientX-M)*(r-n)/(n-i),s=r-n,c=ne+a;c=Math.min(s,c),c=Math.max(c,0);let{value:l}=H;if(l){l.scrollLeft=c*(o?.value?-1:1);let{internalOnUpdateScrollLeft:t}=e;t&&t(c)}}function Q(e){e.preventDefault(),e.stopPropagation(),B(`mousemove`,window,Z,!0),B(`mouseup`,window,Q,!0),O=!1,Y(),je(e)&&we()}function Me(e){e.preventDefault(),e.stopPropagation(),E=!0,z(`mousemove`,window,$,!0),z(`mouseup`,window,Ne,!0),te=S.value,re=e.clientY}function $(e){if(!E)return;k!==void 0&&window.clearTimeout(k),A!==void 0&&window.clearTimeout(A);let{value:t}=v,{value:n}=h,{value:r}=I;if(t===null||n===null)return;let i=(e.clientY-re)*(n-t)/(t-r),a=n-t,o=te+i;o=Math.min(a,o),o=Math.max(o,0);let{value:s}=H;s&&(s.scrollTop=o)}function Ne(e){e.preventDefault(),e.stopPropagation(),B(`mousemove`,window,$,!0),B(`mouseup`,window,Ne,!0),E=!1,Y(),je(e)&&we()}t(()=>{let{value:e}=pe,{value:t}=fe,{value:r}=n,{value:i}=m,{value:a}=p;i&&(e?i.classList.remove(`${r}-scrollbar-rail--disabled`):i.classList.add(`${r}-scrollbar-rail--disabled`)),a&&(t?a.classList.remove(`${r}-scrollbar-rail--disabled`):a.classList.add(`${r}-scrollbar-rail--disabled`))}),ie(()=>{e.container||Y()}),D(()=>{k!==void 0&&window.clearTimeout(k),A!==void 0&&window.clearTimeout(A),B(`mousemove`,window,$,!0),B(`mouseup`,window,Ne,!0)});let Pe=N(()=>{let{common:{cubicBezierEaseInOut:e},self:{color:t,colorHover:n,height:r,width:i,borderRadius:a,railInsetHorizontalTop:s,railInsetHorizontalBottom:c,railInsetVerticalRight:l,railInsetVerticalLeft:u,railColor:d}}=F.value,{top:f,right:p,bottom:m,left:h}=j(s),{top:g,right:_,bottom:v,left:y}=j(c),{top:b,right:x,bottom:S,left:C}=j(o?.value?_e(l):l),{top:w,right:T,bottom:E,left:D}=j(o?.value?_e(u):u);return{"--n-scrollbar-bezier":e,"--n-scrollbar-color":t,"--n-scrollbar-color-hover":n,"--n-scrollbar-border-radius":a,"--n-scrollbar-width":i,"--n-scrollbar-height":r,"--n-scrollbar-rail-top-horizontal-top":f,"--n-scrollbar-rail-right-horizontal-top":p,"--n-scrollbar-rail-bottom-horizontal-top":m,"--n-scrollbar-rail-left-horizontal-top":h,"--n-scrollbar-rail-top-horizontal-bottom":g,"--n-scrollbar-rail-right-horizontal-bottom":_,"--n-scrollbar-rail-bottom-horizontal-bottom":v,"--n-scrollbar-rail-left-horizontal-bottom":y,"--n-scrollbar-rail-top-vertical-right":b,"--n-scrollbar-rail-right-vertical-right":x,"--n-scrollbar-rail-bottom-vertical-right":S,"--n-scrollbar-rail-left-vertical-right":C,"--n-scrollbar-rail-top-vertical-left":w,"--n-scrollbar-rail-right-vertical-left":T,"--n-scrollbar-rail-bottom-vertical-left":E,"--n-scrollbar-rail-left-vertical-left":D,"--n-scrollbar-rail-color":d}}),Fe=i?_(`scrollbar`,void 0,Pe,e):void 0;return{scrollTo:be,scrollBy:Ce,sync:Y,syncUnifiedContainer:Ae,handleMouseEnterWrapper:G,handleMouseLeaveWrapper:K,mergedClsPrefix:n,rtlEnabled:o,containerScrollTop:S,wrapperRef:s,containerRef:c,contentRef:d,yRailRef:p,xRailRef:m,needYBar:fe,needXBar:pe,yBarSizePx:L,xBarSizePx:R,yBarTopPx:le,xBarLeftPx:de,isShowXBar:me,isShowYBar:V,isIos:P,handleScroll:ke,handleContentResize:xe,handleContainerResize:Se,handleYScrollMouseDown:Me,handleXScrollMouseDown:X,containerWidth:y,cssVars:i?void 0:Pe,themeClass:Fe?.themeClass,onRender:Fe?.onRender}},render(){let{$slots:e,mergedClsPrefix:t,triggerDisplayManually:n,rtlEnabled:r,internalHoistYRail:i,yPlacement:a,xPlacement:o,xScrollable:l}=this;if(!this.scrollable)return e.default?.();let u=this.trigger===`none`,d=(e,n)=>(F(),w(`div`,{ref:`yRailRef`,class:x([`${t}-scrollbar-rail`,`${t}-scrollbar-rail--vertical`,`${t}-scrollbar-rail--vertical--${a}`,e]),"data-scrollbar-rail":!0,style:L([n||``,this.verticalRailStyle]),"aria-hidden":!0},[h(()=>P(u?V:c,u?null:{name:`fade-in-transition`},{default:()=>this.needYBar&&this.isShowYBar&&!this.isIos?(F(),w(`div`,{key:1,class:x(`${t}-scrollbar-rail__scrollbar`),style:L({height:this.yBarSizePx,top:this.yBarTopPx}),onMousedown:this.handleYScrollMouseDown},null,46,st)):null}))],6)),f=()=>(this.onRender?.(),P(`div`,ne(this.$attrs,{role:`none`,ref:`wrapperRef`,class:[`${t}-scrollbar`,this.themeClass,r&&`${t}-scrollbar--rtl`],style:this.cssVars,onMouseenter:n?void 0:this.handleMouseEnterWrapper,onMouseleave:n?void 0:this.handleMouseLeaveWrapper}),[this.container?e.default?.():(F(),w(`div`,{key:2,role:`none`,ref:`containerRef`,class:x([`${t}-scrollbar-container`,this.containerClass]),style:L([this.containerStyle,this.internalExposeWidthCssVar?{"--n-scrollbar-current-width":s(this.containerWidth)}:void 0]),onScroll:this.handleScroll,onWheel:this.onWheel},[(F(),M(ot,{onResize:this.handleContentResize},{default:()=>(F(),w(`div`,{ref:`contentRef`,role:`none`,style:L([{width:this.xScrollable?`fit-content`:null},this.contentStyle]),class:x([`${t}-scrollbar-content`,this.contentClass])},[h(()=>e.default?.())],6))},1032,[`onResize`]))],46,ct)),i?null:d(void 0,void 0),l&&(F(),w(`div`,{ref:`xRailRef`,class:x([`${t}-scrollbar-rail`,`${t}-scrollbar-rail--horizontal`,`${t}-scrollbar-rail--horizontal--${o}`]),style:L(this.horizontalRailStyle),"data-scrollbar-rail":!0,"aria-hidden":!0},[h(()=>P(u?V:c,u?null:{name:`fade-in-transition`},{default:()=>this.needXBar&&this.isShowXBar&&!this.isIos?(F(),w(`div`,{key:3,class:x(`${t}-scrollbar-rail__scrollbar`),style:L({width:this.xBarSizePx,right:r?this.xBarLeftPx:void 0,left:r?void 0:this.xBarLeftPx}),onMousedown:this.handleXScrollMouseDown},null,46,lt)):null}))],6))])),p=this.container?f():(F(),M(ot,{key:4,onResize:this.handleContainerResize},{default:f},1032,[`onResize`]));return i?(F(),w(S,{key:5},[h(()=>p),h(()=>d(this.themeClass,this.cssVars))],64)):p}}),ft=dt,pt=o(`card-content`,`
 flex: 1;
 min-width: 0;
 box-sizing: border-box;
 padding: 0 var(--n-padding-left) var(--n-padding-bottom) var(--n-padding-left);
 font-size: var(--n-font-size);
`),mt=i([o(`card`,`
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
 `,[m({background:`var(--n-color-modal)`}),I(`hoverable`,[i(`&:hover`,`box-shadow: var(--n-box-shadow);`)]),I(`content-segmented`,[i(`>`,[o(`card-content`,`
 padding-top: var(--n-padding-bottom);
 `),g(`content-scrollbar`,[i(`>`,[o(`scrollbar-container`,[i(`>`,[o(`card-content`,`
 padding-top: var(--n-padding-bottom);
 `)])])])])])]),I(`content-soft-segmented`,[i(`>`,[o(`card-content`,`
 margin: 0 var(--n-padding-left);
 padding: var(--n-padding-bottom) 0;
 `),g(`content-scrollbar`,[i(`>`,[o(`scrollbar-container`,[i(`>`,[o(`card-content`,`
 margin: 0 var(--n-padding-left);
 padding: var(--n-padding-bottom) 0;
 `)])])])])])]),I(`footer-segmented`,[i(`>`,[g(`footer`,`
 padding-top: var(--n-padding-bottom);
 `)])]),I(`footer-soft-segmented`,[i(`>`,[g(`footer`,`
 padding: var(--n-padding-bottom) 0;
 margin: 0 var(--n-padding-left);
 `)])]),i(`>`,[o(`card-header`,`
 box-sizing: border-box;
 display: flex;
 align-items: center;
 font-size: var(--n-title-font-size);
 padding:
 var(--n-padding-top)
 var(--n-padding-left)
 var(--n-padding-bottom)
 var(--n-padding-left);
 `,[g(`main`,`
 font-weight: var(--n-title-font-weight);
 transition: color .3s var(--n-bezier);
 flex: 1;
 min-width: 0;
 color: var(--n-title-text-color);
 `),g(`extra`,`
 display: flex;
 align-items: center;
 font-size: var(--n-font-size);
 font-weight: 400;
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
 `),g(`close`,`
 margin: 0 0 0 8px;
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 `)]),g(`action`,`
 box-sizing: border-box;
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 background-clip: padding-box;
 background-color: var(--n-action-color);
 `),pt,o(`card-content`,[i(`&:first-child`,`
 padding-top: var(--n-padding-bottom);
 `)]),g(`content-scrollbar`,`
 display: flex;
 flex-direction: column;
 `,[i(`>`,[o(`scrollbar-container`,[i(`>`,[pt])])]),i(`&:first-child >`,[o(`scrollbar-container`,[i(`>`,[o(`card-content`,`
 padding-top: var(--n-padding-bottom);
 `)])])])]),g(`footer`,`
 box-sizing: border-box;
 padding: 0 var(--n-padding-left) var(--n-padding-bottom) var(--n-padding-left);
 font-size: var(--n-font-size);
 `,[i(`&:first-child`,`
 padding-top: var(--n-padding-bottom);
 `)]),g(`action`,`
 background-color: var(--n-action-color);
 padding: var(--n-padding-bottom) var(--n-padding-left);
 border-bottom-left-radius: var(--n-border-radius);
 border-bottom-right-radius: var(--n-border-radius);
 `)]),o(`card-cover`,`
 overflow: hidden;
 width: 100%;
 border-radius: var(--n-border-radius) var(--n-border-radius) 0 0;
 `,[i(`img`,`
 display: block;
 width: 100%;
 `)]),I(`bordered`,`
 border: 1px solid var(--n-border-color);
 `,[i(`&:target`,`border-color: var(--n-color-target);`)]),I(`action-segmented`,[i(`>`,[g(`action`,[i(`&:not(:first-child)`,`
 border-top: 1px solid var(--n-border-color);
 `)])])]),I(`content-segmented, content-soft-segmented`,[i(`>`,[o(`card-content`,`
 transition: border-color 0.3s var(--n-bezier);
 `,[i(`&:not(:first-child)`,`
 border-top: 1px solid var(--n-border-color);
 `)]),g(`content-scrollbar`,`
 transition: border-color 0.3s var(--n-bezier);
 `,[i(`&:not(:first-child)`,`
 border-top: 1px solid var(--n-border-color);
 `)])])]),I(`footer-segmented, footer-soft-segmented`,[i(`>`,[g(`footer`,`
 transition: border-color 0.3s var(--n-bezier);
 `,[i(`&:not(:first-child)`,`
 border-top: 1px solid var(--n-border-color);
 `)])])]),I(`embedded`,`
 background-color: var(--n-color-embedded);
 `)]),a(o(`card`,`
 background: var(--n-color-modal);
 `,[I(`embedded`,`
 background-color: var(--n-color-embedded-modal);
 `)])),y(o(`card`,`
 background: var(--n-color-popover);
 `,[I(`embedded`,`
 background-color: var(--n-color-embedded-popover);
 `)]))]),ht={title:[String,Function],contentClass:String,contentStyle:[Object,String],contentScrollable:Boolean,headerClass:String,headerStyle:[Object,String],headerExtraClass:String,headerExtraStyle:[Object,String],footerClass:String,footerStyle:[Object,String],embedded:Boolean,segmented:{type:[Boolean,Object],default:!1},size:String,bordered:{type:Boolean,default:!0},closable:Boolean,hoverable:Boolean,role:String,onClose:[Function,Array],tag:{type:String,default:`div`},cover:Function,content:[String,Function],footer:Function,action:Function,headerExtra:Function,closeFocusable:Boolean};oe(ht);var gt={...u.props,...ht},_t=T({name:`Card`,props:gt,slots:Object,setup(e){let t=()=>{let{onClose:t}=e;t&&d(t)},{inlineThemeDisabled:n,mergedClsPrefixRef:i,mergedRtlRef:a,mergedComponentPropsRef:o}=ee(e),s=u(`Card`,`-card`,mt,E,e,i),c=r(`Card`,a,i),l=N(()=>e.size||o?.value?.Card?.size||`medium`),f=N(()=>{let e=l.value,{self:{color:t,colorModal:n,colorTarget:r,textColor:i,titleTextColor:a,titleFontWeight:o,borderColor:c,actionColor:u,borderRadius:d,lineHeight:f,closeIconColor:p,closeIconColorHover:m,closeIconColorPressed:h,closeColorHover:g,closeColorPressed:_,closeBorderRadius:v,closeIconSize:y,closeSize:x,boxShadow:S,colorPopover:C,colorEmbedded:w,colorEmbeddedModal:T,colorEmbeddedPopover:E,[b(`padding`,e)]:D,[b(`fontSize`,e)]:O,[b(`titleFontSize`,e)]:k},common:{cubicBezierEaseInOut:A}}=s.value,{top:ee,left:te,bottom:ne}=j(D);return{"--n-bezier":A,"--n-border-radius":d,"--n-color":t,"--n-color-modal":n,"--n-color-popover":C,"--n-color-embedded":w,"--n-color-embedded-modal":T,"--n-color-embedded-popover":E,"--n-color-target":r,"--n-text-color":i,"--n-line-height":f,"--n-action-color":u,"--n-title-text-color":a,"--n-title-font-weight":o,"--n-close-icon-color":p,"--n-close-icon-color-hover":m,"--n-close-icon-color-pressed":h,"--n-close-color-hover":g,"--n-close-color-pressed":_,"--n-border-color":c,"--n-box-shadow":S,"--n-padding-top":ee,"--n-padding-bottom":ne,"--n-padding-left":te,"--n-font-size":O,"--n-title-font-size":k,"--n-close-size":x,"--n-close-icon-size":y,"--n-close-border-radius":v}}),p=n?_(`card`,N(()=>l.value[0]),f,e):void 0;return{rtlEnabled:c,mergedClsPrefix:i,mergedTheme:s,handleCloseClick:t,cssVars:n?void 0:f,themeClass:p?.themeClass,onRender:p?.onRender}},render(){let{segmented:t,bordered:r,hoverable:i,mergedClsPrefix:a,rtlEnabled:o,onRender:s,embedded:c,tag:l,$slots:u}=this;return s?.(),F(),M(l,{class:x([`${a}-card`,this.themeClass,c&&`${a}-card--embedded`,{[`${a}-card--rtl`]:o,[`${a}-card--content-scrollable`]:this.contentScrollable,[`${a}-card--content${typeof t!=`boolean`&&t.content===`soft`?`-soft`:``}-segmented`]:t===!0||t!==!1&&t.content,[`${a}-card--footer${typeof t!=`boolean`&&t.footer===`soft`?`-soft`:``}-segmented`]:t===!0||t!==!1&&t.footer,[`${a}-card--action-segmented`]:t===!0||t!==!1&&t.action,[`${a}-card--bordered`]:r,[`${a}-card--hoverable`]:i}]),style:L(this.cssVars),role:this.role},{default:p(()=>[h(()=>k(u.cover,e=>{let t=this.cover?n([this.cover()]):e;return t&&(F(),w(`div`,{class:x(`${a}-card-cover`),role:`none`},[h(()=>t)],2))})),h(()=>k(u.header,t=>{let{title:r}=this,i=r?n(typeof r==`function`?[r()]:[r]):t;return i||this.closable?(F(),w(`div`,{key:1,class:x([`${a}-card-header`,this.headerClass]),style:L(this.headerStyle),role:`heading`},[te(`div`,{class:x(`${a}-card-header__main`),role:`heading`},[h(()=>i)],2),h(()=>k(u[`header-extra`],e=>{let t=this.headerExtra?n([this.headerExtra()]):e;return t&&(F(),w(`div`,{class:x([`${a}-card-header__extra`,this.headerExtraClass]),style:L(this.headerExtraStyle)},[h(()=>t)],6))})),h(()=>this.closable&&(F(),M(e,{clsPrefix:a,class:x(`${a}-card-header__close`),onClick:this.handleCloseClick,focusable:this.closeFocusable,absolute:!0},null,8,[`clsPrefix`,`class`,`onClick`,`focusable`])))],6)):null})),h(()=>k(u.default,e=>{let{content:t}=this,r=t?n(typeof t==`function`?[t()]:[t]):e;return r?this.contentScrollable?(F(),M(dt,{key:2,class:x(`${a}-card__content-scrollbar`),contentClass:[`${a}-card-content`,this.contentClass],contentStyle:this.contentStyle},{default:()=>r},1032,[`class`,`contentClass`,`contentStyle`])):(F(),w(`div`,{key:3,class:x([`${a}-card-content`,this.contentClass]),style:L(this.contentStyle),role:`none`},[h(()=>r)],6)):null})),h(()=>k(u.footer,e=>{let t=this.footer?n([this.footer()]):e;return t&&(F(),w(`div`,{class:x([`${a}-card__footer`,this.footerClass]),style:L(this.footerStyle),role:`none`},[h(()=>t)],6))})),h(()=>k(u.action,e=>{let t=this.action?n([this.action()]):e;return t&&(F(),w(`div`,{class:x(`${a}-card__action`),role:`none`},[h(()=>t)],2))}))]),_:2},1032,[`class`,`style`,`role`])}});export{at as a,z as c,ot as i,se as l,dt as n,V as o,ft as r,B as s,_t as t};