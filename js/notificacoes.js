// ===== NOTIFICAÇÕES DO NAVEGADOR =====

function _defaultNotifConfig() {
  return {
    followupVencido:  true,
    passeiosAmanha:   true,
    passeiosSemana:   false,
    clientesQuentes:  false,
    horarios: [
      { hora: '08:00', ativo: true  },
      { hora: '15:00', ativo: true  },
      { hora: '19:00', ativo: true  },
    ],
  };
}

function carregarNotifConfig() {
  try {
    const salvo = JSON.parse(localStorage.getItem('pipando_notif_config') || 'null');
    if(!salvo) return _defaultNotifConfig();
    return { ..._defaultNotifConfig(), ...salvo };
  } catch { return _defaultNotifConfig(); }
}

function _salvarNotifConfig(cfg) {
  localStorage.setItem('pipando_notif_config', JSON.stringify(cfg));
}

// ===== CONTROLE DE DISPAROS (evita repetir no mesmo dia) =====
function _carregarDisparos() {
  try { return JSON.parse(localStorage.getItem('pipando_notif_disparos') || '{}'); } catch { return {}; }
}

function _registrarDisparo(hora) {
  const d = _carregarDisparos();
  d[hora] = new Date().toISOString().slice(0, 10);
  localStorage.setItem('pipando_notif_disparos', JSON.stringify(d));
}

function _jaDisparouHoje(hora) {
  const d = _carregarDisparos();
  return d[hora] === new Date().toISOString().slice(0, 10);
}

// ===== AGENDAMENTO =====
var _agendamentoInterval = null;

function iniciarAgendamento() {
  if(_agendamentoInterval) clearInterval(_agendamentoInterval);
  _agendamentoInterval = setInterval(_verificarHorarios, 30000);
  _verificarHorarios();
}

function _verificarHorarios() {
  if(statusPermissao() !== 'granted') return;
  const cfg = carregarNotifConfig();
  const horarios = cfg.horarios || [];
  const agora = new Date();
  const hhmm = String(agora.getHours()).padStart(2,'0') + ':' + String(agora.getMinutes()).padStart(2,'0');
  horarios.forEach(function(h) {
    if(!h.ativo || !h.hora) return;
    if(h.hora !== hhmm) return;
    if(_jaDisparouHoje(h.hora)) return;
    _registrarDisparo(h.hora);
    verificarNotificacoes();
  });
}

// ===== PERMISSÃO =====
function pedirPermissaoNotificacoes() {
  if(!('Notification' in window)) return;
  if(Notification.permission === 'default') {
    Notification.requestPermission().then(() => renderNotifConfig());
  }
}

function statusPermissao() {
  if(!('Notification' in window)) return 'sem-suporte';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// ===== ENVIO =====
function _enviarNotificacao(titulo, corpo, filtro) {
  if(statusPermissao() !== 'granted') return;
  const n = new Notification(titulo, {
    body: corpo,
    icon: 'https://teppkevfjvbvfoidlsxt.supabase.co/storage/v1/object/public/assets/logo.png',
    tag: filtro,
    requireInteraction: false,
  });
  n.onclick = function() {
    window.focus();
    if(filtro) aplicarFiltroRapido(filtro);
    n.close();
  };
}

// ===== VERIFICAÇÃO =====
function verificarNotificacoes() {
  if(statusPermissao() !== 'granted') return;
  const cfg  = carregarNotifConfig();
  const cots = carregarCotacoes();
  const hoje = new Date(); hoje.setHours(0,0,0,0);

  // Follow-ups vencidos
  if(cfg.followupVencido) {
    const n = cots.filter(c =>
      c.followupData &&
      c.status !== 'fechado' && c.status !== 'perdido' &&
      new Date(c.followupData + 'T00:00:00') <= hoje
    ).length;
    if(n > 0) _enviarNotificacao(
      `⏰ ${n} follow-up${n > 1 ? 's' : ''} pendente${n > 1 ? 's' : ''} hoje`,
      'Toque para ver as cotações — Pipando Passeios',
      'followup'
    );
  }

  // Passeios amanhã sem confirmação
  if(cfg.passeiosAmanha) {
    const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
    const n = cots.filter(c => {
      if(c.status === 'fechado' || c.status === 'perdido') return false;
      return (c.datasPasseios||[]).some(dp => {
        if(!dp.data) return false;
        const p = dp.data.split('/');
        if(p.length !== 3) return false;
        const d = new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0]));
        return d.getTime() === amanha.getTime();
      });
    }).length;
    if(n > 0) _enviarNotificacao(
      `🔴 ${n} passeio${n > 1 ? 's' : ''} amanhã sem confirmação`,
      'Clientes ainda sem reserva confirmada — Pipando Passeios',
      'amanha'
    );
  }

  // Passeios esta semana pendentes
  if(cfg.passeiosSemana) {
    const semana = new Date(hoje); semana.setDate(semana.getDate() + 7);
    const n = cots.filter(c => {
      if(c.status === 'fechado' || c.status === 'perdido') return false;
      return (c.datasPasseios||[]).some(dp => {
        if(!dp.data) return false;
        const p = dp.data.split('/');
        if(p.length !== 3) return false;
        const d = new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0]));
        return d >= hoje && d <= semana;
      });
    }).length;
    if(n > 0) _enviarNotificacao(
      `🟡 ${n} passeio${n > 1 ? 's' : ''} esta semana pendente${n > 1 ? 's' : ''}`,
      'Cotações ainda sem confirmação para esta semana',
      'semana'
    );
  }

  // Clientes quentes sem resposta
  if(cfg.clientesQuentes) {
    const n = cots.filter(c =>
      c.temperatura === 'quente' && c.status === 'pendente'
    ).length;
    if(n > 0) _enviarNotificacao(
      `🔥 ${n} cliente${n > 1 ? 's' : ''} quente${n > 1 ? 's' : ''} sem resposta`,
      'Atenção: oportunidades quentes aguardando — Pipando Passeios',
      'hoje'
    );
  }
}

// ===== RENDER DO PAINEL =====
function renderNotifConfig() {
  const cfg    = carregarNotifConfig();
  const status = statusPermissao();

  const permEl = document.getElementById('notif-permissao-status');
  const btnEl  = document.getElementById('notif-pedir-btn');
  const painel = document.getElementById('notif-toggles');

  if(!permEl) return;

  if(!('Notification' in window)) {
    permEl.innerHTML = '<span class="notif-badge notif-sem-suporte">⚠️ Navegador não suporta notificações</span>';
    if(btnEl)  btnEl.style.display  = 'none';
    if(painel) painel.style.display = 'none';
    return;
  }

  if(status === 'granted') {
    permEl.innerHTML = '<span class="notif-badge notif-ok">✅ Notificações ativadas</span>';
    if(btnEl)  btnEl.style.display  = 'none';
    if(painel) painel.style.display = 'flex';
  } else if(status === 'denied') {
    permEl.innerHTML = '<span class="notif-badge notif-bloq">🚫 Notificações bloqueadas — libere nas configurações do navegador</span>';
    if(btnEl)  btnEl.style.display  = 'none';
    if(painel) painel.style.display = 'none';
  } else {
    permEl.innerHTML = '<span class="notif-badge notif-pendente">🔔 Permissão não concedida ainda</span>';
    if(btnEl)  btnEl.style.display  = 'block';
    if(painel) painel.style.display = 'none';
  }

  // Preenche toggles
  const _c = (id, val) => { const el = document.getElementById(id); if(el) el.checked = !!val; };
  _c('notif-followup',  cfg.followupVencido);
  _c('notif-amanha',    cfg.passeiosAmanha);
  _c('notif-semana',    cfg.passeiosSemana);
  _c('notif-quentes',   cfg.clientesQuentes);

  // Preenche horários agendados
  const horarios = cfg.horarios || _defaultNotifConfig().horarios;
  horarios.forEach(function(h, i) {
    const idx = i + 1;
    const inputHora = document.getElementById('notif-hora-' + idx);
    const inputAtivo = document.getElementById('notif-hora-' + idx + '-ativo');
    if(inputHora)  inputHora.value   = h.hora  || '';
    if(inputAtivo) inputAtivo.checked = !!h.ativo;
  });
}

function salvarNotifConfigForm() {
  const _c = id => document.getElementById(id)?.checked ?? false;
  const _v = id => (document.getElementById(id)?.value || '').trim();

  const horarios = [1, 2, 3].map(function(i) {
    return { hora: _v('notif-hora-' + i), ativo: _c('notif-hora-' + i + '-ativo') };
  }).filter(function(h) { return h.hora; });

  const cfg = {
    followupVencido: _c('notif-followup'),
    passeiosAmanha:  _c('notif-amanha'),
    passeiosSemana:  _c('notif-semana'),
    clientesQuentes: _c('notif-quentes'),
    horarios:        horarios,
  };
  _salvarNotifConfig(cfg);
  iniciarAgendamento();

  const btn = document.getElementById('notif-salvar-btn');
  if(btn) {
    btn.textContent = '✅ Salvo!';
    btn.classList.add('saved');
    setTimeout(() => { btn.textContent = '💾 Salvar'; btn.classList.remove('saved'); }, 1800);
  }
}
