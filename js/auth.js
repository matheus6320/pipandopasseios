// ===== AUTENTICAÇÃO SUPABASE =====

const _sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let _sessaoAtual = null;

function getAuthToken() {
  return _sessaoAtual?.access_token || SUPABASE_KEY;
}

async function inicializarAuth() {
  const { data } = await _sbClient.auth.getSession();
  if(data.session) {
    _sessaoAtual = data.session;
    _mostrarApp();
  } else {
    _mostrarLogin();
  }

  _sbClient.auth.onAuthStateChange((_event, session) => {
    _sessaoAtual = session;
    if(session) _mostrarApp();
    else _mostrarLogin();
  });
}

function _mostrarLogin() {
  document.getElementById('login-overlay').classList.add('ativo');
  document.getElementById('login-erro').textContent = '';
  document.getElementById('login-email').value = '';
  document.getElementById('login-senha').value = '';
  const btn = document.getElementById('login-btn');
  if(btn) { btn.textContent = 'Entrar'; btn.disabled = false; }
}

function _mostrarApp() {
  document.getElementById('login-overlay').classList.remove('ativo');
  _atualizarHeaderUsuario();
}

function _atualizarHeaderUsuario() {
  if(!_sessaoAtual) return;
  const meta = _sessaoAtual.user?.user_metadata || {};
  const nome = meta.nome || _sessaoAtual.user?.email?.split('@')[0] || '';

  const elHeader = document.getElementById('header-user-nome');
  if(elHeader) elHeader.textContent = nome;

  const elHome = document.getElementById('home-nome-usuario');
  if(elHome) elHome.textContent = (nome ? nome + ' 👋' : '👋');
}

async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const errEl = document.getElementById('login-erro');
  const btn   = document.getElementById('login-btn');

  errEl.textContent = '';
  if(!email || !senha) { errEl.textContent = 'Preencha e-mail e senha.'; return; }

  btn.textContent = 'Entrando...';
  btn.disabled = true;

  const { data, error } = await _sbClient.auth.signInWithPassword({ email, password: senha });

  if(error) {
    errEl.textContent = 'E-mail ou senha incorretos.';
    btn.textContent = 'Entrar';
    btn.disabled = false;
    return;
  }

  _sessaoAtual = data.session;
  _mostrarApp();
}

// ===== PAINEL DO USUÁRIO =====

function abrirPainelUsuario() {
  if(!_sessaoAtual) return;
  const user = _sessaoAtual.user;
  const meta = user?.user_metadata || {};

  document.getElementById('painel-nome').value        = meta.nome || '';
  document.getElementById('painel-sobrenome').value   = meta.sobrenome || '';
  document.getElementById('painel-email-atual').textContent = user?.email || '—';
  document.getElementById('painel-email-novo').value  = '';
  document.getElementById('painel-senha-nova').value  = '';
  document.getElementById('painel-senha-conf').value  = '';
  document.getElementById('painel-email-msg').textContent  = '';
  document.getElementById('painel-senha-msg').textContent  = '';

  document.getElementById('painel-usuario-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function fecharPainelUsuario() {
  document.getElementById('painel-usuario-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function _msgPainel(id, texto, ok) {
  const el = document.getElementById(id);
  if(!el) return;
  el.textContent = texto;
  el.style.color = ok ? '#1A6A3A' : '#C03030';
}

function _btnEstado(id, loading) {
  const btn = document.getElementById(id);
  if(!btn) return;
  btn.disabled = loading;
  if(loading) btn.textContent = '⏳ Salvando...';
}

async function salvarNomePerfil() {
  const nome      = document.getElementById('painel-nome').value.trim();
  const sobrenome = document.getElementById('painel-sobrenome').value.trim();
  if(!nome) { _msgPainel('painel-email-msg', 'Informe ao menos o nome.', false); return; }
  _btnEstado('btn-salvar-nome', true);
  const { data, error } = await _sbClient.auth.updateUser({ data: { nome, sobrenome } });
  _btnEstado('btn-salvar-nome', false);
  document.getElementById('btn-salvar-nome').textContent = '💾 Salvar nome';
  if(error) { _msgPainel('painel-email-msg', 'Erro ao salvar nome.', false); return; }
  _sessaoAtual = { ..._sessaoAtual, user: data.user };
  _atualizarHeaderUsuario();
  _msgPainel('painel-email-msg', '✅ Nome atualizado!', true);
}

async function salvarEmailPerfil() {
  const emailNovo = document.getElementById('painel-email-novo').value.trim();
  if(!emailNovo) { _msgPainel('painel-email-msg', 'Digite o novo e-mail.', false); return; }
  _btnEstado('btn-salvar-email', true);
  const { error } = await _sbClient.auth.updateUser({ email: emailNovo });
  _btnEstado('btn-salvar-email', false);
  document.getElementById('btn-salvar-email').textContent = '📧 Atualizar e-mail';
  if(error) { _msgPainel('painel-email-msg', 'Erro ao atualizar e-mail.', false); return; }
  _msgPainel('painel-email-msg', '✅ Confirmação enviada para o novo e-mail!', true);
}

async function salvarSenhaPerfil() {
  const nova = document.getElementById('painel-senha-nova').value;
  const conf = document.getElementById('painel-senha-conf').value;
  if(!nova || nova.length < 6) { _msgPainel('painel-senha-msg', 'A senha deve ter ao menos 6 caracteres.', false); return; }
  if(nova !== conf) { _msgPainel('painel-senha-msg', 'As senhas não coincidem.', false); return; }
  _btnEstado('btn-salvar-senha', true);
  const { error } = await _sbClient.auth.updateUser({ password: nova });
  _btnEstado('btn-salvar-senha', false);
  document.getElementById('btn-salvar-senha').textContent = '🔒 Alterar senha';
  if(error) { _msgPainel('painel-senha-msg', 'Erro ao alterar senha.', false); return; }
  document.getElementById('painel-senha-nova').value = '';
  document.getElementById('painel-senha-conf').value = '';
  _msgPainel('painel-senha-msg', '✅ Senha alterada com sucesso!', true);
}

async function esqueceuSenha() {
  const errEl = document.getElementById('login-erro');
  const email = document.getElementById('login-email').value.trim();

  if(!email) {
    errEl.style.color = '#C03030';
    errEl.textContent = 'Digite seu e-mail acima antes de continuar.';
    document.getElementById('login-email').focus();
    return;
  }

  const { error } = await _sbClient.auth.resetPasswordForEmail(email);

  if(error) {
    errEl.style.color = '#C03030';
    errEl.textContent = 'Erro ao enviar e-mail. Tente novamente.';
    return;
  }

  errEl.style.color = '#1A6A3A';
  errEl.textContent = '✅ E-mail de redefinição enviado! Verifique sua caixa de entrada.';
}

async function fazerLogout() {
  if(!confirm('Deseja sair do sistema?')) return;
  await _sbClient.auth.signOut();
  _sessaoAtual = null;
  _mostrarLogin();
}
