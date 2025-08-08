const KEY='TRIP_DATA_V4';
const App={
  data:{trip:{start:'',end:'',dest:'台北'}, team:[], tasks:[], itinerary:[], lodging:[], transport:[], packing:[], contacts:[], memories:[], expenses:[], settings:{theme:'dark', flightAlertHours:6}},
  load(){
    const raw=localStorage.getItem(KEY); if(raw){try{this.data=JSON.parse(raw);}catch(e){console.warn(e);}}
    if(!this.data.settings) this.data.settings={theme:'dark', flightAlertHours:6};
    UI.applyTheme(this.data.settings.theme||'dark');
    UI.renderAll();
  },
  save(){ localStorage.setItem(KEY, JSON.stringify(this.data)); UI.renderAll(); },
  show(id){ document.querySelectorAll('section.card').forEach(s=>s.hidden=true); document.getElementById(id).hidden=false;
    document.querySelectorAll('.nav a').forEach(a=>a.classList.remove('active'));
    document.querySelector(`.nav a[href="#${id}"]`)?.classList.add('active'); },
  exportJSON(){ const blob=new Blob([JSON.stringify(this.data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='trip_backup.json'; a.click(); },
  importJSON(e){ const f=e.target.files[0]; if(!f) return; const fr=new FileReader(); fr.onload=()=>{ try{ this.data=JSON.parse(fr.result); this.save(); alert('导入成功'); }catch(err){ alert('导入失败: '+err.message);} }; fr.readAsText(f); },
  saveTripInfo(){ this.data.trip.start=document.getElementById('st_start').value; this.data.trip.end=document.getElementById('st_end').value; this.data.trip.dest=document.getElementById('st_dest').value||'台北'; this.save(); },
};

const UI={
  navItems:[['home','🏠 首页'],['itinerary','📅 行程'],['lodging','🏨 住宿'],['transport','🚗 交通'],['packing','👜 物品'],['expenses','💰 记账'],['team','👥 团队'],['contacts','📞 联系'],['memories','📷 回忆'],['settings','⚙️ 设置']],
  _today(){ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; },
  _parseDT(date, time){ if(!date) return null; const t=time||'00:00'; return new Date(`${date}T${t}`); },
  _fmtTime(t){ return t? t.slice(0,5):''; },
  _attachPicker(id){ const el=document.getElementById(id); if(!el) return; const open=()=>{ if(el.showPicker) try{ el.showPicker(); }catch(e){} }; el.addEventListener('focus',open); el.addEventListener('click',open); },
  _parseDateSmart(str){
    if(!str) return null;
    if(/^\d{4}-\d{2}-\d{2}$/.test(str)){
      return new Date(str+'T00:00:00');
    }
    const m=str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(m){
      const d=parseInt(m[1],10), mo=parseInt(m[2],10), y=parseInt(m[3],10);
      if(mo>=1 && mo<=12 && d>=1 && d<=31) return new Date(y, mo-1, d);
    }
    return null;
  },

  // Theme
  applyTheme(mode){ document.body.classList.toggle('light', mode==='light'); },
  toggleTheme(){ const mode=(App.data.settings.theme||'dark')==='dark'?'light':'dark'; App.data.settings.theme=mode; App.save(); },

  // Nav
  renderNav(){ const nav=document.getElementById('nav'); nav.innerHTML=this.navItems.map(([id,title])=>`<a href="#${id}" class="${id==='home'?'active':''}" onclick="App.show('${id}')">${title}</a>`).join(''); document.getElementById('themeBtn').onclick=()=>UI.toggleTheme(); },

  // Home
  renderHome(){
    const t=App.data.trip;
    const start=document.getElementById('st_start'), end=document.getElementById('st_end'), dest=document.getElementById('st_dest');
    start.value=t.start||''; end.value=t.end||''; dest.value=t.dest||'台北'; this._attachPicker('st_start'); this._attachPicker('st_end');
    document.getElementById('tripDates').textContent=(t.start&&t.end)?`${t.start} → ${t.end} · ${t.dest}`:'未设置旅行日期';
    document.getElementById('teamCount').textContent = App.data.team.length + ' 人';
    // Flights to homepage
    this.renderFlightsHome();
    // Recent itinerary with end time
    const rows=[...App.data.itinerary].sort((a,b)=> (a.date||'').localeCompare(b.date)||(a.start||'').localeCompare(b.start)).slice(0,10);
    document.getElementById('recentIt').innerHTML = rows.length? '<table style="width:100%;border-collapse:collapse;"><tbody>'+rows.map(r=>`<tr><td style="padding:6px;border-bottom:1px dashed var(--line);">${r.date||''}</td><td style="padding:6px;border-bottom:1px dashed var(--line);">${(r.start||'').slice(0,5)} → ${(r.end||'').slice(0,5)}</td><td style="padding:6px;border-bottom:1px dashed var(--line);"><b>${r.title||''}</b><div class="small muted">${r.place||''}</div></td></tr>`).join('')+'</tbody></table>' : '还没有行程，先去添加吧。';
    // Mini calendar on home: jump to trip start month if available
    let monthOffset=0;
    try{
      const base=this._parseDateSmart(t.start);
      if(base){
        const now=new Date();
        monthOffset = (base.getFullYear()-now.getFullYear())*12 + (base.getMonth()-now.getMonth());
      }
    }catch(e){ monthOffset=0; }
    this.renderMiniCalendar('miniCalendar', monthOffset);
  },
  renderFlightsHome(){
    const list=document.getElementById('flightList');
    const H=App.data.settings.flightAlertHours||6;
    const flights = App.data.transport.filter(t=> (t.mode==='飞行'||t.mode==='飞机') );
    if(!flights.length){ list.innerHTML='没有“飞行”交通记录。'; return; }
    const rows=[...flights].sort((a,b)=> (a.date||'').localeCompare(b.date)||(a.out||'').localeCompare(b.out));
    const now=new Date();
    list.innerHTML = rows.map(f=>{
      const dep=this._parseDT(f.date, f.out); const arr=this._parseDT(f.date, f.in);
      const ms= dep? (dep-now):0; const hrs= ms/3600000;
      const urgent = dep && hrs<=H && hrs>0;
      const late = dep && hrs<=0;
      const badge = urgent? `<span class="chip danger">起飞 ${Math.max(0,Math.floor(hrs))}h 内</span>` : (late? `<span class="chip warn">已起飞</span>`:'');
      return `<div class="card flight">
        <div class="plane">✈️</div>
        <div>
          <div class="row"><b>${f.flight||'未填航班号'}</b> ${badge} <span class="pill">${f.mode}</span></div>
          <div class="small muted">${f.from||'—'} → ${f.to||'—'}</div>
          <div class="small">起飞：${f.date||''} ${(f.out||'').slice(0,5)}　抵达：${f.date||''} ${(f.in||'').slice(0,5)}</div>
        </div>
      </div>`;
    }).join('');
  },

  // Mini calendar (generic)
  renderMiniCalendar(elId, monthOffset=0){
    const el=document.getElementById(elId); if(!el) return;
    const baseDate=new Date(); baseDate.setMonth(baseDate.getMonth()+monthOffset); baseDate.setDate(1);
    const y=baseDate.getFullYear(), m=baseDate.getMonth();
    const firstDay=(new Date(y, m, 1)).getDay(); const days=new Date(y, m+1, 0).getDate();
    const events=new Set(App.data.itinerary.map(i=>i.date).filter(Boolean));
    const today = this._today();
    let html=`<div class="cal-head row"><button class="ghost" onclick="UI.renderMiniCalendar('${elId}', ${monthOffset-1})">◀</button><div class="right"></div><b>${y}-${String(m+1).padStart(2,'0')}</b><div class="spacer"></div><button class="ghost" onclick="UI.renderMiniCalendar('${elId}', ${monthOffset+1})">▶</button></div>`;
    html+=`<div class="cal-grid">`;
    const blanks= (firstDay+6)%7; // make Monday as first?
    for(let i=0;i<blanks;i++) html+=`<div></div>`;
    for(let d=1; d<=days; d++){
      const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const has=events.has(ds);
      const classes=['cal-cell'];
      if(ds===today) classes.push('today');
      if(has) classes.push('has');
      html+=`<div class="${classes.join(' ')}" onclick="UI.jumpToDate('${ds}')">${d}${has?'<div class="dot"></div>':''}</div>`;
    }
    html+=`</div>`;
    el.innerHTML=html;
  },
  jumpToDate(ds){ App.show('itinerary'); this._targetDate=ds; this.renderItinerary(); },

  // Itinerary
  addItinerary(){
    const v=id=>document.getElementById(id).value;
    const date=v('it_date')||this._today();
    App.data.itinerary.push({date, start:v('it_start'), end:v('it_end'), hours:parseFloat(v('it_hours')||0), title:v('it_title'), place:v('it_place'), mode:v('it_mode'), wear:v('it_wear'), walk:v('it_walk'), links:v('it_links'), note:v('it_note')});
    App.save();
    ['it_date','it_start','it_end','it_hours','it_title','it_place','it_wear','it_walk','it_links','it_note'].forEach(id=>document.getElementById(id).value='');
  },
  _groupByDate(list){ const m={}; list.forEach((x,i)=>{ (m[x.date]||(m[x.date]=[])).push({...x,__i:i}); }); return m; },
  renderItinerary(){
    // render calendar
    this.renderMiniCalendar('itCalendar');
    const wrap=document.getElementById('it_groups'); const dsel=this._targetDate;
    const rows=[...App.data.itinerary].sort((a,b)=> (a.date||'').localeCompare(b.date)||(a.start||'').localeCompare(b.start));
    const grouped=this._groupByDate(rows);
    const dates=Object.keys(grouped).sort();
    wrap.innerHTML = dates.map(ds=>{
      const list=grouped[ds];
      const blocks=list.map((r,idx)=>{
        // interval with previous
        let gap=''; if(idx>0){ const prev=list[idx-1]; if(prev.end && r.start){ const a=this._parseDT(r.date,r.start), b=this._parseDT(prev.date, prev.end); const diff=(a-b)/60000; if(diff>0){ const h=Math.floor(diff/60), m=Math.round(diff%60); gap=`<div class='small muted'>间隔：${h}h${m}m</div>`; } } }
        return `<div class="card" draggable="true" ondragstart="UI.dragStart(event, '${ds}', ${idx})">
          <div class="row action-row"><b>${(r.start||'').slice(0,5)} → ${(r.end||'').slice(0,5)}</b> <span class="pill">${r.mode||''}</span> <div class="spacer"></div><button class="ghost move" onclick="UI.moveItinerary(${r.__i})">移动</button><button class="ghost" onclick="UI.delItemByIndex('itinerary', ${r.__i})">删除</button></div>
          <div><b>${r.title||''}</b> <span class="small muted">${r.place||''}</span></div>
          ${gap}
          <div class="small muted">${r.walk||''}</div>
          ${r.links?`<div class="small"><a href="${r.links}" target="_blank">链接</a></div>`:''}
          <div class="small">${r.note||''}</div>
        </div>`;
      }).join('');
      const highlight = (this._targetDate===ds)? 'style="outline:2px solid var(--brand)"' : '';
      return `<div class="card" ${highlight}>
        <div class="row"><div class="kpi">📅 ${ds}</div></div>
        <div class="dropzone" ondragover="event.preventDefault()" ondrop="UI.dropToDate(event, '${ds}')">拖动行程到此日期</div>
        ${blocks || ''}
      </div>`;
    }).join('') || '<div class="small muted">还没有行程，先添加吧。</div>';
  },
  dragStart(ev, date, idx){ ev.dataTransfer.setData('text/plain', JSON.stringify({date, idx})); },
  dropToDate(ev, ds){ const info=JSON.parse(ev.dataTransfer.getData('text/plain')); // move item between dates
    const rows=[...App.data.itinerary].sort((a,b)=> (a.date||'').localeCompare(b.date)||(a.start||'').localeCompare(b.start));
    const group=this._groupByDate(rows)[info.date]; const item=group[info.idx];
    // find original in App.data.itinerary via fields + index saved earlier __i
    const originalIndex=item.__i;
    App.data.itinerary[originalIndex].date=ds;
    App.save();
  },
  moveItinerary(i){
    const ds = prompt('移动到日期 (YYYY-MM-DD)：', this._today());
    if(!ds) return;
    const r = App.data.itinerary[i];
    if(!r) return;
    r.date = ds;
    App.save();
  },
  delItemByIndex(coll,i){ App.data[coll].splice(i,1); App.save(); },

  // Lodging
  addLodging(){
    const v=id=>document.getElementById(id).value;
    App.data.lodging.push({date:v('lo_date')||this._today(), name:v('lo_name'), room:v('lo_room'), addr:v('lo_addr'), in:v('lo_in'), out:v('lo_out'), link:v('lo_link'), contact:v('lo_contact'), assign:v('lo_assign'), note:v('lo_note')});
    App.save();
  },
  renderLodging(){
    const tb=document.querySelector('#lo_table tbody');
    const rows=[...App.data.lodging].sort((a,b)=>(a.date||'').localeCompare(b.date));
    tb.innerHTML=rows.map((r,i)=>`<tr><td>${r.date||''}</td><td>${r.name||''}<div class="small muted">${r.room||''}</div></td><td>${r.addr||''}<div class="small"><a href="https://maps.google.com/?q=${encodeURIComponent(r.addr||'')}" target="_blank">地图</a></div></td><td>${r.in||''}-${r.out||''}</td><td>${r.contact||''}</td><td>${r.assign||''}</td><td><button class="ghost" onclick="UI.delItemByIndex('lodging',${i})">删除</button></td></tr>`).join('');
  },

  // Transport
  addTransport(){
    const v=id=>document.getElementById(id).value;
    App.data.transport.push({date:v('tr_date')||this._today(), out:v('tr_out'), in:v('tr_in'), mode:v('tr_mode'), flight:v('tr_flight'), from:v('tr_from'), to:v('tr_to'), meet:v('tr_meet'), info:v('tr_info'), link:v('tr_link'), note:v('tr_note')});
    App.save();
  },
  renderTransport(){
    const tb=document.querySelector('#tr_table tbody');
    const rows=[...App.data.transport].sort((a,b)=> (a.date||'').localeCompare(b.date)||(a.out||'').localeCompare(b.out));
    tb.innerHTML=rows.map((r,i)=>`<tr><td>${r.date||''}</td><td>${r.out||''}-${r.in||''}</td><td>${r.mode||''}</td><td>${r.flight||''}<div class="small muted">${(r.from||'')} → ${(r.to||'')}</div></td><td>${r.meet||''}<div class="small muted">${r.info||''}</div></td><td>${r.note||''}</td><td><button class="ghost" onclick="UI.delItemByIndex('transport',${i})">删除</button></td></tr>`).join('');
  },

  // Packing
  addPack(){ const v=id=>document.getElementById(id).value; App.data.packing.push({name:v('pk_name'), group:v('pk_group')||'—', note:v('pk_note'), done:false}); App.save(); },
  togglePack(i){ App.data.packing[i].done=!App.data.packing[i].done; App.save(); },
  loadDefaultPack(){
    const preset=["衣服","裤子","底裤","安全裤","内衣","外套","Pad","毛巾","牙刷","牙膏","Charger","Shampoo","转换头","脏衣服袋子","化妆品","口红","眼药水","绑头发","Passport","钱","卡","药(panadol)/fibre","iPad","Airpods","Boarding pass","鞋子","袜子","香水","双眼皮贴","假睫毛","Powebank","隐形眼镜/墨镜","眼镜布","Wet tissue","梳子","洗脸巾","洗脸水","洗衣液","Apple Watch and charger","首饰","润唇膏","防晒霜","雨伞","充电线"];
    preset.forEach(p=>App.data.packing.push({name:p, group:'—', note:'', done:false})); App.save();
  },
  changePackGroup(i,val){ App.data.packing[i].group=val; App.save(); },
  renderPacking(){
    const wrap=document.getElementById('pk_groups');
    const groups={};
    App.data.packing.forEach((item,i)=>{ const g=item.group||'—'; (groups[g]||(groups[g]=[])).push({item,i}); });
    const allGroups=Object.keys(groups).sort();
    wrap.innerHTML = allGroups.map(g=>{
      const rows = groups[g].map(({item,i})=>`
        <tr>
          <td style="width:28px;"><input type="checkbox" ${item.done?'checked':''} onchange="UI.togglePack(${i})"></td>
          <td>${item.name}</td>
          <td><input value="${item.group||''}" onchange="UI.changePackGroup(${i}, this.value)" style="width:120px;padding:4px 8px;background:var(--input);border:1px solid var(--line);border-radius:8px;"></td>
          <td>${item.note||''}</td>
          <td><button class="ghost" onclick="UI.delItemByIndex('packing',${i})">删除</button></td>
        </tr>`).join('');
      return `<div class="card">
        <div class="row" onclick="this.nextElementSibling.hidden=!this.nextElementSibling.hidden" style="cursor:pointer;"><b>${g}</b> <span class="small muted">(${groups[g].length})</span><div class="spacer"></div>▼</div>
        <div><table style="width:100%;"><thead><tr><th style="width:28px;"></th><th>物品</th><th style="width:160px;">分组</th><th>备注</th><th style="width:60px;"></th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>`;
    }).join('') || '<div class="small muted">还没有物品，先添加吧。</div>';
  },

  // Expenses
  _teamOptions(){ return App.data.team.map(t=>`<option value="${t.name}">${t.name}</option>`).join(''); },
  refreshExpenseSelectors(){
    document.getElementById('ex_payer').innerHTML = `<option value="">（选择付款人）</option>` + this._teamOptions();
    const cont=document.getElementById('ex_participants');
    const team=App.data.team.map(t=>t.name);
    cont.innerHTML = team.map(n=>`<label class="chip" style="margin:4px;display:inline-flex;align-items:center;gap:6px;"><input type="checkbox" value="${n}">${n}</label>`).join('');
  },
  participantsSelectAll(flag){
    document.querySelectorAll('#ex_participants input[type=checkbox]').forEach(c=>c.checked=!!flag);
  },
  _selectedParticipants(){
    return Array.from(document.querySelectorAll('#ex_participants input[type=checkbox]:checked')).map(c=>c.value);
  },
  addExpense(){
    const v=id=>document.getElementById(id).value;
    const ccy=v('ex_ccy'); const fx=parseFloat(v('ex_fx')||0);
    if(ccy==='TWD' && !(fx>0)) { alert('TWD 需要填写汇率 (TWD→MYR) 才能记录'); return; }
    const amt=parseFloat(v('ex_amount')||0);
    const myr = ccy==='MYR'? amt : amt*fx;
    const payer = v('ex_payer')? [v('ex_payer')] : [];
    const participants = this._selectedParticipants();
    const catSel = v('ex_cat'); const cat = catSel==='其他' ? (document.getElementById('ex_cat_other').value||'其他') : catSel;
    const file = document.getElementById('ex_bill').files[0];
    const rec = {date:v('ex_date')||this._today(), time:v('ex_time'), amount:amt, ccy, fx:fx||0, myr, place:v('ex_place'), desc:v('ex_desc'), payer, participants, treat:(v('ex_treat')==='yes'), cat, method:v('ex_method'), bill:''};
    const push=()=>{ App.data.expenses.push(rec); App.save(); document.getElementById('ex_bill').value=''; };
    if(file){ const r=new FileReader(); r.onload=()=>{ rec.bill=r.result; push(); }; r.readAsDataURL(file);} else { push(); }
  },
  viewBill(src){ if(!src) return; const v=document.getElementById('imgViewer'); const img=document.getElementById('imgView'); img.src=src; v.style.display='flex'; },
  renderExpenses(){
    this.refreshExpenseSelectors();
    const tb=document.querySelector('#ex_table tbody');
    const rows=[...App.data.expenses].sort((a,b)=> (a.date||'').localeCompare(b.date) || (a.time||'').localeCompare(b.time||''));
    tb.innerHTML=rows.map((r,i)=>`
      <tr>
        <td>${r.date||''} ${r.time||''}</td>
        <td>${(r.myr||0).toFixed(2)}</td>
        <td>${r.amount?.toFixed? r.amount.toFixed(2):r.amount} ${r.ccy}${r.fx?`<div class="small muted">fx ${r.fx}</div>`:''}</td>
        <td>${r.place||''}<div class="small muted">${r.desc||''}</div></td>
        <td class="small">${(r.participants||[]).join(', ')}</td>
        <td class="small">${(r.payer||[]).join(', ')}</td>
        <td>${r.cat||''}</td>
        <td>${r.method||''}</td>
        <td>${r.bill?`<img src="${r.bill}" class="thumb" onclick="UI.viewBill('${'__URL__'}'.replace('__URL__', r.bill))">`:'—'}</td>
        <td><button class="ghost" onclick="UI.delItemByIndex('expenses',${i})">删除</button></td>
      </tr>`).join('');
    UI.recalc();
    UI.drawCharts();
  },
  exportCSV(){
    const rows=[['date','time','amount_myr','amount_orig','ccy','fx','place','desc','payer','participants','treat','cat','method','has_bill']];
    App.data.expenses.forEach(e=> rows.push([e.date||'', e.time||'', (e.myr||0).toFixed(2), e.amount||0, e.ccy||'', e.fx||0, e.place||'', e.desc||'', (e.payer||[]).join(';'), (e.participants||[]).join(';'), e.treat?'yes':'no', e.cat||'', e.method||'', e.bill? 'yes':'no']));
    const csv=rows.map(r=>r.map(x=> `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob(["\ufeff"+csv],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='expenses.csv'; a.click();
  },
  recalc(){
    const members=App.data.team.map(t=>t.name);
    const totals={}; members.forEach(m=> totals[m]={paid:0, owe:0});
    App.data.expenses.forEach(e=>{
      if(e.treat) return; // 请客完全不计入统计（修正逻辑）
      const participants=(e.participants&&e.participants.length)? e.participants : members;
      const payers=(e.payer&&e.payer.length)? e.payer : [];
      const amtMYR = e.myr||0;
      if(!participants.length) return;
      const share = amtMYR / participants.length;
      participants.forEach(p=> totals[p] && (totals[p].owe += share));
      payers.forEach(p=> totals[p] && (totals[p].paid += amtMYR/payers.length));
    });
    const lines=[];
    Object.entries(totals).forEach(([m,v])=>{
      const diff=(v.paid - v.owe);
      const cls= diff>0?'ok':(diff<0?'danger':'badge');
      lines.push(`<div class="chip ${cls}">${m}: ${diff.toFixed(2)} MYR</div>`);
    });
    document.getElementById('settlement').innerHTML = `<div class="row small"><div>结算差额（MYR，+应收 / -应付）：</div> ${lines.join('')}</div>`;
  },
  drawCharts(){
    // Pie by category
    const catSum={};
    App.data.expenses.forEach(e=>{ if(e.treat) return; const v=e.myr||0; catSum[e.cat||'其他']=(catSum[e.cat||'其他']||0)+v; });
    const catLabels=Object.keys(catSum); const catVals=catLabels.map(k=>catSum[k]);
    this._drawPie('chartCat', catVals, catLabels);
    // Bar by member (net)
    const members=App.data.team.map(t=>t.name);
    const totals={}; members.forEach(m=> totals[m]=0);
    App.data.expenses.forEach(e=>{
      if(e.treat) return;
      const participants=(e.participants&&e.participants.length)? e.participants : members;
      const payers=(e.payer&&e.payer.length)? e.payer : [];
      const amtMYR = e.myr||0;
      const share = amtMYR / participants.length;
      participants.forEach(p=> totals[p] -= share);
      payers.forEach(p=> totals[p] += amtMYR/payers.length);
    });
    const peoLabels=Object.keys(totals); const peoVals=peoLabels.map(k=>totals[k]);
    this._drawBar('chartPeople', peoVals, peoLabels);
  },
  _drawPie(cid, data, labels){
    const c=document.getElementById(cid); if(!c) return; const ctx=c.getContext('2d'); const W=c.width=c.clientWidth; const H=c.height=c.clientHeight;
    ctx.clearRect(0,0,W,H);
    const total=data.reduce((a,b)=>a+b,0)||1;
    let start= -Math.PI/2;
    for(let i=0;i<data.length;i++){
      const val=data[i]; const ang= val/total * Math.PI*2;
      ctx.beginPath(); ctx.moveTo(W/2,H/2); ctx.arc(W/2,H/2, Math.min(W,H)/2-10, start, start+ang); ctx.closePath();
      ctx.fillStyle=`hsl(${(i*57)%360} 70% 50%)`; ctx.fill();
      // label
      const mid=start+ang/2; const rx=(W/2)+Math.cos(mid)*(Math.min(W,H)/4); const ry=(H/2)+Math.sin(mid)*(Math.min(W,H)/4);
      ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--text'); ctx.font='12px system-ui'; ctx.fillText(labels[i]||'', rx-10, ry);
      start+=ang;
    }
  },
  _drawBar(cid, data, labels){
    const c=document.getElementById(cid); if(!c) return; const ctx=c.getContext('2d'); const W=c.width=c.clientWidth; const H=c.height=c.clientHeight;
    ctx.clearRect(0,0,W,H);
    const max=Math.max(...data.map(v=>Math.abs(v)), 1);
    const pad=30; const barW=(W-2*pad)/data.length*0.7; const gap=((W-2*pad)/data.length - barW);
    ctx.strokeStyle=getComputedStyle(document.body).getPropertyValue('--line'); ctx.beginPath(); ctx.moveTo(pad, H-20); ctx.lineTo(W-pad, H-20); ctx.stroke();
    ctx.font='12px system-ui'; ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--text');
    data.forEach((v,i)=>{
      const x=pad + i*(barW+gap);
      const h=(H-40) * (Math.abs(v)/max);
      const y=v>=0 ? (H-20-h) : (H-20);
      ctx.fillStyle = v>=0 ? 'hsl(140 60% 45%)' : 'hsl(0 70% 55%)';
      ctx.fillRect(x, y, barW, h);
      ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--text');
      ctx.fillText(labels[i]||'', x, H-5);
    });
  },

  // Team
  addTeam(){
    const n=document.getElementById('tm_name').value.trim(); if(!n) return alert('请输入姓名');
    App.data.team.push({name:n, contact:document.getElementById('tm_contact').value}); App.save();
  },
  loadDefaultTeam(){ ['大哥','大姐','二姐','三姐','妹妹','爸爸','妈咪','丽萍','Weitao','Baby'].forEach(n=>App.data.team.push({name:n, contact:''})); App.save(); },
  renderTeam(){
    const tb=document.querySelector('#tm_table tbody');
    tb.innerHTML=App.data.team.map((t,i)=>`<tr><td>${t.name}</td><td>${t.contact||''}</td><td><button class="ghost" onclick="UI.delItemByIndex('team',${i})">删除</button></td></tr>`).join('');
    document.getElementById('teamCount').textContent=App.data.team.length + ' 人';
    UI.refreshExpenseSelectors();
  },

  // Contacts
  addContact(){ App.data.contacts.push({name:document.getElementById('ct_name').value, phone:document.getElementById('ct_phone').value, role:document.getElementById('ct_role').value}); App.save(); },
  loadDefaultContacts(){ [{name:'台湾报警',phone:'110',role:'报警求助'},{name:'台湾救护车',phone:'119',role:'急救'},{name:'旅行社/包车司机',phone:'待补充',role:'出行支持'}].forEach(c=>App.data.contacts.push(c)); App.save(); },
  renderContacts(){ const tb=document.querySelector('#ct_table tbody'); tb.innerHTML=App.data.contacts.map((c,i)=>`<tr><td>${c.name}</td><td><a href="tel:${c.phone}">${c.phone}</a></td><td>${c.role||''}</td><td><button class="ghost" onclick="UI.delItemByIndex('contacts',${i})">删除</button></td></tr>`).join(''); },

  // Memories
  addMemory(){
    let d=document.getElementById('mm_date').value; if(!d) d=this._today();
    App.data.memories.push({date:d, url:document.getElementById('mm_url').value, note:document.getElementById('mm_note').value}); App.save();
  },
  renderMemories(){ const tb=document.querySelector('#mm_table tbody'); const rows=[...App.data.memories].sort((a,b)=>(a.date||'').localeCompare(b.date)); tb.innerHTML=rows.map((m,i)=>`<tr><td>${m.date||''}</td><td>${m.url?`<a href="${m.url}" target="_blank">打开链接</a>`:''}</td><td>${m.note||''}</td><td><button class="ghost" onclick="UI.delItemByIndex('memories',${i})">删除</button></td></tr>`).join(''); },

  // Settings
  saveSettings(){ const x=parseInt(document.getElementById('set_flight_alert').value||'6'); App.data.settings.flightAlertHours=Math.max(1,x); App.save(); },

  // Common
  renderAll(){
    this.renderNav(); this.renderHome(); this.renderItinerary(); this.renderLodging(); this.renderTransport();
    this.renderPacking(); this.renderExpenses(); this.renderTeam(); this.renderContacts(); this.renderMemories();
    // settings
    document.getElementById('set_flight_alert').value = App.data.settings.flightAlertHours||6;
  }
};

window.App=App; window.UI=UI;
document.addEventListener('DOMContentLoaded',()=>{ UI.renderNav(); App.load(); App.show(location.hash?.replace('#','')||'home'); });
