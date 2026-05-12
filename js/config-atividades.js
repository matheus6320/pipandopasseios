// ===== PAINEL CONFIGURAR ATIVIDADES =====

var _popupAtivId = null;

// ===== POPUP ATIVIDADE =====

function abrirPopupAtividade(aid) {
  _popupAtivId = aid;
  const i = atividades.findIndex(a => a.id === aid);
  if(i < 0) return;
  _renderPopupAtivContent(aid, i);
  document.getElementById('popup-ativ-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function _renderPopupAtivContent(aid, i) {
  const a = atividades[i];
  if(!a.tipos || !a.tipos.length) a.tipos = [{nome:'Adulto', valor:a.preco||0, sinalModo:'fixo', sinalValor:0}];
  a.tipos.forEach(t => { if(!t.sinalModo) t.sinalModo='fixo'; if(t.sinalValor===undefined) t.sinalValor=0; });
  if(!a.taxasNew) a.taxasNew = (a.taxas||[]).map(tx=>({ id:uid(), nome:tx.nome, tipos: a.tipos.map(t=>({nome:t.nome,modo:'fixo',valor:tx.valor||0})) }));

  document.getElementById('popup-ativ-title').textContent = a.nome || 'Editar atividade';

  document.getElementById('popup-ativ-content').innerHTML = `
    <div class="acc-section">
      <div class="acc-section-title">Nome</div>
      <input class="acc-link-input" value="${esc(a.nome)}" placeholder="Nome da atividade"
        oninput="atividades[${i}].nome=this.value;document.getElementById('popup-ativ-title').textContent=this.value||'Atividade';renderSelectGrid()" style="margin-bottom:0">
    </div>
    <div class="acc-section">
      <div class="acc-section-title">👥 Tipos de passageiro</div>
      <div id="acc-tipos-${aid}">
        ${renderTiposAcc(a.tipos, i, a.sinalAtivo, aid)}
      </div>
      <button class="acc-add-tipo" data-aid="${aid}" onclick="adicionarTipoById(this.dataset.aid)">＋ Adicionar tipo</button>
    </div>
    <div class="acc-section">
      <div class="acc-toggle-row">
        <label class="toggle-wrap">
          <input type="checkbox" ${a.sinalAtivo ? 'checked' : ''}
            onchange="atividades[${i}].sinalAtivo=this.checked;_reRenderPopupAtiv()">
          <span class="toggle-slider"></span>
        </label>
        <span class="toggle-label">Cobrar sinal desta atividade</span>
      </div>
    </div>
    <div class="acc-section">
      <div class="acc-section-title">📋 Taxas adicionais</div>
      <div id="acc-taxas-${aid}">
        ${renderTaxasNew(a.taxasNew||[], a.tipos, i)}
      </div>
      <button class="acc-add-tipo" onclick="adicionarTaxaNew(${i})">＋ Adicionar taxa</button>
    </div>
    <div class="acc-section">
      <div class="acc-section-title">⭐ Extras e adicionais</div>
      <div id="acc-extras-${aid}"></div>
      <button class="acc-add-tipo" data-aid="${aid}" onclick="adicionarExtra(this.dataset.aid)">＋ Adicionar extra</button>
    </div>
    <div class="acc-section">
      <div class="acc-section-title">📅 Períodos especiais</div>
      <div id="acc-periodos-${aid}"></div>
      <button class="acc-add-tipo" data-aid="${aid}" onclick="adicionarPeriodo(this.dataset.aid)">＋ Adicionar período</button>
    </div>
    <div class="acc-section">
      <div class="acc-section-title">📸 Link de mídia</div>
      <input class="acc-link-input" type="url" value="${esc(a.linkMidia||'')}"
        placeholder="https://youtube.com/..."
        oninput="atividades[${i}].linkMidia=this.value">
    </div>
  `;
  renderExtrasBox(aid, i);
  _renderPeriodosBox(aid, i);
}

function _reRenderPopupAtiv() {
  if(!_popupAtivId) return;
  const i = atividades.findIndex(a => a.id === _popupAtivId);
  if(i < 0) return;
  const content = document.getElementById('popup-ativ-content');
  const scrollTop = content ? content.scrollTop : 0;
  _renderPopupAtivContent(_popupAtivId, i);
  if(content) content.scrollTop = scrollTop;
}

function fecharPopupAtividade() {
  _popupAtivId = null;
  document.getElementById('popup-ativ-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

async function salvarPopupAtividade() {
  if(!_popupAtivId) return;
  const i = atividades.findIndex(a => a.id === _popupAtivId);
  if(i < 0) return;
  const btn = document.getElementById('popup-ativ-save-btn');
  if(btn) { btn.textContent = '⏳ Salvando...'; btn.disabled = true; }
  salvar();
  try { await upsertAtividadeDB(atividades[i]); } catch(e) { console.error(e); }
  renderConfig();
  renderSelectGrid();
  fecharPopupAtividade();
}

async function _deletarPopupAtiv() {
  if(!_popupAtivId) return;
  if(!confirm('Remover esta atividade?')) return;
  const idx = atividades.findIndex(a => a.id === _popupAtivId);
  if(idx < 0) return;
  const aid = _popupAtivId;
  fecharPopupAtividade();
  atividades.splice(idx, 1);
  salvar();
  excluirAtividadeDB(aid).catch(console.error);
  renderConfig();
  renderSelectGrid();
}

// ===== LISTA DE ATIVIDADES =====

function salvarConfigManual() {
  salvar();
  const btn = document.getElementById('btn-salvar-config');
  btn.classList.add('saved');
  btn.innerHTML = '✅ Configurações Salvas!';
  setTimeout(() => {
    btn.classList.remove('saved');
    btn.innerHTML = '💾 Salvar Configurações';
  }, 2200);
}

function renderConfig() {
  const list = document.getElementById('ativ-list');
  list.innerHTML = '';
  atividades.forEach((a, i) => {
    if(!a.tipos || !a.tipos.length) a.tipos = [{nome:'Adulto', valor:a.preco||0, sinalModo:'fixo', sinalValor:0}];
    a.tipos.forEach(t => { if(!t.sinalModo) t.sinalModo='fixo'; if(t.sinalValor===undefined) t.sinalValor=0; });
    if(!a.taxasNew) a.taxasNew = (a.taxas||[]).map(tx=>({ id:uid(), nome:tx.nome, tipos: a.tipos.map(t=>({nome:t.nome,modo:'fixo',valor:tx.valor||0})) }));

    const precoSummary = a.tipos.map(t => `${esc(t.nome)}: R$ ${(t.valor||0).toFixed(0)}`).join(' · ');

    const wrap = document.createElement('div');
    wrap.className = 'swipe-wrap-ativ';

    const delPanel = document.createElement('div');
    delPanel.className = 'swipe-action-left';
    delPanel.style.cssText = 'cursor:pointer';
    delPanel.innerHTML = '<span class="swipe-del-icon">🗑</span><span class="swipe-del-txt">Excluir</span>';
    delPanel.onclick = (function(aid){ return function(){ _swipeAtivExcluir(aid); }; })(a.id);

    const editPanel = document.createElement('div');
    editPanel.className = 'swipe-ativ-edit';
    editPanel.innerHTML = '<span style="font-size:1.4rem">✏️</span><span class="swipe-del-txt">Editar</span>';
    editPanel.onclick = (function(aid){ return function(){ _swipeAtivEditar(aid); }; })(a.id);

    const card = document.createElement('div');
    card.className = 'acc-item';
    card.dataset.aid = a.id;
    card.innerHTML = `
      <div class="acc-header" id="acc-hdr-${a.id}">
        <div class="acc-header-left">
          <span class="acc-nome">${esc(a.nome)}</span>
        </div>
        <button class="acc-edit-btn" data-aid="${a.id}" onclick="abrirPopupAtividade(this.dataset.aid)">✏️ Editar</button>
      </div>
    `;

    wrap.appendChild(delPanel);
    wrap.appendChild(editPanel);
    wrap.appendChild(card);
    list.appendChild(wrap);
  });

  setTimeout(initSwipeAtividades, 0);
}

function _swipeAtivEditar(aid) {
  fecharSwipeAtivo();
  abrirPopupAtividade(aid);
}

function _swipeAtivExcluir(aid) {
  fecharSwipeAtivo();
  removerAtividade(aid);
}

// ===== FORMULÁRIO INTERNO =====

function renderExtrasBox(aid, idx) {
  var container = document.getElementById('acc-extras-' + aid);
  if(!container) return;
  container.innerHTML = '';
  var a = atividades[idx];
  if(!a) return;
  if(!a.extras) a.extras = [];
  if(a.extras.length === 0) {
    mkEl('div', {text:'Nenhum extra cadastrado.', style:'font-size:0.65rem;color:#888;font-weight:700;margin-bottom:6px'}, container);
    return;
  }
  a.extras.forEach(function(ex, j) {
    var box = mkEl('div', {cls:'acc-extra-box'}, container);
    mkEl('label', {cls:'acc-extra-label', text:'Nome do extra'}, box);
    var nomeIn = mkEl('input', {cls:'acc-extra-input', type:'text', placeholder:'Ex: 4 horas extras', value:ex.nome||''}, box);
    nomeIn.addEventListener('input', (function(ii,jj){return function(){atividades[ii].extras[jj].nome=this.value;};})(idx,j));

    var g1 = mkEl('div', {cls:'acc-extra-grid2'}, box);
    var d1 = mkEl('div', {}, g1);
    mkEl('label', {cls:'acc-extra-label', style:'margin-top:8px', text:'Valor acréscimo (R$)'}, d1);
    var valIn = mkEl('input', {cls:'acc-extra-input', type:'number', placeholder:'0', value:ex.valor||0}, d1);
    valIn.addEventListener('input', (function(ii,jj){return function(){atividades[ii].extras[jj].valor=parseFloat(this.value)||0;};})(idx,j));

    var d2 = mkEl('div', {}, g1);
    mkEl('label', {cls:'acc-extra-label', style:'margin-top:8px', text:'Multiplica pela qtd?'}, d2);
    var tog1 = mkEl('div', {cls:'acc-extra-tog'}, d2);
    var bSim = mkEl('button', {text:'Sim', cls: ex.multiplica ? 'ativo' : ''}, tog1);
    var bNao = mkEl('button', {text:'Não', cls: !ex.multiplica ? 'ativo' : ''}, tog1);
    bSim.addEventListener('click', (function(ii,jj,bs,bn){return function(){atividades[ii].extras[jj].multiplica=true; bs.className='ativo'; bn.className='';};})(idx,j,bSim,bNao));
    bNao.addEventListener('click', (function(ii,jj,bs,bn){return function(){atividades[ii].extras[jj].multiplica=false; bs.className=''; bn.className='ativo';};})(idx,j,bSim,bNao));

    var g2 = mkEl('div', {cls:'acc-extra-grid2'}, box);
    var d3 = mkEl('div', {}, g2);
    mkEl('label', {cls:'acc-extra-label', style:'margin-top:8px', text:'Sinal sobre extra'}, d3);
    var sinalIn = mkEl('input', {cls:'acc-extra-input', type:'number', placeholder:'0', value:ex.sinal||0}, d3);
    sinalIn.addEventListener('input', (function(ii,jj){return function(){atividades[ii].extras[jj].sinal=parseFloat(this.value)||0;};})(idx,j));

    var d4 = mkEl('div', {}, g2);
    mkEl('label', {cls:'acc-extra-label', style:'margin-top:8px', text:'Modo sinal'}, d4);
    var tog2 = mkEl('div', {cls:'acc-extra-tog'}, d4);
    var bReal = mkEl('button', {text:'R$', cls:(ex.sinalModo||'fixo')==='fixo'?'ativo':''}, tog2);
    var bPct  = mkEl('button', {text:'%', cls:ex.sinalModo==='pct'?'ativo':''}, tog2);
    bReal.addEventListener('click', (function(ii,jj,br,bp){return function(){atividades[ii].extras[jj].sinalModo='fixo'; br.className='ativo'; bp.className='';};})(idx,j,bReal,bPct));
    bPct.addEventListener('click',  (function(ii,jj,br,bp){return function(){atividades[ii].extras[jj].sinalModo='pct'; br.className=''; bp.className='ativo';};})(idx,j,bReal,bPct));

    mkEl('div', {style:'border-top:1px dashed #B5D4F4;margin:10px 0 6px'}, box);
    mkEl('label', {cls:'acc-extra-label', text:'Taxas deste extra (pagas no dia)'}, box);
    var taxasContainer = mkEl('div', {}, box);
    renderTaxasExtra(taxasContainer, idx, j, ex.taxas||[]);
    var addTaxaBtn = mkEl('button', {cls:'acc-add-tipo', text:'+ Adicionar taxa ao extra'}, box);
    addTaxaBtn.style.marginTop = '4px';
    addTaxaBtn.addEventListener('click', (function(ii,jj,tc){return function(){
      if(!atividades[ii].extras[jj].taxas) atividades[ii].extras[jj].taxas=[];
      atividades[ii].extras[jj].taxas.push({nome:'',valor:0,multiplica:true});
      renderTaxasExtra(tc, ii, jj, atividades[ii].extras[jj].taxas);
    };})(idx,j,taxasContainer));

    mkEl('div', {style:'border-top:1px dashed #B5D4F4;margin:8px 0 0'}, box);
    var delBtn = mkEl('button', {cls:'acc-extra-del', text:'Remover extra'}, box);
    delBtn.addEventListener('click', (function(aid2,jj){return function(){removerExtra(aid2,jj);};})(aid,j));
  });
}

function renderTaxasExtra(container, idx, j, taxas) {
  container.innerHTML = '';
  taxas.forEach(function(tx, k) {
    var row = mkEl('div', {style:'display:flex;gap:6px;align-items:center;margin-bottom:6px;background:white;border:1px solid #B5D4F4;border-radius:8px;padding:6px 8px'}, container);
    var nIn = mkEl('input', {cls:'acc-extra-input', type:'text', placeholder:'Nome da taxa', value:tx.nome||'', style:'flex:2;padding:5px 8px'}, row);
    nIn.addEventListener('input', (function(ii,jj,kk){return function(){atividades[ii].extras[jj].taxas[kk].nome=this.value;};})(idx,j,k));
    var vIn = mkEl('input', {cls:'acc-extra-input', type:'number', placeholder:'R$', value:tx.valor||0, style:'flex:1;padding:5px 8px'}, row);
    vIn.addEventListener('input', (function(ii,jj,kk){return function(){atividades[ii].extras[jj].taxas[kk].valor=parseFloat(this.value)||0;};})(idx,j,k));
    var tog = mkEl('div', {cls:'acc-extra-tog', style:'flex-shrink:0'}, row);
    var bS = mkEl('button', {text:'xqtd', cls:tx.multiplica?'ativo':''}, tog);
    var bN = mkEl('button', {text:'fixo', cls:!tx.multiplica?'ativo':''}, tog);
    bS.addEventListener('click', (function(ii,jj,kk,bs2,bn2){return function(){atividades[ii].extras[jj].taxas[kk].multiplica=true; bs2.className='ativo'; bn2.className='';};})(idx,j,k,bS,bN));
    bN.addEventListener('click', (function(ii,jj,kk,bs2,bn2){return function(){atividades[ii].extras[jj].taxas[kk].multiplica=false; bs2.className=''; bn2.className='ativo';};})(idx,j,k,bS,bN));
    var del = mkEl('button', {text:'x', style:'background:none;border:none;color:#C05030;font-weight:900;cursor:pointer;flex-shrink:0;font-size:0.9rem'}, row);
    del.addEventListener('click', (function(ii,jj,kk,cont){return function(){
      atividades[ii].extras[jj].taxas.splice(kk,1);
      renderTaxasExtra(cont, ii, jj, atividades[ii].extras[jj].taxas);
    };})(idx,j,k,container));
  });
}

function adicionarExtra(aid) {
  var a = atividades.find(function(x){return x.id===aid;});
  if(!a) return;
  if(!a.extras) a.extras=[];
  a.extras.push({nome:'',valor:0,multiplica:false,sinal:0,sinalModo:'fixo',taxas:[]});
  renderExtrasBox(aid, atividades.indexOf(a));
}

function removerExtra(aid, j) {
  var a = atividades.find(function(x){return x.id===aid;});
  if(!a||!a.extras) return;
  a.extras.splice(j,1);
  renderExtrasBox(aid, atividades.indexOf(a));
}

function renderTiposAcc(tipos, i, sinalAtivo, aid) {
  return tipos.map((t, j) => `
    <div class="acc-tipo-row">
      <input class="acc-tipo-input" value="${esc(t.nome)}" placeholder="Ex: Adulto"
        oninput="atividades[${i}].tipos[${j}].nome=this.value;renderSelectGrid()">
      <div class="acc-valor-wrap">
        <span class="acc-moeda">R$</span>
        <input class="acc-valor-input" type="number" min="0" step="1" value="${t.valor||0}"
          oninput="atividades[${i}].tipos[${j}].valor=parseFloat(this.value)||0;renderSelectGrid()">
      </div>
      ${sinalAtivo ? `
      <div class="acc-sinal-wrap">
        <button class="tipo-modo-btn ${t.sinalModo==='fixo'?'active':''}"
          onclick="setTipoModo(${i},${j},'sinalModo','fixo')">R$</button>
        <button class="tipo-modo-btn ${t.sinalModo==='pct'?'active':''}"
          onclick="setTipoModo(${i},${j},'sinalModo','pct')">%</button>
        <input class="acc-valor-input" type="number" min="0" step="1" value="${t.sinalValor||0}"
          oninput="atividades[${i}].tipos[${j}].sinalValor=parseFloat(this.value)||0"
          placeholder="${t.sinalModo==='pct'?'%':'R$'}" style="width:55px">
        <span style="font-size:0.65rem;color:var(--mid);font-weight:700">${calcSinalTipo(t)}</span>
      </div>` : ''}
      <button class="acc-del-tipo" data-aid="${aid}" data-j="${j}" onclick="removerTipoById(this.dataset.aid,parseInt(this.dataset.j))">✕</button>
    </div>
  `).join('');
}

function calcSinalTipo(t) {
  if(!t.sinalValor) return 'R$ 0,00';
  const v = t.sinalModo === 'pct' ? (t.valor * t.sinalValor / 100) : t.sinalValor;
  return fmtBRL(v);
}

function setTipoModo(i, j, campo, valor) {
  atividades[i].tipos[j][campo] = valor;
  _reRenderPopupAtiv();
}

function renderTaxasNew(taxas, tipos, i) {
  return taxas.map((tx, j) => `
    <div class="taxa-bloco">
      <div class="taxa-bloco-header">
        <input class="taxa-bloco-nome-input" type="text" placeholder="Nome da taxa" value="${esc(tx.nome)}"
          oninput="atividades[${i}].taxasNew[${j}].nome=this.value">
        <button class="btn-remove-taxa-bloco" onclick="removerTaxaNew(${i},${j})">✕</button>
      </div>
      ${tipos.map((t, k) => {
        const txTipo = (tx.tipos||[]).find(x=>x.nome===t.nome) || {nome:t.nome,modo:'fixo',valor:0};
        return `
        <div class="tipo-campo-row">
          <span class="tipo-campo-label" style="min-width:90px">${esc(t.nome)}</span>
          <div class="tipo-modo-toggle">
            <button class="tipo-modo-btn ${txTipo.modo==='fixo'?'active':''}"
              onclick="setTaxaTipoModo(${i},${j},'${esc(t.nome)}','fixo')">R$</button>
            <button class="tipo-modo-btn ${txTipo.modo==='pct'?'active':''}"
              onclick="setTaxaTipoModo(${i},${j},'${esc(t.nome)}','pct')">%</button>
          </div>
          <input class="tipo-campo-input" type="number" min="0" step="0.5" value="${txTipo.valor||0}"
            oninput="setTaxaTipoValor(${i},${j},'${esc(t.nome)}',this.value)">
          <span style="font-size:0.75rem;color:var(--mid);font-weight:700">
            = ${txTipo.modo==='pct' ? fmtBRL(t.valor*(txTipo.valor||0)/100) : fmtBRL(txTipo.valor||0)}
          </span>
        </div>`;
      }).join('')}
    </div>
  `).join('');
}

function setTaxaTipoModo(i, j, nomeT, modo) {
  const tx = atividades[i].taxasNew[j];
  let entry = tx.tipos.find(x=>x.nome===nomeT);
  if(!entry) { entry = {nome:nomeT,modo:'fixo',valor:0}; tx.tipos.push(entry); }
  entry.modo = modo;
  _reRenderPopupAtiv();
}

function setTaxaTipoValor(i, j, nomeT, val) {
  const tx = atividades[i].taxasNew[j];
  let entry = tx.tipos.find(x=>x.nome===nomeT);
  if(!entry) { entry = {nome:nomeT,modo:'fixo',valor:0}; tx.tipos.push(entry); }
  entry.valor = parseFloat(val)||0;
}

function adicionarTaxaNew(i) {
  if(!atividades[i].taxasNew) atividades[i].taxasNew = [];
  const tipos = atividades[i].tipos||[];
  atividades[i].taxasNew.push({
    id: uid(), nome: 'Nova Taxa',
    tipos: tipos.map(t=>({nome:t.nome, modo:'fixo', valor:0}))
  });
  _reRenderPopupAtiv();
}

async function removerTaxaNew(i, j) {
  if(!confirm('Remover esta taxa?')) return;
  atividades[i].taxasNew.splice(j, 1);
  _reRenderPopupAtiv();
}

function adicionarTipoById(aid) {
  const i = atividades.findIndex(a => a.id === aid);
  if(i < 0) return;
  atividades[i].tipos.push({nome:'Novo Tipo', valor:0, sinalModo:'fixo', sinalValor:0});
  _reRenderPopupAtiv();
}

function removerTipoById(aid, j) {
  const i = atividades.findIndex(a => a.id === aid);
  if(i < 0) return;
  if(atividades[i].tipos.length <= 1) { alert('É necessário ao menos 1 tipo de passageiro.'); return; }
  atividades[i].tipos.splice(j, 1);
  _reRenderPopupAtiv();
}

function adicionarAtividade() {
  const nova = { id: uid(), nome: 'Nova Atividade', tipos: [{nome:'Adulto', valor:0, sinalModo:'fixo', sinalValor:0}], sinalAtivo: false, taxasNew: [], extras: [], linkMidia: '' };
  atividades.push(nova);
  renderConfig();
  abrirPopupAtividade(nova.id);
}

// ===== PERÍODOS ESPECIAIS =====

function _renderPeriodosBox(aid, idx) {
  var container = document.getElementById('acc-periodos-' + aid);
  if(!container) return;
  container.innerHTML = '';
  var a = atividades[idx];
  if(!a) return;
  if(!a.periodos) a.periodos = [];
  if(a.periodos.length === 0) {
    mkEl('div', {text:'Nenhum período especial cadastrado.', style:'font-size:0.65rem;color:#888;font-weight:700;margin-bottom:6px'}, container);
    return;
  }
  a.periodos.forEach(function(p, j) {
    var box = mkEl('div', {cls:'acc-periodo-box'}, container);

    var hrow = mkEl('div', {cls:'acc-periodo-header'}, box);
    var nomeIn = mkEl('input', {cls:'acc-extra-input', type:'text', placeholder:'Nome do período (ex: Carnaval)', value:p.nome||''}, hrow);
    nomeIn.style.flex = '1';
    nomeIn.addEventListener('input', (function(ii,jj){return function(){atividades[ii].periodos[jj].nome=this.value;};})(idx,j));
    var delBtn = mkEl('button', {text:'✕', style:'background:none;border:none;color:#C05030;font-weight:900;cursor:pointer;font-size:0.9rem;flex-shrink:0'}, hrow);
    delBtn.addEventListener('click', (function(aid2,jj){return function(){removerPeriodo(aid2,jj);};})(aid,j));

    var drow = mkEl('div', {style:'display:flex;gap:6px;align-items:center;margin-top:8px'}, box);
    mkEl('span', {text:'De', style:'font-size:0.65rem;font-weight:700;color:#7A6A5A;flex-shrink:0'}, drow);
    var iniIn = mkEl('input', {type:'date', cls:'acc-extra-input', value:p.inicio||''}, drow);
    iniIn.style.flex = '1';
    iniIn.addEventListener('change', (function(ii,jj){return function(){atividades[ii].periodos[jj].inicio=this.value;};})(idx,j));
    mkEl('span', {text:'até', style:'font-size:0.65rem;font-weight:700;color:#7A6A5A;flex-shrink:0'}, drow);
    var fimIn = mkEl('input', {type:'date', cls:'acc-extra-input', value:p.fim||''}, drow);
    fimIn.style.flex = '1';
    fimIn.addEventListener('change', (function(ii,jj){return function(){atividades[ii].periodos[jj].fim=this.value;};})(idx,j));

    mkEl('div', {text:'Preços neste período:', style:'font-size:0.65rem;font-weight:800;color:#185FA5;margin-top:10px;margin-bottom:4px'}, box);
    a.tipos.forEach(function(t, k) {
      var trow = mkEl('div', {style:'display:flex;align-items:center;gap:8px;margin-bottom:5px'}, box);
      mkEl('span', {text:t.nome, style:'font-size:0.7rem;font-weight:700;color:var(--dark);min-width:70px'}, trow);
      mkEl('span', {text:'R$', style:'font-size:0.7rem;font-weight:700;color:var(--mid)'}, trow);
      var precoSalvo = (p.precos||[]).find(function(x){return x.nome===t.nome;});
      var precoIn = mkEl('input', {type:'number', cls:'acc-extra-input', value: precoSalvo ? precoSalvo.valor : t.valor, placeholder:'0'}, trow);
      precoIn.style.flex = '1';
      precoIn.addEventListener('input', (function(ii,jj,tnome){return function(){
        if(!atividades[ii].periodos[jj].precos) atividades[ii].periodos[jj].precos = [];
        var entry = atividades[ii].periodos[jj].precos.find(function(x){return x.nome===tnome;});
        if(entry) entry.valor = parseFloat(this.value)||0;
        else atividades[ii].periodos[jj].precos.push({nome:tnome, valor:parseFloat(this.value)||0});
      };})(idx,j,t.nome));
    });

    // Sinal do período
    mkEl('div', {style:'border-top:1px dashed #B5D4F4;margin:10px 0 8px'}, box);
    var sinalToggleRow = mkEl('div', {style:'display:flex;align-items:center;gap:8px;margin-bottom:6px'}, box);
    var sinalChk = mkEl('input', {type:'checkbox'}, sinalToggleRow);
    sinalChk.style.cssText = 'width:16px;height:16px;accent-color:#185FA5';
    sinalChk.checked = !!p.cobrarSinal;
    mkEl('span', {text:'Cobrar sinal neste período', style:'font-size:0.7rem;font-weight:700;color:var(--dark)'}, sinalToggleRow);

    var sinalSection = mkEl('div', {style: p.cobrarSinal ? '' : 'display:none'}, box);
    mkEl('div', {text:'Sinal por tipo:', style:'font-size:0.65rem;font-weight:800;color:#0F6E56;margin-bottom:6px'}, sinalSection);

    a.tipos.forEach(function(t) {
      var sinalSalvo = (p.sinalPrecos||[]).find(function(x){return x.nome===t.nome;}) || {sinalModo:'fixo',sinalValor:0};
      var srow = mkEl('div', {style:'display:flex;align-items:center;gap:6px;margin-bottom:5px'}, sinalSection);
      mkEl('span', {text:t.nome, style:'font-size:0.7rem;font-weight:700;color:var(--dark);min-width:70px'}, srow);
      var tog = mkEl('div', {cls:'acc-extra-tog'}, srow);
      var bF = mkEl('button', {text:'R$', cls:sinalSalvo.sinalModo==='fixo'?'ativo':''}, tog);
      var bP = mkEl('button', {text:'%',  cls:sinalSalvo.sinalModo==='pct'?'ativo':''}, tog);
      var svIn = mkEl('input', {type:'number', cls:'acc-extra-input', value:sinalSalvo.sinalValor||0, placeholder:'0'}, srow);
      svIn.style.flex = '1';
      bF.addEventListener('click', (function(ii,jj,tn,bf,bp){return function(){ _setSinalPeriodo(ii,jj,tn,'fixo'); bf.className='ativo'; bp.className=''; };})(idx,j,t.nome,bF,bP));
      bP.addEventListener('click', (function(ii,jj,tn,bf,bp){return function(){ _setSinalPeriodo(ii,jj,tn,'pct');  bf.className=''; bp.className='ativo'; };})(idx,j,t.nome,bF,bP));
      svIn.addEventListener('input', (function(ii,jj,tn){return function(){ _setSinalPeriodoValor(ii,jj,tn,parseFloat(this.value)||0); };})(idx,j,t.nome));
    });

    sinalChk.addEventListener('change', (function(ii,jj,ss){return function(){
      atividades[ii].periodos[jj].cobrarSinal = this.checked;
      ss.style.display = this.checked ? '' : 'none';
    };})(idx,j,sinalSection));
  });
}

function adicionarPeriodo(aid) {
  var a = atividades.find(function(x){return x.id===aid;});
  if(!a) return;
  if(!a.periodos) a.periodos = [];
  var precos = (a.tipos||[]).map(function(t){return {nome:t.nome, valor:t.valor||0};});
  var sinalPrecos = (a.tipos||[]).map(function(t){return {nome:t.nome, sinalModo:t.sinalModo||'fixo', sinalValor:t.sinalValor||0};});
  a.periodos.push({id:uid(), nome:'', inicio:'', fim:'', precos:precos, cobrarSinal:false, sinalPrecos:sinalPrecos});
  _renderPeriodosBox(aid, atividades.indexOf(a));
}

function _setSinalPeriodo(ii, jj, tnome, modo) {
  if(!atividades[ii].periodos[jj].sinalPrecos) atividades[ii].periodos[jj].sinalPrecos = [];
  var entry = atividades[ii].periodos[jj].sinalPrecos.find(function(x){return x.nome===tnome;});
  if(entry) entry.sinalModo = modo;
  else atividades[ii].periodos[jj].sinalPrecos.push({nome:tnome, sinalModo:modo, sinalValor:0});
}

function _setSinalPeriodoValor(ii, jj, tnome, val) {
  if(!atividades[ii].periodos[jj].sinalPrecos) atividades[ii].periodos[jj].sinalPrecos = [];
  var entry = atividades[ii].periodos[jj].sinalPrecos.find(function(x){return x.nome===tnome;});
  if(entry) entry.sinalValor = val;
  else atividades[ii].periodos[jj].sinalPrecos.push({nome:tnome, sinalModo:'fixo', sinalValor:val});
}

function removerPeriodo(aid, j) {
  var a = atividades.find(function(x){return x.id===aid;});
  if(!a||!a.periodos) return;
  a.periodos.splice(j,1);
  _renderPeriodosBox(aid, atividades.indexOf(a));
}

function removerAtividade(id) {
  if(!confirm('Remover esta atividade?')) return;
  const idx = typeof id === 'number' ? id : atividades.findIndex(a => a.id === id);
  if(idx < 0) return;
  const aid = atividades[idx].id;
  atividades.splice(idx, 1);
  salvar();
  excluirAtividadeDB(aid).catch(console.error);
  renderConfig();
  renderSelectGrid();
}
