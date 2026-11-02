/* 本地补丁：图库缩略图 .webp 改写（原内联在 main.js，升级 1.6.17 时迁出，2026-10-29） */
function qwThumbUrl(u){try{if(!u||u.indexOf("/qwthumb/")!==-1)return null;if(u.indexOf("cos.yuyt.cn")!==-1)return "https://cos.yuyt.cn/qwthumb/"+u.split("/").pop()+".webp";if(u.indexOf("pic.yuyt.cn")!==-1)return "https://cos.yuyt.cn/qwthumb/"+u.split("pic.yuyt.cn/")[1].replace(/\//g,"_")+".webp";return null}catch(e){return null}}
function qwApplySSR(){try{document.querySelectorAll(".photo-item img,.photo-gallery img").forEach(function(im){if(im.dataset.qwThumb)return;var u=im.getAttribute("src")||"";var t=qwThumbUrl(u);if(!t)return;im.dataset.qwThumb="1";im.onerror=function(){im.onerror=null;im.src=u};im.src=t})}catch(e){}}
qwApplySSR();
var _qwMo=new MutationObserver(function(){clearTimeout(window._qwT);window._qwT=setTimeout(qwApplySSR,150)});
if(document.body){_qwMo.observe(document.body,{childList:true,subtree:true})}else{document.addEventListener("DOMContentLoaded",function(){_qwMo.observe(document.body,{childList:true,subtree:true})})}
window.addEventListener("load",qwApplySSR);
