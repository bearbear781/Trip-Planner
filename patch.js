/* --- Patch v4.3.6 JS --- */
(function(){
  function onReady(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  console.log('[patch v4.3.6] active', new Date().toISOString());

  /* util */
  function parseISO(d){ try{ if(!d) return null; return new Date(d+'T00:00:00'); }catch(e){ return null; } }

  /* 1) Home mini calendar: delegate to app's renderer to avoid double rendering */
  function renderHomeMini(){
    const box = document.getElementById('miniCalendar');
    if(!box || !window.UI || !UI.renderMiniCalendar) return;
    try{ UI.renderMiniCalendar('miniCalendar'); }catch(e){ /* noop */ }
  }
  onReady(renderHomeMini);
  // Do not override App.save; App.save already triggers full re-render including mini calendar

  /* 2) Lodging label rename */
  function renameBooking(){
    $all('#lodging label').forEach(l=>{
      if((l.textContent||'').trim()==='预订链接'){ l.textContent='相关链接'; }
    });
  }
  onReady(renameBooking); setTimeout(renameBooking, 300);

  /* 3) Itinerary edit */
  function attachItineraryEdit(){
    const cards = $all('#it_groups .card');
    if(!cards.length || !window.App) return;
    cards.forEach(card=>{
      if(card.querySelector('button._edit')) return;
      const delBtn = $all('button', card).find(b=>(b.getAttribute('onclick')||'').includes("delItemByIndex('itinerary'"));
      if(!delBtn) return;
      const m = (delBtn.getAttribute('onclick')||'').match(/itinerary',\s*(\d+)\)/);
      if(!m) return;
      const idx = +m[1];
      const edit = document.createElement('button');
      edit.className='ghost _edit'; edit.textContent='修改';
      edit.addEventListener('click', ()=>{
        const r=(App.data.itinerary||[])[idx]; if(!r) return;
        const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v||''; };
        set('it_date', r.date);
        set('it_start', r.start);
        set('it_end', r.end);
        set('it_title', r.title);
        set('it_place', r.place);
        set('it_mode', r.mode);
        set('it_note', r.note);
        window._itEditing = idx;
        const addBtn = $all('#itinerary button').find(b=>(b.textContent||'').includes('添加行程'));
        if(addBtn) addBtn.textContent='保存修改';
      });
      delBtn.parentElement.insertBefore(edit, delBtn);
    });
  }
  function hookItinerary(){
    if(window.UI && UI.addItinerary){
      const _add = UI.addItinerary.bind(UI);
      UI.addItinerary = function(){
        if(window._itEditing!=null){
          const i=window._itEditing;
          const v=id=>document.getElementById(id)?.value||'';
          const r=(App.data.itinerary||[])[i];
          if(r){ Object.assign(r, {date:v('it_date')||r.date,start:v('it_start'),end:v('it_end'),title:v('it_title'),place:v('it_place'),mode:v('it_mode'),note:v('it_note')}); App.save(); }
          window._itEditing=null;
          const addBtn = $all('#itinerary button').find(b=>(b.textContent||'').includes('保存修改'));
          if(addBtn) addBtn.textContent='添加行程';
        }else{ _add(); }
      };
      if(UI.renderItinerary){
        const _r = UI.renderItinerary.bind(UI);
        UI.renderItinerary = function(){ _r(); attachItineraryEdit(); };
      }
      attachItineraryEdit();
    }
  }
  onReady(()=>setTimeout(hookItinerary, 100));

  /* 4) Expense table modifications */
  function wrapExpenseTable(){
    const tbl = document.getElementById('ex_table');
    if(tbl && !document.getElementById('ex_table_wrap')){
      const wrap = document.createElement('div');
      wrap.id = 'ex_table_wrap';
      tbl.parentNode.insertBefore(wrap, tbl);
      wrap.appendChild(tbl);
    }
  }
  function addTreatColAndRemoveCharts(){
    const tbl = document.getElementById('ex_table');
    if(tbl){
      const head = tbl.querySelector('thead tr');
      if(head && !Array.from(head.children).some(th=>/请客/.test(th.textContent||''))){
        const th=document.createElement('th'); th.textContent='请客'; head.appendChild(th);
      }
      const rows = tbl.querySelectorAll('tbody tr');
      rows.forEach((tr,i)=>{
        if(tr.querySelector('td._treat')) return;
        const e=(App.data.expenses||[])[i];
        const td=document.createElement('td'); td.className='_treat'; td.textContent = (e && e.treat)?'是':'否';
        tr.appendChild(td);
      });
    }
    // Remove chart cards by title text
    $all('#expenses .card').forEach(card=>{
      const h3 = card.querySelector('h3');
      const t = (h3 && h3.textContent || '').trim();
      if(t==='支出分类图' || t==='按人结算图'){ card.setAttribute('data-hide','charts'); card.remove(); }
    });
  }
  function patchExpense(){
    wrapExpenseTable();
    addTreatColAndRemoveCharts();
    // Remove "重新统计"
    const btn = $all('button').find(b=>/重新统计/.test(b.textContent||''));
    if(btn) btn.remove();
  }
  onReady(()=>setTimeout(patchExpense, 200));
  if(window.UI && UI.renderExpenses){
    const _re=UI.renderExpenses.bind(UI);
    UI.renderExpenses=function(){ _re(); patchExpense(); };
  }

  /* 5) Hide Memories tab robust */
  function hideMem(){
    $all('nav a, .tabs a').forEach(a=>{
      const t=(a.textContent||'').trim();
      if(t==='回忆'){ a.classList.add('_hide_mem'); a.style.display='none'; }
      const href=a.getAttribute('href')||'';
      if(/#memories/.test(href)){ a.classList.add('_hide_mem'); a.style.display='none'; }
    });
    const sec=document.getElementById('memories'); if(sec) sec.style.display='none';
  }
  onReady(hideMem); setTimeout(hideMem, 200);

  /* 6) Inject Telegram fields + test button and storage; simple sender */
  function injectTelegram(){
    const sec=document.getElementById('settings'); if(!sec) return;
    if(document.getElementById('tg_token')) return;
    const card = sec.querySelector('.card') || sec;
    const wrap=document.createElement('div');
    wrap.className='tg-grid';
    wrap.innerHTML = `
      <div><label>Telegram Bot Token</label><input id="tg_token" placeholder="123456:ABC-DEF"></div>
      <div><label>Telegram Chat ID</label><input id="tg_chat" placeholder="123456789"></div>
    `;
    card.appendChild(wrap);
    const actions = document.createElement('div');
    actions.className='tg-actions';
    actions.innerHTML = `<button id="tg_test" class="ghost">发送测试消息</button>`;
    card.appendChild(actions);

    const st=(App.data.settings=App.data.settings||{});
    if(st.tgToken) document.getElementById('tg_token').value=st.tgToken;
    if(st.tgChat)  document.getElementById('tg_chat').value=st.tgChat;

    function persist(){
      const set=App.data.settings=App.data.settings||{};
      set.tgToken = document.getElementById('tg_token').value.trim();
      set.tgChat  = document.getElementById('tg_chat').value.trim();
      if(App.save) App.save();
    }
    document.getElementById('tg_token').addEventListener('change', persist);
    document.getElementById('tg_chat').addEventListener('change', persist);

    async function sendTelegram(text){
      try{
        const token = document.getElementById('tg_token').value.trim();
        const chat  = document.getElementById('tg_chat').value.trim();
        if(!token || !chat){ alert('请先填写 Bot Token 与 Chat ID'); return; }
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({chat_id: chat, text}) });
        const j = await res.json();
        if(j && j.ok){ alert('已发送'); } else { console.warn(j); alert('发送失败，请检查 Token/Chat ID'); }
      }catch(e){ console.error(e); alert('发送失败：'+e.message); }
    }
    window.sendTelegram = sendTelegram;
    document.getElementById('tg_test').addEventListener('click', ()=> sendTelegram('Hello from Taipei Trip App ✅'));

    // Example: airport reminder hook (not auto, but function available)
    window.tgNotifyFlight = (msg)=> sendTelegram('✈️ '+msg);
  }
  onReady(()=>setTimeout(injectTelegram, 100));
})();