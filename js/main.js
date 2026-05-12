// ===== INIT =====
inicializarAuth().then(() => {
  if(!_sessaoAtual) return;
  _carregarSistema();
});

function _carregarSistema() {
  carregarAtividadesDB().then(() => {
    renderConfig();
    renderSelectGrid();
  }).catch(() => {
    carregar();
    renderConfig();
    renderSelectGrid();
  });

  carregarCotacoesDB().then(() => {
    atualizarBadge();
    renderRelatorio();
    renderHome();
    if(statusPermissao() === 'default') {
      setTimeout(pedirPermissaoNotificacoes, 3000);
    } else {
      verificarNotificacoes();
      iniciarAgendamento();
    }
  }).catch(() => {
    atualizarBadge();
  });
}
