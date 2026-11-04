/* Power of AI Agents | WebGIS simulation
 * Based on the supplied standalone animation concept (seeded timeline, wireframe,
 * animated cursors, staged UI build). All data and agent events are synthetic.
 * This example renders a dependency graph in vanilla SVG; it does not claim
 * that @xyflow/react is loaded or that live AI inference occurs.
 * SPDX-License-Identifier: MIT
 */
(() => {
  'use strict';
  const TOTAL_AGENTS = 58;
  const TOTAL_LAYERS = 1847;
  const DURATION = 32000;
  const STAGES = ['Plan','Ingest','ETL','Fuse','Model','Risk','Route','Report','QA'];
  const GROUPS = [
    {name:'Planning', count:7, phase:0, task:'Lập kế hoạch phân tích không gian'},
    {name:'Spatial ETL', count:7, phase:2, task:'Kiểm tra CRS, chuẩn hóa GeoJSON và hình học'},
    {name:'Sensor Fusion', count:6, phase:3, task:'Đối chiếu và tổng hợp dữ liệu cảm biến'},
    {name:'Vision', count:5, phase:1, task:'Diễn giải ảnh và lớp phủ bề mặt'},
    {name:'Hydrology', count:8, phase:4, task:'Mô hình hóa ngập theo kịch bản'},
    {name:'Risk Scoring', count:7, phase:5, task:'Phân loại vùng có nguy cơ'},
    {name:'Routing', count:7, phase:6, task:'Đề xuất tuyến sơ tán có ràng buộc'},
    {name:'Reporting', count:6, phase:7, task:'Tạo bảng, biểu đồ và báo cáo'},
    {name:'QA', count:5, phase:8, task:'Đánh giá sai số, nguồn gốc và tính nhất quán'}
  ];
  const CONNECTIONS = [[0,1],[0,3],[1,2],[1,4],[2,4],[3,4],[4,5],[5,6],[5,7],[6,7],[7,8],[8,0]];
  const ZONES = {
    north: {name:'Vùng phía Bắc (giả định)', risk:'Trung bình', depth:'0,28 m', recommendation:'Kiểm tra dữ liệu trạm và xác minh cao độ.'},
    center: {name:'Khu ven sông (giả định)', risk:'Cao', depth:'0,78 m', recommendation:'Ưu tiên rà soát đường thoát và các điểm trú ẩn.'},
    east: {name:'Khu phía Đông (giả định)', risk:'Trung bình', depth:'0,36 m', recommendation:'Đối chiếu mưa tích lũy và khả năng tiêu thoát.'},
    south: {name:'Khu phía Nam (giả định)', risk:'Thấp', depth:'0,12 m', recommendation:'Kiểm tra điều kiện tuyến di chuyển.'}
  };
  const $ = id => document.getElementById(id);
  let agents = [], agentNodes = new Map(), groupNodes = [], cursorNodes = [];
  let elapsed = 0, lastFrame = 0, paused = false, speed = 1;
  let lastRender = -1, selectedId = null, mapZoom = 1;
  const startDelays = [1300,1700,2100,2500,2900,3300,3700];
  const fmt = n => String(n).padStart(2,'0');
  const escapeHTML = v => String(v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function makeAgents() {
    let n = 0;
    GROUPS.forEach((g,gi) => {
      for (let k=0;k<g.count;k++) {
        n++;
        agents.push({id:'A'+fmt(n), group:gi, groupName:g.name, task:g.task,
          start:startDelays[k%startDelays.length] + gi*25,
          end:26000 + ((n*3)%7)*900,
          effort:Math.max(10,Math.round(27 + ((n*37)%85)))});
      }
    });
    if (agents.length !== TOTAL_AGENTS) throw new Error('Invalid 58-agent configuration');
  }
  function agentStatus(a) {
    if (elapsed < a.start) return 'waiting';
    if (elapsed < a.end) return 'running';
    return 'done';
  }
  function buildSideList() {
    const list = $('agentList');
    agents.forEach(a => {
      const row = document.createElement('button');
      row.type='button';row.className='agent-row';row.dataset.agentId=a.id;
      row.innerHTML='<span class="agent-id">'+a.id+'</span><span class="name">'+escapeHTML(a.groupName)+'</span><span class="status-pill">WAIT</span>';
      row.addEventListener('click',()=>selectAgent(a.id));
      list.appendChild(row);
    });
  }
  function buildGraph() {
    const grid = $('groupGrid');
    let n = 0;
    GROUPS.forEach((group,gi) => {
      const card=document.createElement('section');
      card.className='agent-group';card.dataset.group=String(gi);
      card.setAttribute('aria-label',group.name + ', ' + group.count + ' tác tử');
      const title=document.createElement('div');title.className='group-title';
      title.innerHTML='<span>'+escapeHTML(group.name)+'</span><span>'+group.count+' AGENTS</span>';
      const chips=document.createElement('div');chips.className='agent-chips';
      for(let i=0;i<group.count;i++){
        const a=agents[n++];
        const chip=document.createElement('button');chip.type='button';
        chip.className='agent-chip';chip.textContent=a.id;chip.dataset.agentId=a.id;
        chip.title=a.id+': '+group.task;
        chip.addEventListener('click',()=>selectAgent(a.id));
        chips.appendChild(chip);agentNodes.set(a.id,chip);
      }
      card.appendChild(title);card.appendChild(chips);grid.appendChild(card);groupNodes.push(card);
    });
    const line=document.createElementNS('http://www.w3.org/2000/svg','svg');
    if (grid.children.length !== GROUPS.length) throw new Error('Invalid group count');
  }
  function svgMap() {
    const roads=[];
    for(let x=20;x<790;x+=54){
      roads.push('<path d="M'+x+' 0 Q'+(x+28)+' 260 '+(x-8)+' 600" stroke="#d5d5d5" stroke-width="'+(x%3===0?4:2)+'" fill="none"/>');
    }
    for(let y=32;y<605;y+=49){
      roads.push('<path d="M0 '+y+' Q400 '+(y+15)+' 820 '+(y-24)+'" stroke="#dbdbdb" stroke-width="'+(y%2?2:3)+'" fill="none"/>');
    }
    const sensors=[[86,125],[173,210],[240,102],[312,282],[406,152],[500,325],[598,219],[686,401],[154,455],[340,498],[563,514],[721,96]];
    const shelters=[[170,143],[319,136],[606,110],[715,290],[515,476],[243,506],[745,516]];
    let sensorSvg='',shelterSvg='';
    sensors.forEach((p,i)=>{
      sensorSvg += '<g transform="translate('+p[0]+' '+p[1]+')" class="sensor-marker"><circle r="14" fill="#fff" stroke="#222" stroke-width="2"/><circle r="5" fill="#111"/><circle r="20" fill="none" stroke="#777" opacity=".3" stroke-dasharray="3 4"/><title>Trạm SYN-'+fmt(i+1)+' (dữ liệu giả lập)</title></g>';
    });
    shelters.forEach((p,i)=>{
      shelterSvg += '<g transform="translate('+p[0]+' '+p[1]+')"><circle r="18" fill="#111" stroke="#fff" stroke-width="3"/><path d="M-9 0 L0 -8 9 0 V9 H-9 Z M-2 9 V2 H3 V9" fill="none" stroke="#fff" stroke-width="2"/><title>Điểm sơ tán S'+fmt(i+1)+' (giả lập)</title></g>';
    });
    $('mapSvg').setAttribute('viewBox','0 0 820 600');
    $('mapSvg').innerHTML = [
      '<defs>',
      '<pattern id="floodHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="#777" stroke-width="3"/></pattern>',
      '<pattern id="fineGrid" width="27" height="27" patternUnits="userSpaceOnUse"><path d="M27 0 H0 V27" fill="none" stroke="#ececec" stroke-width="1"/></pattern>',
      '</defs><rect width="820" height="600" fill="#fbfbfb"/><rect width="820" height="600" fill="url(#fineGrid)"/>',
      '<g class="map-roads">'+roads.join('')+'</g>',
      '<g data-map-layer="boundaries" fill="none" stroke="#444" stroke-width="2" stroke-dasharray="9 6">',
      '<path d="M40 30L283 40 362 172 218 327 32 284Z"/><path d="M283 40L561 33 737 176 594 315 362 172Z"/><path d="M32 284L218 327 370 510 72 575Z"/><path d="M218 327L594 315 775 560 370 510Z"/></g>',
      '<g data-map-layer="risk">',
      '<path class="risk-zone" data-zone="north" d="M35 110 Q180 30 312 166 L360 240 170 315 50 248 Z" fill="url(#floodHatch)" opacity=".78" stroke="#777"/>',
      '<path class="risk-zone" data-zone="center" d="M105 324 Q260 213 405 260 T707 354 L686 445 Q495 390 386 470 T155 431 Z" fill="#464646" opacity=".84" stroke="#333"/>',
      '<path class="risk-zone" data-zone="east" d="M522 115L715 162 778 338 640 357 562 270Z" fill="url(#floodHatch)" opacity=".65" stroke="#777"/>',
      '<path class="risk-zone" data-zone="south" d="M160 454L395 460 580 540 518 590 198 582Z" fill="#e8e8e8" stroke="#b0b0b0"/>',
      '</g>',
      '<g data-map-layer="river"><path d="M-40 305 C130 267 202 389 355 326 S576 245 857 367" stroke="#9c9c9c" stroke-width="34" fill="none" opacity=".85"/><path d="M-40 305 C130 267 202 389 355 326 S576 245 857 367" stroke="#ededed" stroke-width="19" fill="none"/><path d="M-40 305 C130 267 202 389 355 326 S576 245 857 367" stroke="#777" stroke-width="1" fill="none" stroke-dasharray="9 7"/></g>',
      '<g data-map-layer="routes"><path d="M188 388L231 343 312 371 385 335 472 299 606 110" fill="none" stroke="#fff" stroke-width="12" stroke-linejoin="round"/><path d="M188 388L231 343 312 371 385 335 472 299 606 110" fill="none" stroke="#111" stroke-width="5" stroke-linejoin="round" stroke-dasharray="12 5"/><path d="M520 412L614 412 715 290" fill="none" stroke="#fff" stroke-width="12"/><path d="M520 412L614 412 715 290" fill="none" stroke="#111" stroke-width="5" stroke-dasharray="12 5"/></g>',
      '<g data-map-layer="sensors">'+sensorSvg+'</g>',
      '<g data-map-layer="shelters">'+shelterSvg+'</g>',
      '<g aria-hidden="true"><text class="ward-label" x="84" y="78">KHU BẮC</text><text class="ward-label" x="591" y="79">KHU ĐÔNG</text><text class="ward-label" x="333" y="423">VEN SÔNG</text><text class="ward-label" x="244" y="556">KHU NAM</text><text x="620" y="579" font-size="13" fill="#666">0 ━━━ 1 km (sơ đồ)</text></g>'
    ].join('');
    $('mapSvg').addEventListener('click',ev=>{
      const zone=ev.target.closest('[data-zone]');
      if(!zone)return;
      const z=ZONES[zone.getAttribute('data-zone')];
      $('mapDetail').textContent='▣ '+z.name+' · Nguy cơ: '+z.risk+' · Mực nước mẫu: '+z.depth+' · '+z.recommendation+' Chỉ là số liệu giả lập.';
    });
  }
  function updateMapLayers() {
    document.querySelectorAll('input[data-layer]').forEach(input=>{
      const g=$('mapSvg').querySelector('[data-map-layer="'+input.dataset.layer+'"]');
      if(g)g.classList.toggle('hidden',!input.checked);
    });
  }
  function drawConnections() {
    const host=$('graphCanvas'),svg=$('edgeSvg'),base=host.getBoundingClientRect();
    const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
    svg.setAttribute('viewBox','0 0 '+w+' '+h);
    const coords=groupNodes.map(el=>{
      const r=el.getBoundingClientRect();
      return {x:r.left-base.left,y:r.top-base.top,w:r.width,h:r.height};
    });
    let paths='';
    CONNECTIONS.forEach(([a,b],i)=>{
      const A=coords[a],B=coords[b]; if(!A||!B)return;
      const startX=A.x+A.w/2, startY=A.y+A.h/2;
      const endX=B.x+B.w/2,endY=B.y+B.h/2;
      const dx=endX-startX,dy=endY-startY;
      let x1=startX,y1=startY,x2=endX,y2=endY;
      if(Math.abs(dx)>=Math.abs(dy)){
        x1+=Math.sign(dx)*A.w/2; x2-=Math.sign(dx)*B.w/2;
      }else{
        y1+=Math.sign(dy)*A.h/2; y2-=Math.sign(dy)*B.h/2;
      }
      const mx=(x1+x2)/2,my=(y1+y2)/2;
      const d=Math.abs(dx)>=Math.abs(dy)
        ? 'M'+x1+' '+y1+' C'+mx+' '+y1+' '+mx+' '+y2+' '+x2+' '+y2
        : 'M'+x1+' '+y1+' C'+x1+' '+my+' '+x2+' '+my+' '+x2+' '+y2;
      paths+='<path class="flow-line" data-edge="'+i+'" d="'+d+'"/>';
    });
    svg.innerHTML=paths;
    const cursors=$('agentCursors');cursors.setAttribute('viewBox','0 0 '+w+' '+h);
  }
  function makeCursors() {
    const svg=$('agentCursors');
    agents.forEach((a,i)=>{
      const g=document.createElementNS('http://www.w3.org/2000/svg','g');
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      const label=document.createElementNS('http://www.w3.org/2000/svg','text');
      path.setAttribute('d','M0 0 L0 17 L5 12 L9 21 L12 19 L8 11 L17 11 Z');
      path.setAttribute('class','cursor-pointer');
      label.setAttribute('class','cursor-label');
      label.setAttribute('x','18');label.setAttribute('y','19');label.textContent=a.id;
      g.appendChild(path);g.appendChild(label);svg.appendChild(g);
      cursorNodes.push({el:g, phase:(i*2.399963)%6.28});
    });
  }
  function selectAgent(id) {
    selectedId=id; const a=agents.find(a=>a.id===id); if(!a)return;
    const status=agentStatus(a);
    $('inspector').innerHTML='<strong>'+a.id+' · '+escapeHTML(a.groupName)+'</strong><div>'+escapeHTML(a.task)+'</div><div>Trạng thái: '+status.toUpperCase()+' · tải giả định: '+a.effort+' ops</div>';
    $('mapDetail').textContent='⌖ '+a.id+' ('+a.groupName+'): '+a.task+'. Đây là tác vụ mô phỏng, không có suy luận AI thực.';
    agentNodes.forEach((node,k)=>node.classList.toggle('selected',k===id));
    document.querySelectorAll('.agent-row').forEach(el=>el.classList.toggle('selected',el.dataset.agentId===id));
  }
  function updateSearch() {
    const q=$('agentSearch').value.trim().toLowerCase();
    agents.forEach(a=>{
      const show=!q || a.id.toLowerCase().includes(q) || a.groupName.toLowerCase().includes(q) || a.task.toLowerCase().includes(q);
      const chip=agentNodes.get(a.id);
      chip.hidden=!show;
      const row=document.querySelector('.agent-row[data-agent-id="'+a.id+'"]');
      if(row)row.hidden=!show;
    });
  }
  function updateCursors() {
    const canvas=$('graphCanvas'),w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h)return;
    agents.forEach((a,i)=>{
      const v=cursorNodes[i],status=agentStatus(a);
      if(status==='done'){v.el.setAttribute('opacity','0');return;}
      const card=groupNodes[a.group],r=card.getBoundingClientRect(),c=canvas.getBoundingClientRect();
      const x0=r.left-c.left+r.width/2,y0=r.top-c.top+r.height/2;
      const t=elapsed/1000;
      const speedWave=0.65+(i%5)*0.2;
      const radiusX=Math.min(42,r.width*.28),radiusY=Math.min(22,r.height*.22);
      const x=x0+Math.sin(t*speedWave+v.phase)*radiusX;
      const y=y0+Math.cos(t*(speedWave+.21)+v.phase)*radiusY;
      v.el.setAttribute('transform','translate('+x.toFixed(1)+' '+y.toFixed(1)+') scale(.78)');
      v.el.setAttribute('opacity',status==='running'?'0.66':'0.12');
    });
  }
  const LOGS=[
    'A01 · lập sơ đồ quy trình GIS và phân việc',
    'A22 · đọc ảnh nền và tách nhóm bề mặt',
    'A11 · chuẩn hóa lớp không gian và hệ tọa độ',
    'A17 · tổng hợp 12 trạm cảm biến tổng hợp',
    'A31 · chạy kịch bản mô phỏng mực nước',
    'A40 · đánh giá nguy cơ theo vùng',
    'A47 · xác định tuyến sơ tán đề xuất',
    'A53 · kết xuất báo cáo và chú giải bản đồ',
    'A57 · kiểm tra nguồn gốc và tính nhất quán'
  ];
  function render(force=false) {
    const tick=Math.floor(elapsed/250);
    if(!force && tick===lastRender)return;
    lastRender=tick;
    const p=Math.min(1,elapsed/DURATION);
    const stage=Math.min(STAGES.length-1,Math.floor(p*STAGES.length));
    const count=p>=1?TOTAL_LAYERS:Math.floor(TOTAL_LAYERS*(1-Math.pow(1-p,1.15)));
    $('layerCount').textContent=count.toLocaleString('en-US');
    $('progressFill').style.width=(count/TOTAL_LAYERS*100).toFixed(2)+'%';
    $('elapsed').textContent='T+'+fmt(Math.floor(elapsed/60000))+':'+fmt(Math.floor(elapsed/1000)%60);
    $('graphState').textContent=STAGES[stage].toUpperCase();
    $('taskState').textContent=p>=1?'COMPLETE':'RUNNING';
    $('mapStatus').textContent=p>=1?'RENDERED':STAGES[stage].toUpperCase();
    $('wireframe').classList.toggle('hide',elapsed>2100);
    groupNodes.forEach((g,i)=>g.classList.toggle('active',GROUPS[i].phase===stage && p<1));
    document.querySelectorAll('.flow-line').forEach((line,i)=>line.classList.toggle('active',p<1 && GROUPS[CONNECTIONS[i][0]].phase<=stage));
    let active=0,done=0;
    agents.forEach(a=>{
      const status=agentStatus(a);
      if(status==='running')active++;
      if(status==='done')done++;
      const chip=agentNodes.get(a.id);
      if(chip){
        chip.classList.toggle('running',status==='running');
        chip.classList.toggle('done',status==='done');
        chip.classList.toggle('selected',selectedId===a.id);
        chip.setAttribute('aria-label',a.id+' '+a.groupName+' '+status);
      }
      const row=document.querySelector('.agent-row[data-agent-id="'+a.id+'"]');
      if(row){
        const pill=row.querySelector('.status-pill');
        pill.textContent=status==='done'?'DONE':status==='running'?'LIVE':'WAIT';
        pill.classList.toggle('running',status==='running');
      }
    });
    $('doneMetric').textContent=done+' COMPLETE · '+active+' ACTIVE';
    $('agentSidebarCount').textContent=active+'/58';
    $('latencyMetric').textContent='TIME: '+(elapsed/1000).toFixed(1)+'s · SPEED '+speed+'×';
    $('playBtn').textContent=paused?'▶ Tiếp tục':'❚❚ Tạm dừng';
    $('playBtn').disabled=p>=1;
    $('geoAlert').style.opacity=p<.25?'.6':'1';
    document.querySelectorAll('.timeline-step').forEach((el,i)=>{
      el.classList.toggle('active',i===stage&&p<1);
      el.classList.toggle('done',i<stage||p>=1);
    });
    const entries=[];
    for(let k=0;k<3;k++){
      const ix=Math.max(0,stage-k);
      entries.push('<div>['+fmt(Math.floor(elapsed/60000))+':'+fmt(Math.floor(elapsed/1000)%60)+'] '+escapeHTML(LOGS[ix])+'</div>');
    }
    if(p>=1)entries[0]='<div>[00:32] Đã kết thúc 58 luồng tác tử giả lập; 1847 UI ops.</div>';
    $('logFeed').innerHTML=entries.join('');
    if(selectedId){
      const a=agents.find(x=>x.id===selectedId);
      if(a) $('inspector').innerHTML='<strong>'+a.id+' · '+escapeHTML(a.groupName)+'</strong><div>'+escapeHTML(a.task)+'</div><div>'+agentStatus(a).toUpperCase()+' · '+a.effort+' UI ops (giả lập)</div>';
    }
  }
  function frame(now){
    if(!lastFrame)lastFrame=now;
    const dt=Math.min(now-lastFrame,100);lastFrame=now;
    if(!paused && elapsed<DURATION)elapsed=Math.min(DURATION,elapsed+dt*speed);
    render();
    if(!paused) updateCursors();
    requestAnimationFrame(frame);
  }
  function replay(){
    elapsed=0;lastFrame=0;lastRender=-1;paused=false;selectedId=null;
    $('mapDetail').textContent='Đang dựng wireframe và phân bổ công việc cho 58 Agent. Dữ liệu hoàn toàn giả lập.';
    agentNodes.forEach(n=>n.classList.remove('selected'));
    document.querySelectorAll('.agent-row').forEach(n=>n.classList.remove('selected'));
    $('inspector').innerHTML='<strong>AGENT INSPECTOR</strong><div>Nhấn vào A01–A58 để xem trạng thái.</div>';
    render(true);
  }
  function exportLog(){
    const payload={
      title:'Power of AI Agents — WebGIS flood scenario',
      synthetic:true, disclaimer:'Not real AI execution, flood forecast, or GIS basemap.',
      agentCount:TOTAL_AGENTS, layerCount:TOTAL_LAYERS,
      layerMeaning:'Simulated UI operations, not GIS datasets',
      durationMs:DURATION, elapsedMs:Math.round(elapsed),
      stages:STAGES, connections:CONNECTIONS.map(([a,b])=>[GROUPS[a].name,GROUPS[b].name]),
      agents:agents.map(a=>({...a,status:agentStatus(a)})),
      sources:['https://github.com/xyflow/xyflow','https://github.com/xulytiengviet/xyflow']
    };
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    const link=document.createElement('a');
    link.href=url;link.download='power-of-ai-agents-synthetic-trace.json';
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function init(){
    makeAgents();buildSideList();buildGraph();svgMap();updateMapLayers();
    $('timeline').innerHTML=STAGES.map(s=>'<div class="timeline-step">'+s+'</div>').join('');
    makeCursors();drawConnections();
    document.querySelectorAll('input[data-layer]').forEach(el=>el.addEventListener('change',updateMapLayers));
    $('playBtn').addEventListener('click',()=>{if(elapsed>=DURATION)return;paused=!paused;render(true);});
    $('replayBtn').addEventListener('click',replay);
    $('speedBtn').addEventListener('click',()=>{speed=speed===1?2:speed===2?4:1;$('speedBtn').textContent=speed+'×';render(true);});
    $('exportBtn').addEventListener('click',exportLog);
    $('agentSearch').addEventListener('input',updateSearch);
    $('clearSearch').addEventListener('click',()=>{$('agentSearch').value='';updateSearch();});
    $('zoomIn').addEventListener('click',()=>{mapZoom=Math.min(2,mapZoom+.2);$('mapSvg').style.transform='scale('+mapZoom+')';});
    $('zoomOut').addEventListener('click',()=>{mapZoom=Math.max(1,mapZoom-.2);$('mapSvg').style.transform='scale('+mapZoom+')';});
    $('zoomReset').addEventListener('click',()=>{mapZoom=1;$('mapSvg').style.transform='scale(1)';});
    $('scenario').addEventListener('change',replay);
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(drawConnections).observe($('graphCanvas'));
    else addEventListener('resize',drawConnections);
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      paused=true;
      $('sideTip').textContent+=' Đã tạm dừng theo cài đặt giảm chuyển động của hệ thống.';
    }
    render(true);
    requestAnimationFrame(frame);
  }
  init();
})();
