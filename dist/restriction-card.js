import{d as t,A as e,P as i,_ as n,p as o,c as r,L as s,h as a,a as c}from"./lit-element-bc66e600.js";
/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */const l=new WeakMap,d=t(t=>n=>{if(!(n instanceof e)||n instanceof i||"class"!==n.committer.name||n.committer.parts.length>1)throw new Error("The `classMap` directive must be used in the `class` attribute and must be the only part in the attribute.");const{committer:o}=n,{element:r}=o;l.has(n)||(r.className=o.strings.join(" "));const{classList:s}=r,a=l.get(n);for(const e in a)e in t||s.remove(e);for(const e in t){const i=t[e];if(!a||i!==a[e]){s[i?"add":"remove"](e)}}l.set(n,t)});var u={},h=/d{1,4}|M{1,4}|YY(?:YY)?|S{1,3}|Do|ZZ|([HhMsDm])\1?|[aA]|"[^"]*"|'[^']*'/g,m="[^\\s]+",f=/\[([^]*?)\]/gm,p=function(){};function g(t,e){for(var i=[],n=0,o=t.length;n<o;n++)i.push(t[n].substr(0,e));return i}function v(t){return function(e,i,n){var o=n[t].indexOf(i.charAt(0).toUpperCase()+i.substr(1).toLowerCase());~o&&(e.month=o)}}function y(t,e){for(t=String(t),e=e||2;t.length<e;)t="0"+t;return t}var b=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],w=["January","February","March","April","May","June","July","August","September","October","November","December"],_=g(w,3),k=g(b,3);u.i18n={dayNamesShort:k,dayNames:b,monthNamesShort:_,monthNames:w,amPm:["am","pm"],DoFn:function(t){return t+["th","st","nd","rd"][t%10>3?0:(t-t%10!=10)*t%10]}};var M={D:function(t){return t.getDate()},DD:function(t){return y(t.getDate())},Do:function(t,e){return e.DoFn(t.getDate())},d:function(t){return t.getDay()},dd:function(t){return y(t.getDay())},ddd:function(t,e){return e.dayNamesShort[t.getDay()]},dddd:function(t,e){return e.dayNames[t.getDay()]},M:function(t){return t.getMonth()+1},MM:function(t){return y(t.getMonth()+1)},MMM:function(t,e){return e.monthNamesShort[t.getMonth()]},MMMM:function(t,e){return e.monthNames[t.getMonth()]},YY:function(t){return y(String(t.getFullYear()),4).substr(2)},YYYY:function(t){return y(t.getFullYear(),4)},h:function(t){return t.getHours()%12||12},hh:function(t){return y(t.getHours()%12||12)},H:function(t){return t.getHours()},HH:function(t){return y(t.getHours())},m:function(t){return t.getMinutes()},mm:function(t){return y(t.getMinutes())},s:function(t){return t.getSeconds()},ss:function(t){return y(t.getSeconds())},S:function(t){return Math.round(t.getMilliseconds()/100)},SS:function(t){return y(Math.round(t.getMilliseconds()/10),2)},SSS:function(t){return y(t.getMilliseconds(),3)},a:function(t,e){return t.getHours()<12?e.amPm[0]:e.amPm[1]},A:function(t,e){return t.getHours()<12?e.amPm[0].toUpperCase():e.amPm[1].toUpperCase()},ZZ:function(t){var e=t.getTimezoneOffset();return(e>0?"-":"+")+y(100*Math.floor(Math.abs(e)/60)+Math.abs(e)%60,4)}},D={D:["\\d\\d?",function(t,e){t.day=e}],Do:["\\d\\d?"+m,function(t,e){t.day=parseInt(e,10)}],M:["\\d\\d?",function(t,e){t.month=e-1}],YY:["\\d\\d?",function(t,e){var i=+(""+(new Date).getFullYear()).substr(0,2);t.year=""+(e>68?i-1:i)+e}],h:["\\d\\d?",function(t,e){t.hour=e}],m:["\\d\\d?",function(t,e){t.minute=e}],s:["\\d\\d?",function(t,e){t.second=e}],YYYY:["\\d{4}",function(t,e){t.year=e}],S:["\\d",function(t,e){t.millisecond=100*e}],SS:["\\d{2}",function(t,e){t.millisecond=10*e}],SSS:["\\d{3}",function(t,e){t.millisecond=e}],d:["\\d\\d?",p],ddd:[m,p],MMM:[m,v("monthNamesShort")],MMMM:[m,v("monthNames")],a:[m,function(t,e,i){var n=e.toLowerCase();n===i.amPm[0]?t.isPm=!1:n===i.amPm[1]&&(t.isPm=!0)}],ZZ:["[^\\s]*?[\\+\\-]\\d\\d:?\\d\\d|[^\\s]*?Z",function(t,e){var i,n=(e+"").match(/([+-]|\d\d)/gi);n&&(i=60*n[1]+parseInt(n[2],10),t.timezoneOffset="+"===n[0]?i:-i)}]};D.dd=D.d,D.dddd=D.ddd,D.DD=D.D,D.mm=D.m,D.hh=D.H=D.HH=D.h,D.MM=D.M,D.ss=D.s,D.A=D.a,u.masks={default:"ddd MMM DD YYYY HH:mm:ss",shortDate:"M/D/YY",mediumDate:"MMM D, YYYY",longDate:"MMMM D, YYYY",fullDate:"dddd, MMMM D, YYYY",shortTime:"HH:mm",mediumTime:"HH:mm:ss",longTime:"HH:mm:ss.SSS"},u.format=function(t,e,i){var n=i||u.i18n;if("number"==typeof t&&(t=new Date(t)),"[object Date]"!==Object.prototype.toString.call(t)||isNaN(t.getTime()))throw new Error("Invalid Date in fecha.format");e=u.masks[e]||e||u.masks.default;var o=[];return(e=(e=e.replace(f,(function(t,e){return o.push(e),"@@@"}))).replace(h,(function(e){return e in M?M[e](t,n):e.slice(1,e.length-1)}))).replace(/@@@/g,(function(){return o.shift()}))},u.parse=function(t,e,i){var n=i||u.i18n;if("string"!=typeof e)throw new Error("Invalid format in fecha.parse");if(e=u.masks[e]||e,t.length>1e3)return null;var o={},r=[],s=[];e=e.replace(f,(function(t,e){return s.push(e),"@@@"}));var a,c=(a=e,a.replace(/[|\\{()[^$+*?.-]/g,"\\$&")).replace(h,(function(t){if(D[t]){var e=D[t];return r.push(e[1]),"("+e[0]+")"}return t}));c=c.replace(/@@@/g,(function(){return s.shift()}));var l=t.match(new RegExp(c,"i"));if(!l)return null;for(var d=1;d<l.length;d++)r[d-1](o,l[d],n);var m,p=new Date;return!0===o.isPm&&null!=o.hour&&12!=+o.hour?o.hour=+o.hour+12:!1===o.isPm&&12==+o.hour&&(o.hour=0),null!=o.timezoneOffset?(o.minute=+(o.minute||0)-+o.timezoneOffset,m=new Date(Date.UTC(o.year||p.getFullYear(),o.month||0,o.day||1,o.hour||0,o.minute||0,o.second||0,o.millisecond||0))):m=new Date(o.year||p.getFullYear(),o.month||0,o.day||1,o.hour||0,o.minute||0,o.second||0,o.millisecond||0),m};(function(){try{(new Date).toLocaleDateString("i")}catch(t){return"RangeError"===t.name}})(),function(){try{(new Date).toLocaleString("i")}catch(t){return"RangeError"===t.name}}(),function(){try{(new Date).toLocaleTimeString("i")}catch(t){return"RangeError"===t.name}}();var S=function(t,e,i,n){n=n||{},i=null==i?{}:i;var o=new Event(e,{bubbles:void 0===n.bubbles||n.bubbles,cancelable:Boolean(n.cancelable),composed:void 0===n.composed||n.composed});return o.detail=i,t.dispatchEvent(o),o},E=new Set(["call-service","divider","section","weblink","cast","select"]),Y={alert:"toggle",automation:"toggle",climate:"climate",cover:"cover",fan:"toggle",group:"group",input_boolean:"toggle",input_number:"input-number",input_select:"input-select",input_text:"input-text",light:"toggle",lock:"lock",media_player:"media-player",remote:"toggle",scene:"scene",script:"script",sensor:"sensor",timer:"timer",switch:"toggle",vacuum:"toggle",water_heater:"climate",input_datetime:"input-datetime"},x=function(t,e){var i=e.value||e,n=e.attribute?t.attributes[e.attribute]:t.state;switch(e.operator||"=="){case"==":return n===i;case"<=":return n<=i;case"<":return n<i;case">=":return n>=i;case">":return n>i;case"!=":return n!==i;case"regex":return n.match(i);default:return!1}};const T="ontouchstart"in window||navigator.maxTouchPoints>0||navigator.msMaxTouchPoints>0;class C extends HTMLElement{constructor(){super(),this.holdTime=500,this.ripple=document.createElement("mwc-ripple"),this.timer=void 0,this.held=!1,this.cooldownStart=!1,this.cooldownEnd=!1}connectedCallback(){Object.assign(this.style,{position:"absolute",width:T?"100px":"50px",height:T?"100px":"50px",transform:"translate(-50%, -50%)",pointerEvents:"none"}),this.appendChild(this.ripple),this.ripple.primary=!0,["touchcancel","mouseout","mouseup","touchmove","mousewheel","wheel","scroll"].forEach(t=>{document.addEventListener(t,()=>{clearTimeout(this.timer),this.stopAnimation(),this.timer=void 0},{passive:!0})})}bind(t,e){if(t.longPress)return;t.longPress=!0,t.addEventListener("contextmenu",t=>{const e=t||window.event;return e.preventDefault&&e.preventDefault(),e.stopPropagation&&e.stopPropagation(),e.cancelBubble=!0,e.returnValue=!1,!1});const i=t=>{if(this.cooldownStart)return;let e,i;this.held=!1,t.touches?(e=t.touches[0].pageX,i=t.touches[0].pageY):(e=t.pageX,i=t.pageY),this.timer=window.setTimeout(()=>{this.startAnimation(e,i),this.held=!0},this.holdTime),this.cooldownStart=!0,window.setTimeout(()=>this.cooldownStart=!1,100)},n=i=>{this.cooldownEnd||["touchend","touchcancel"].includes(i.type)&&void 0===this.timer||(clearTimeout(this.timer),this.stopAnimation(),this.timer=void 0,this.held?t.dispatchEvent(new Event("ha-hold")):e.hasDoubleClick?1===i.detail?this.dblClickTimeout=window.setTimeout(()=>{t.dispatchEvent(new Event("ha-click"))},250):(clearTimeout(this.dblClickTimeout),t.dispatchEvent(new Event("ha-dblclick"))):t.dispatchEvent(new Event("ha-click")),this.cooldownEnd=!0,window.setTimeout(()=>this.cooldownEnd=!1,100))};t.addEventListener("touchstart",i,{passive:!0}),t.addEventListener("touchend",n),t.addEventListener("touchcancel",n),window.navigator.userAgent.match(/iPhone OS 13_/)||(t.addEventListener("mousedown",i,{passive:!0}),t.addEventListener("click",n))}startAnimation(t,e){Object.assign(this.style,{left:`${t}px`,top:`${e}px`,display:null}),this.ripple.disabled=!1,this.ripple.active=!0,this.ripple.unbounded=!0}stopAnimation(){this.ripple.active=!1,this.ripple.disabled=!0,this.style.display="none"}}customElements.define("long-press-restriction",C);const H=(t,e)=>{const i=(()=>{const t=document.body;if(t.querySelector("long-press-restriction"))return t.querySelector("long-press-restriction");const e=document.createElement("long-press-restriction");return t.appendChild(e),e})();i&&i.bind(t,e)},P=t((t={})=>e=>{H(e.committer.element,t)}),R=()=>import("./dialog-confirmation-464e8244.js");let L=class extends s{set hass(t){this._hass=t;const e=this.shadowRoot.querySelector("#card > *");e&&(e.hass=t)}getCardSize(){const t=this.shadowRoot.querySelector("#card > *");return t&&"function"==typeof(e=t).getCardSize?e.getCardSize():1;var e}setConfig(t){if(!t.card)throw new Error("Error in card configuration.");if(t.restrictions&&t.restrictions.pin&&!t.restrictions.pin.code)throw new Error("A pin code is required for pin restrictions");this._config=Object.assign({duration:5,action:"tap"},t)}shouldUpdate(t){const e=t.get("hass");return!(!t.has("config")&&e)||!!(this._config&&this._config.condition&&this._config.condition.entity)&&e.states[this._config.condition.entity]!==this._hass.states[this._config.condition.entity]}render(){return this._config&&this._hass?this._config.restrictions&&this._matchRestriction(this._config.restrictions.hide)?a``:a`
      <div>
        ${this._config.exemptions&&this._config.exemptions.some(t=>t.user===this._hass.user.id)||this._config.condition&&!x(this._hass.states[this._config.condition.entity],this._config.condition)?"":a`
              <div
                @ha-click=${this._handleClick}
                @ha-hold=${this._handleHold}
                @ha-dblclick=${this._handleDblClick}
                .longPress=${P({hasDoubleClick:"double_tap"===this._config.action})}
                id="overlay"
                class="${d({blocked:!!this._config.restrictions&&this._matchRestriction(this._config.restrictions.block)})}"
              >
                <ha-icon
                  icon="mdi:lock-outline"
                  id="lock"
                  class="${d({row:Boolean(this._config.row)})}"
                ></ha-icon>
              </div>
            `}
        ${this.renderCard(this._config.card)}
      </div>
    `:a``}renderCard(t){const e=function(t,e){void 0===e&&(e=!1);var i=function(t,e){return n("hui-error-card",{type:"error",error:t,config:e})},n=function(t,e){var n=window.document.createElement(t);try{n.setConfig(e)}catch(n){return console.error(t,n),i(n.message,e)}return n};if(!t||"object"!=typeof t||!e&&!t.type)return i("No type defined",t);var o=t.type;if(o&&o.startsWith("custom:"))o=o.substr("custom:".length);else if(e)if(E.has(o))o="hui-"+o+"-row";else{if(!t.entity)return i("Invalid config given.",t);var r=t.entity.split(".",1)[0];o="hui-"+(Y[r]||"text")+"-entity-row"}else o="hui-"+o+"-card";if(customElements.get(o))return n(o,t);var s=i("Custom element doesn't exist: "+t.type+".",t);s.style.display="None";var a=setTimeout((function(){s.style.display=""}),2e3);return customElements.whenDefined(t.type).then((function(){clearTimeout(a),S(s,"ll-rebuild",{},s)})),s}(t,this._config.row);return this._hass&&(e.hass=this._hass),a`
      <div id="card">
        ${e}
      </div>
    `}_matchRestriction(t){return t&&(!t.exemptions||!t.exemptions.some(t=>t.user===this._hass.user.id))&&(!t.condition||x(this._hass.states[t.condition.entity],t.condition))}_handleClick(){"tap"===this._config.action&&this._handleRestriction()}_handleDblClick(){"double_tap"===this._config.action&&this._handleRestriction()}_handleHold(){"hold"===this._config.action&&this._handleRestriction()}_handleRestriction(){this.shadowRoot.getElementById("lock");if(this._config.restrictions){if(this._matchRestriction(this._config.restrictions.block))return this._config.restrictions.block.text&&alert(this._config.restrictions.block.text),void this._invalid();if(this._matchRestriction(this._config.restrictions.pin)){if(prompt(this._config.restrictions.pin.text||"Input pin code")!=this._config.restrictions.pin.code)return void this._invalid();this._unlodk()}this._matchRestriction(this._config.restrictions.confirm)&&(t=this,e={text:this._config.restrictions.confirm.text||"Are you sure you want to unlock?",confirm:()=>this._unlodk()},S(t,"show-dialog",{dialogTag:"dialog-confirmation",dialogImport:R,dialogParams:e}))}else this._unlodk();var t,e}_invalid(){const t=this.shadowRoot.getElementById("lock");t.classList.add("invalid"),window.setTimeout(()=>{t&&t.classList.remove("invalid")},3e3)}_unlodk(){const t=this.shadowRoot.getElementById("lock"),e=this.shadowRoot.getElementById("overlay");e.style.setProperty("pointer-events","none"),t.classList.add("hidden"),window.setTimeout(()=>{e.style.setProperty("pointer-events",""),t&&t.classList.remove("hidden")},1e3*this._config.duration)}static get styles(){return c`
      :host {
        display: block;
        position: relative;
        --regular-lock-color: var(
          --restriction-regular-lock-color,
          var(--primary-text-color, #212121)
        );
        --success-lock-color: var(
          --restriction-success-lock-color,
          var(--primary-color, #03a9f4)
        );
        --blocked-lock-color: var(
          --restriction-blocked-lock-color,
          var(--error-state-color, #db4437)
        );
        --invalid-lock-color: var(
          --restriction-invalid--color,
          var(--error-state-color, #db4437)
        );
        --lock-margin-left: var(--restriction-lock-margin-left, 0px);
      }
      #overlay {
        align-items: flex-start;
        padding: 8px 7px;
        opacity: 0.5;
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        z-index: 50;
        display: flex;
        color: var(--regular-lock-color);
      }
      .blocked {
        color: var(--blocked-lock-color) !important;
      }
      #lock {
        margin-left: var(--lock-margin-left);
      }
      .row {
        margin-left: 24px !important;
      }
      .hidden {
        visibility: hidden;
        opacity: 0;
        transition: visibility 0s 2s, opacity 2s linear;
        color: var(--success-lock-color);
      }
      @keyframes blinker {
        50% {
          opacity: 0;
        }
      }
      .invalid {
        animation: blinker 1s linear infinite;
        color: var(--invalid-lock-color);
      }
    `}};n([o()],L.prototype,"_config",void 0),n([o()],L.prototype,"_hass",void 0),L=n([r("restriction-card")],L);
