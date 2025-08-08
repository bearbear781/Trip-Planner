
/* Gist Sync for Taipei Trip PWA (v4.3.8) — pure frontend
 * DANGER: 你目前把 Token 写进了前端。任何能访问页面的人都能在源码里看到。
 * 建议尽快在设置里改成你自己的 Token，并在公开环境删掉这段默认值。
 */
(function(){ 
  const FILE_NAME = 'taipei_trip_data.json';
  const KEY = 'TRIP_DATA_V4'; // 项目主数据键

  const cfg = {
    get token()  { return localStorage.getItem('cfg_gist_token') || ''; },
    set token(v) { localStorage.setItem('cfg_gist_token', v || ''); },
    get id()     { return localStorage.getItem('cfg_gist_id') || ''; },
    set id(v)    { localStorage.setItem('cfg_gist_id', v || ''); },
    get auto()   { return localStorage.getItem('cfg_gist_auto') === '1'; },
    set auto(b)  { localStorage.setItem('cfg_gist_auto', b?'1':'0'); },
    get etag()   { return localStorage.getItem('cfg_gist_etag') || ''; },
    set etag(v)  { localStorage.setItem('cfg_gist_etag', v || ''); },
  };

  function toast(msg) { try{App?.toast?.(msg)}catch(e){}; console.log('[GistSync]', msg); }

  function payload() { 
    return JSON.stringify({ _meta:{ts:Date.now()}, [KEY]: localStorage.getItem(KEY) }, null, 2); 
  }

  function apply(jsonStr){ 
    try{ const obj = JSON.parse(jsonStr); if(obj && obj[KEY]!=null) localStorage.setItem(KEY, obj[KEY]); toast('已从云恢复，刷新可见'); }catch(e){ toast('云数据解析失败'); }
  }

  async function createGist(token){ 
    const res = await fetch('https://api.github.com/gists', {
      method:'POST', headers:{'Authorization':'token '+token,'Content-Type':'application/json','Accept':'application/vnd.github+json'},
      body: JSON.stringify({ description:'Taipei Trip PWA Cloud Sync', public:false, files:{ [FILE_NAME]: { content: payload() } } })
    });
    if(!res.ok) throw new Error('创建 Gist 失败:'+res.status);
    const et = res.headers.get('ETag')||''; const j = await res.json();
    cfg.id = j.id; cfg.etag = et; return j.id;
  }

  async function patchGist(token, id){ 
    const res = await fetch(`https://api.github.com/gists/${id}`, {
      method:'PATCH', headers:{'Authorization':'token '+token,'Content-Type':'application/json','Accept':'application/vnd.github+json', ...(cfg.etag?{'If-None-Match':cfg.etag}:{})},
      body: JSON.stringify({ files:{ [FILE_NAME]: { content: payload() } } })
    });
    if(res.status===304) return false;
    if(!res.ok) throw new Error('更新失败:'+res.status);
    cfg.etag = res.headers.get('ETag')||''; return true;
  }

  async function getGist(token, id){ 
    const res = await fetch(`https://api.github.com/gists/${id}`, {
      headers:{'Authorization':'token '+token,'Accept':'application/vnd.github+json', ...(cfg.etag?{'If-None-Match':cfg.etag}:{})}
    });
    if(res.status===304) return {unchanged:true};
    if(!res.ok) throw new Error('获取失败:'+res.status);
    cfg.etag = res.headers.get('ETag')||''; const j = await res.json();
    const file = j.files && j.files[FILE_NAME]; if(!file) throw new Error('云端无文件');
    return { content:file.content };
  }

  async function push(){ 
    const t = document.getElementById('gist_token').value.trim() || cfg.token;
    if(!t) return toast('请先填写 Token');
    if(!cfg.id) { await createGist(t); toast('已创建云存档'); }
    const changed = await patchGist(t, cfg.id);
    cfg.token = t;
    toast(changed ? '上传成功' : '内容未变化');
    document.getElementById('gist_id').value = cfg.id;
  }

  async function pull(){ 
    const t = document.getElementById('gist_token').value.trim() || cfg.token;
    const id = document.getElementById('gist_id').value.trim() || cfg.id;
    if(!t || !id) return toast('请先填写 Token 与 Gist ID');
    const r = await getGist(t, id);
    if(r.unchanged) return toast('云端未变化');
    apply(r.content); cfg.token = t; cfg.id = id;
  }

  function bindUI(){
    const t = document.getElementById('gist_token');
    const g = document.getElementById('gist_id');
    const a = document.getElementById('gist_auto');
    const p = document.getElementById('btnGistPush');
    const l = document.getElementById('btnGistPull');
    if(!t||!g||!a||!p||!l) return;
    if(!cfg.token) { cfg.token = ''; }
    t.value = cfg.token; g.value = cfg.id; a.checked = cfg.auto;
    a.onchange = ()=> cfg.auto = a.checked;
    p.onclick = ()=> push().catch(e=>toast(e.message));
    l.onclick = ()=> pull().catch(e=>toast(e.message));
  }

  function hookSave(){
    if(!window.App || typeof App.save!=='function' || App.save.__hooked) return;
    const _save = App.save.bind(App);
    App.save = function(){ 
      const r = _save(); 
      try{ if(cfg.auto && cfg.token) push(); }catch(e){ console.warn('[GistSync] auto push fail', e); }
      return r;
    };
    App.save.__hooked = true;
  }

  window.GistSync = { push, pull };
  document.addEventListener('DOMContentLoaded', ()=>{ bindUI(); hookSave(); });
})();
