/* ============================================================
   FOB COMMUNITY :: NAME ACCESS
   Approved members enter with their confirmed full name only.
   The server returns a one-time Supabase token so the rest of the
   Forum keeps using its existing authenticated RLS architecture.
   ============================================================ */
(function(){
  'use strict';
  var FOB=(window.FOB=window.FOB||{});
  document.addEventListener('DOMContentLoaded',function(){
    if(!FOB.guardConfigured()) return;
    var form=document.getElementById('form-name-access');
    var input=document.getElementById('forum-full-name');
    var status=document.getElementById('auth-status');
    if(!form||!input) return;

    form.addEventListener('submit',function(e){
      e.preventDefault();
      var full=input.value.trim().replace(/\s+/g,' ');
      var btn=form.querySelector('button[type=submit]');
      if(full.split(' ').filter(Boolean).length<2){
        return FOB.setStatus(status,'Enter your confirmed first and last name.','error');
      }
      btn.disabled=true;
      FOB.setStatus(status,'Opening your Forum access...','');
      fetch('/.netlify/functions/community-name-access',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName:full})
      }).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||'Access could not be opened.');return j;});})
        .then(function(j){
          return FOB.supabase.auth.verifyOtp({token_hash:j.token_hash,type:j.type||'magiclink'});
        })
        .then(function(res){
          if(res.error) throw res.error;
          return FOB.loadOwnProfile(res.data.user.id);
        })
        .then(function(){
          window.location.replace(FOB.redirectParam()||'/community/discussions.html');
        })
        .catch(function(err){
          FOB.setStatus(status,(err&&err.message)||'Forum access could not be opened right now.','error');
          btn.disabled=false;
        });
    });
  });
})();
