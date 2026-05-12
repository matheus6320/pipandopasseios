// ===== SUPABASE REST =====
async function sbFetch(path, options = {}) {
  const token = (typeof getAuthToken === 'function') ? getAuthToken() : SUPABASE_KEY;
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || ''
    },
    ...options
  });
  if(!res.ok) { const err = await res.text(); console.error('Supabase erro:', err); return null; }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ===== ATIVIDADES — SUPABASE =====
async function salvarAtividadesDB() {
  const payload = atividades.map(a => ({ id: a.id, dados: a }));
  await sbFetch('atividades', {
    method: 'POST',
    prefer: 'return=minimal,resolution=merge-duplicates',
    body: JSON.stringify(payload)
  });
  const ids = atividades.map(a => a.id);
  const remotas = await sbFetch('atividades?select=id');
  if(remotas) {
    for(const r of remotas) {
      if(!ids.includes(r.id)) {
        await sbFetch('atividades?id=eq.' + r.id, { method: 'DELETE' });
      }
    }
  }
}

async function upsertAtividadeDB(a) {
  await sbFetch('atividades', {
    method: 'POST',
    prefer: 'return=minimal,resolution=merge-duplicates',
    body: JSON.stringify({ id: a.id, dados: a })
  });
}

async function excluirAtividadeDB(id) {
  await sbFetch('atividades?id=eq.' + id, { method: 'DELETE' });
}

async function carregarAtividadesDB() {
  const data = await sbFetch('atividades?select=dados');
  if(data && data.length > 0) {
    atividades = data.map(r => r.dados);
  } else {
    carregar();
    if(atividades.length > 0) await salvarAtividadesDB();
  }
}

// ===== COTAÇÕES — SUPABASE =====
async function salvarCotacaoDB(cotacao) {
  await sbFetch('cotacoes', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({ id: cotacao.id, dados: cotacao })
  });
}

async function atualizarCotacaoDB(id, dados) {
  await sbFetch('cotacoes?id=eq.' + id, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ dados: dados })
  });
}

async function excluirCotacaoDB(id) {
  await sbFetch('cotacoes?id=eq.' + id, { method: 'DELETE' });
}

async function carregarCotacoesDB() {
  const data = await sbFetch('cotacoes?select=dados&order=created_at.desc');
  if(data && data.length > 0) {
    _cotacoesCache = data.map(r => r.dados);
  }
  return _cotacoesCache;
}

async function limparCotacoesDB() {
  await sbFetch('cotacoes', { method: 'DELETE' });
}

// ===== ATIVIDADES — memória (fallback com dados padrão) =====
function salvar() {
  salvarAtividadesDB().catch(console.error);
}

function carregar() {
  atividades = JSON.parse(JSON.stringify(dadosPadrao));
}

// ===== COTAÇÕES — memória (cache sincronizado com Supabase) =====
function carregarCotacoes() {
  return _cotacoesCache;
}

function salvarCotacoes(cots) {
  _cotacoesCache = cots;
}

function proximoNumCotacao() {
  const cots = carregarCotacoes();
  if(!cots.length) return 1;
  return Math.max(...cots.map(c => c.num||0)) + 1;
}

function registrarCotacao(dados) {
  const cots = carregarCotacoes();
  cots.unshift(dados);
  salvarCotacoes(cots);
  salvarCotacaoDB(dados).catch(console.error);
  atualizarBadge();
}

function substituirCotacao(id, dados) {
  const cots = carregarCotacoes();
  const idx  = cots.findIndex(c => c.id === id);
  if(idx >= 0) cots[idx] = dados;
  salvarCotacoes(cots);
  atualizarCotacaoDB(id, dados).catch(console.error);
  atualizarBadge();
}
