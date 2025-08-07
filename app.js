// Simple offline-first trip planner for personal use.
// Data model stored in localStorage under key TRIP_DATA.
// Author: You + ChatGPT

const KEY = 'TRIP_DATA_V1';

const App = {
  data: {
    trip: { start:'', end:'', dest:'台北' },
    team: [], tasks: [],
    itinerary: [], lodging: [], transport: [],
    packing: [], contacts: [], memories: [],
    expenses: [], budget: { food:0, hotel:0, trans:0, other:0 },
  },

  load(){
    const raw = localStorage.getItem(KEY);
    if(raw){ try{ this.data = JSON.parse(raw); }catch(e){ console.warn(e); } }
    UI.renderAll();
  },

  save(){
    localStorage.setItem(KEY, JSON.stringify(this.data));
    UI.renderAll();
  },

  show(id){
    document.querySelectorAll('section.card').forEach(sec => sec.hidden = true);
    document.getElementById(id).hidden = false;
    document.querySelectorAll('.pill').forEach(a=>a.classList.remove('active'));
    document.querySelector(`.pill[data-tab="${id}"]`)?.classList.add('active');
    document.querySelectorAll('.nav a').forEach(a=>a.classList.remove('active'));
    document.querySelector(`.nav a[href="#${id}"]`)?.classList.add('active');
  },

  exportJSON(){
    const blob = new Blob([JSON.stringify(this.data, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'trip_backup.json';
    a.click();
  },

  importJSON(e){
    const file = e.target.files[0];
    if(!file) return;
    const fr = new FileReader();
    fr.onload = () => { try{
      this.data = JSON.parse(fr.result);
      this.save();
      alert('导入成功');
    }catch(err){ alert('导入失败：'+err.message); } };
    fr.readAsText(file);
  },

  saveTripInfo(){
    this.data.trip.start = document.getElementById('st_start').value;
    this.data.trip.end = document.getElementById('st_end').value;
    this.data.trip.dest = document.getElementById('st_dest').value || '台北';
    this.save();
  },
};

const UI = {
  navItems: [
    ['home','🏠 首页'],['itinerary','📅 行程'],['lodging','🏨 住宿'],['transport','🚗 交通'],
    ['packing','👜 物品'],['expenses','💰 记账'],['budget','📊 预算'],['team','👥 团队'],
    ['contacts','📞 联系'],['memories','📷 回忆'],['tips','🧭 小贴士'],['settings','⚙️ 设置']
  ],

  renderNav(){
    const nav = document.getElementById('nav');
    nav.innerHTML = this.navItems.map(([id,title])=>`<a href="#${id}" class="${id==='home'?'active':''}" onclick="App.show('${id}')">${title}</a>`).join('');
    document.getElementById('quickNav').innerHTML = this.navItems.map(([id,title])=>`<a class="chip" href="#${id}" onclick="App.show('${id}')">${title}</a>`).join('');
  },

  // ----- Itinerary -----
  addItinerary(){
    const v = (id)=>document.getElementById(id).value;
    App.data.itinerary.push({
      date:v('it_date'), start:v('it_start'), end:v('it_end'), hours:parseFloat(v('it_hours')||0),
      title:v('it_title'), place:v('it_place'), mode:v('it_mode'), wear:v('it_wear'),
      walk:v('it_walk'), links:v('it_links'), note:v('it_note')
    });
    App.save();
    ['it_date','it_start','it_end','it_hours','it_title','it_place','it_wear','it_walk','it_links','it_note'].forEach(id=>document.getElementById(id).value='');
  },
  renderItinerary(){
    const tb = document.querySelector('#it_table tbody');
    const rows = [...App.data.itinerary].sort((a,b)=> (a.date||'').localeCompare(b.date) || (a.start||'').localeCompare(b.start));
    tb.innerHTML = rows.map((r,i)=>`
      <tr>
        <td>${r.date||''}</td>
        <td>${r.start||''} - ${r.end||''}${r.hours?`<div class="small muted">${r.hours}h</div>`:''}</td>
        <td>${r.title||''}</td>
        <td>${r.place||''}<div class="small muted">${r.mode||''}${r.walk?` · ${r.walk}`:''}</div></td>
        <td>${r.wear||''}</td>
        <td><span class="small">${r.note||''}</span><div class="small"><a href="${r.links||'#'}" target="_blank">${r.links?'链接':''}</a></div></td>
        <td><button class="ghost" onclick="UI.del('itinerary',${i})">删除</button></td>
      </tr>
    `).join('');
  },

  // ----- Lodging -----
  addLodging(){
    const v = id=>document.getElementById(id).value;
    App.data.lodging.push({ date:v('lo_date'), name:v('lo_name'), room:v('lo_room'), addr:v('lo_addr'),
      in:v('lo_in'), out:v('lo_out'), link:v('lo_link'), contact:v('lo_contact'), assign:v('lo_assign'), note:v('lo_note') });
    App.save();
  },
  renderLodging(){
    const tb = document.querySelector('#lo_table tbody');
    const rows = [...App.data.lodging].sort((a,b)=> (a.date||'').localeCompare(b.date));
    tb.innerHTML = rows.map((r,i)=>`
      <tr>
        <td>${r.date||''}</td><td>${r.name||''}<div class="small muted">${r.room||''}</div></td>
        <td>${r.addr||''}<div class="small"><a href="https://maps.google.com/?q=${encodeURIComponent(r.addr||'')}" target="_blank">地图</a></div></td>
        <td>${r.in||''} - ${r.out||''}</td>
        <td>${r.contact||''}</td><td>${r.assign||''}</td>
        <td><button class="ghost" onclick="UI.del('lodging',${i})">删除</button></td>
      </tr>
    `).join('');
  },

  // ----- Transport -----
  addTransport(){
    const v = id=>document.getElementById(id).value;
    App.data.transport.push({ date:v('tr_date'), out:v('tr_out'), in:v('tr_in'), mode:v('tr_mode'),
      meet:v('tr_meet'), info:v('tr_info'), link:v('tr_link'), note:v('tr_note') });
    App.save();
  },
  renderTransport(){
    const tb = document.querySelector('#tr_table tbody');
    const rows = [...App.data.transport].sort((a,b)=> (a.date||'').localeCompare(b.date) || (a.out||'').localeCompare(b.out));
    tb.innerHTML = rows.map((r,i)=>`
      <tr>
        <td>${r.date||''}</td><td>${r.out||''} - ${r.in||''}</td><td>${r.mode||''}</td>
        <td>${r.meet||''}<div class="small muted">${r.info||''}</div></td>
        <td>${r.note||''}</td>
        <td><button class="ghost" onclick="UI.del('transport',${i})">删除</button></td>
      </tr>
    `).join('');
  },

  // ----- Packing -----
  addPack(){
    const v = id=>document.getElementById(id).value;
    App.data.packing.push({ name:v('pk_name'), group:v('pk_group'), note:v('pk_note'), done:false });
    App.save();
  },
  togglePack(i){
    App.data.packing[i].done = !App.data.packing[i].done;
    App.save();
  },
  loadDefaultPack(){
    const preset = ["衣服","裤子","底裤","安全裤","内衣","外套","Pad","毛巾","牙刷","牙膏","Charger","Shampoo","转换头","脏衣服袋子","化妆品","口红","眼药水","绑头发","Passport","钱","卡","药(panadol)/fibre","iPad","Airpods","Boarding pass","鞋子","袜子","香水","双眼皮贴","假睫毛","Powebank","隐形眼镜/墨镜","眼镜布","Wet tissue","梳子","洗脸巾","洗脸水","洗衣液","Apple Watch and charger","首饰","润唇膏","防晒霜","雨伞","充电线"];
    preset.forEach(p=> App.data.packing.push({name:p, group:'—', note:'', done:false}));
    App.save();
  },
  renderPacking(){
    const tb = document.querySelector('#pk_table tbody');
    const rows = [...App.data.packing];
    tb.innerHTML = rows.map((r,i)=>`
      <tr>
        <td><input type="checkbox" ${r.done?'checked':''} onchange="UI.togglePack(${i})"></td>
        <td>${r.name}</td><td>${r.group||''}</td><td>${r.note||''}</td>
        <td><button class="ghost" onclick="UI.del('packing',${i})">删除</button></td>
      </tr>
    `).join('');
  },

  // ----- Expenses -----
  addExpense(){
    const v = id=>document.getElementById(id).value;
    const teamNames = App.data.team.map(t=>t.name);
    const participants = (v('ex_participants')||teamNames.join(',')).split(',').map(s=>s.trim()).filter(Boolean);
    const payer = (v('ex_payer')||'').split(',').map(s=>s.trim()).filter(Boolean);
    App.data.expenses.push({
      date:v('ex_date'), amount:parseFloat(v('ex_amount')||0), ccy:v('ex_ccy'),
      fx:parseFloat(v('ex_fx')||0), place:v('ex_place'), desc:v('ex_desc'),
      payer, participants, treat:(v('ex_treat')==='yes'), cat:v('ex_cat'), method:v('ex_method')
    });
    App.save();
  },
  fxAmount(e){
    const fx = e.fx || 0, amt = e.amount||0;
    if(!fx) return '—';
    return e.ccy==='TWD' ? (amt*fx).toFixed(2)+' MYR' : (amt/fx).toFixed(0)+' TWD';
  },
  renderExpenses(){
    const tb = document.querySelector('#ex_table tbody');
    const rows = [...App.data.expenses].sort((a,b)=> (a.date||'').localeCompare(b.date));
    tb.innerHTML = rows.map((r,i)=>`
      <tr>
        <td>${r.date||''}</td>
        <td>${(r.amount||0).toFixed(2)}</td>
        <td>${r.ccy}</td>
        <td>${UI.fxAmount(r)}</td>
        <td>${r.place||''}<div class="small muted">${r.desc||''}</div></td>
        <td class="small">${(r.participants||[]).join(', ')}</td>
        <td class="small">${(r.payer||[]).join(', ')}</td>
        <td>${r.cat||''}</td>
        <td>${r.method||''}</td>
        <td><button class="ghost" onclick="UI.del('expenses',${i})">删除</button></td>
      </tr>
    `).join('');
    UI.recalc();
  },
  recalc(){
    const members = App.data.team.map(t=>t.name);
    const totals = {}; members.forEach(m=> totals[m] = {paid:0, owe:0});
    App.data.expenses.forEach(e=>{
      const amt = e.amount||0;
      const participants = (e.participants&&e.participants.length)? e.participants : members;
      const payers = (e.payer&&e.payer.length)? e.payer : [];
      if(!participants.length) return;
      if(e.treat){
        // 请客：不分摊；付款人全部记为已付
        payers.forEach(p=> totals[p] && (totals[p].paid += amt));
      }else{
        const share = amt / participants.length;
        participants.forEach(p=> totals[p] && (totals[p].owe += share));
        payers.forEach(p=> totals[p] && (totals[p].paid += amt/payers.length));
      }
    });
    // 结算差额
    const lines = [];
    Object.entries(totals).forEach(([m,v])=>{
      const diff = (v.paid - v.owe);
      const color = diff>0?'ok': (diff<0?'danger':'badge');
      lines.push(`<div class="chip ${color}">${m}: ${diff.toFixed(2)}</div>`);
    });
    document.getElementById('settlement').innerHTML = `<div class="row"><div>结算差额（+应收 / -应付）：</div> ${lines.join('')}</div>`;
    // 预算
    UI.renderBudgetView();
  },

  // ----- Budget -----
  saveBudget(){
    App.data.budget.food = parseFloat(document.getElementById('bd_food').value||0);
    App.data.budget.hotel = parseFloat(document.getElementById('bd_hotel').value||0);
    App.data.budget.trans = parseFloat(document.getElementById('bd_trans').value||0);
    App.data.budget.other = parseFloat(document.getElementById('bd_other').value||0);
    App.save();
  },
  renderBudgetView(){
    const catMap = { '餐饮':'food','住宿':'hotel','交通':'trans' };
    const sum = {food:0, hotel:0, trans:0, other:0};
    App.data.expenses.forEach(e=>{
      const key = catMap[e.cat] || 'other';
      sum[key] += (e.amount||0);
    });
    const bd = App.data.budget;
    const badge = document.getElementById('budgetBadge');
    const over = (sum.food>bd.food) || (sum.hotel>bd.hotel) || (sum.trans>bd.trans) || (sum.other>bd.other);
    badge.textContent = over ? '有超支' : '正常';
    badge.className = 'badge ' + (over?'warn':'');
    document.getElementById('budgetView').innerHTML = `
      <div>餐饮：${sum.food.toFixed(0)} / 预算 ${bd.food||0}</div>
      <div>住宿：${sum.hotel.toFixed(0)} / 预算 ${bd.hotel||0}</div>
      <div>交通：${sum.trans.toFixed(0)} / 预算 ${bd.trans||0}</div>
      <div>其他：${sum.other.toFixed(0)} / 预算 ${bd.other||0}</div>
    `;
  },

  // ----- Team & Tasks -----
  addTeam(){
    const n = document.getElementById('tm_name').value.trim();
    if(!n) return alert('请输入姓名');
    App.data.team.push({ name:n, role:document.getElementById('tm_role').value, contact:document.getElementById('tm_contact').value });
    App.save();
  },
  loadDefaultTeam(){
    const arr = ['大哥','大姐','二姐','三姐','妹妹','爸爸','妈咪','丽萍','Weitao','Baby'];
    arr.forEach(n=> App.data.team.push({name:n, role:'', contact:''}));
    App.save();
  },
  renderTeam(){
    const tb = document.querySelector('#tm_table tbody');
    tb.innerHTML = App.data.team.map((t,i)=>`
      <tr><td>${t.name}</td><td>${t.role||''}</td><td>${t.contact||''}</td>
      <td><button class="ghost" onclick="UI.del('team',${i})">删除</button></td></tr>
    `).join('');
    document.getElementById('teamCount').textContent = App.data.team.length + ' 人';
  },
  addTask(){
    App.data.tasks.push({
      title:document.getElementById('tk_title').value,
      owner:document.getElementById('tk_owner').value,
      due:document.getElementById('tk_due').value,
      priority:document.getElementById('tk_priority').value,
      note:document.getElementById('tk_note').value,
      done:false
    });
    App.save();
  },
  toggleTask(i){ App.data.tasks[i].done = !App.data.tasks[i].done; App.save(); },
  renderTasks(){
    const tb = document.querySelector('#tk_table tbody');
    const rows = [...App.data.tasks].sort((a,b)=> (a.done-b.done) || (a.due||'').localeCompare(b.due||''));
    tb.innerHTML = rows.map((t,i)=>`
      <tr>
        <td><input type="checkbox" ${t.done?'checked':''} onchange="UI.toggleTask(${i})"></td>
        <td>${t.title||''}</td>
        <td>${t.owner||''}<div class="small muted">${t.due||''}</div></td>
        <td>${t.priority||''}</td>
        <td>${t.note||''}</td>
        <td><button class="ghost" onclick="UI.del('tasks',${i})">删除</button></td>
      </tr>
    `).join('');
  },

  // ----- Contacts -----
  addContact(){
    App.data.contacts.push({ name:document.getElementById('ct_name').value, phone:document.getElementById('ct_phone').value, role:document.getElementById('ct_role').value, done:false });
    App.save();
  },
  loadDefaultContacts(){
    const arr = [
      {name:'台湾报警', phone:'110', role:'报警求助'},
      {name:'台湾救护车', phone:'119', role:'急救'},
      {name:'旅行社/包车司机', phone:'待补充', role:'出行支持'},
    ];
    arr.forEach(c=> App.data.contacts.push(c));
    App.save();
  },
  renderContacts(){
    const tb = document.querySelector('#ct_table tbody');
    tb.innerHTML = App.data.contacts.map((c,i)=>`
      <tr>
        <td>${c.name}</td><td><a href="tel:${c.phone}">${c.phone}</a></td><td>${c.role||''}</td>
        <td><button class="ghost" onclick="UI.del('contacts',${i})">删除</button></td>
      </tr>
    `).join('');
  },

  // ----- Memories -----
  addMemory(){
    App.data.memories.push({ date:document.getElementById('mm_date').value, url:document.getElementById('mm_url').value, note:document.getElementById('mm_note').value });
    App.save();
  },
  renderMemories(){
    const tb = document.querySelector('#mm_table tbody');
    const rows = [...App.data.memories].sort((a,b)=> (a.date||'').localeCompare(b.date));
    tb.innerHTML = rows.map((m,i)=>`
      <tr>
        <td>${m.date||''}</td>
        <td>${m.url?`<a href="${m.url}" target="_blank">打开链接</a>`:''}</td>
        <td>${m.note||''}</td>
        <td><button class="ghost" onclick="UI.del('memories',${i})">删除</button></td>
      </tr>
    `).join('');
  },

  // ----- Tips -----
  addTip(){
    App.data.packing.push({ name:document.getElementById('tp_item').value, group:'返程', note:document.getElementById('tp_note').value, done:false });
    App.save();
  },

  // ----- Common -----
  del(coll, i){ App.data[coll].splice(i,1); App.save(); },

  renderHome(){
    const t = App.data.trip;
    document.getElementById('st_start').value = t.start||'';
    document.getElementById('st_end').value = t.end||'';
    document.getElementById('st_dest').value = t.dest||'台北';
    document.getElementById('tripDates').textContent = (t.start&&t.end)? `${t.start} → ${t.end} · ${t.dest}` : '未设置旅行日期';
  },

  renderAll(){
    this.renderNav();
    this.renderHome();
    this.renderItinerary();
    this.renderLodging();
    this.renderTransport();
    this.renderPacking();
    this.renderExpenses();
    this.renderBudgetView();
    this.renderTeam();
    this.renderTasks();
    this.renderContacts();
    this.renderMemories();
  }
};

window.App = App; window.UI = UI;
document.addEventListener('DOMContentLoaded', ()=>{
  UI.renderNav();
  App.load();
  // Default show home
  App.show(location.hash?.replace('#','') || 'home');
});
