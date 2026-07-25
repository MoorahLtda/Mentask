/* Morah — camada de autenticação (Amazon Cognito).
 *
 * Site estático: usa amazon-cognito-identity-js (carregada via CDN antes deste
 * arquivo) para autenticar por SRP no próprio navegador — a senha nunca trafega
 * em texto puro e nenhum segredo de cliente fica no front.
 *
 * Os identificadores abaixo NÃO são segredos: o User Pool Id e o Client Id
 * público são feitos para viver no front-end. As credenciais sensíveis ficam
 * só no Cognito.
 */
// Base do site = pasta onde este auth.js vive (raiz do sistema).
// Assim os destinos funcionam a partir de QUALQUER página (login, painel, raiz),
// tanto em localhost quanto no GitHub Pages (/Morah/).
const MORAH_BASE = (function () {
  try { return new URL('.', document.currentScript.src).href; }
  catch (e) { return './'; }
})();

window.MORAH_AUTH_CONFIG = {
  region: 'sa-east-1',
  UserPoolId: 'sa-east-1_Btl2myQUB',
  ClientId: '82f7e7sricqrifck9k70f783r',
  // Para onde ir depois de entrar / sair (URLs absolutas, resolvidas da raiz do site).
  // O hub foi removido do fluxo em 16/07/2026 (código em quarentena fora do repo):
  // o login agora leva direto ao painel do técnico.
  appUrl: MORAH_BASE + 'ui_kits/tecnico/index.html',
  loginUrl: MORAH_BASE + 'login/index.html',
  // Login social (Google/Microsoft) via Hosted UI do Cognito.
  // Preencher quando o domínio do Hosted UI e os provedores estiverem configurados.
  // Ex.: 'morah-auth.auth.sa-east-1.amazoncognito.com'
  hostedUiDomain: '',
  oauthRedirect: '',          // ex.: 'https://moorahltda.github.io/Mentask/ui_kits/tecnico/'
  oauthScopes: 'openid email profile',
};

(function () {
  const CFG = window.MORAH_AUTH_CONFIG;

  /* ---------- Modo demonstração (fase de teste) ----------
   * Permite entrar no sistema sem Cognito para revisar o visual.
   * Ativado pelo botão "Entrar no modo demonstração" no login e
   * persistido em localStorage. NÃO usar em produção: remova quando
   * a autenticação real estiver liberada. */
  const DEMO_KEY = 'morah-demo';
  const DEMO_PERFIL_KEY = 'morah-demo-perfil';
  // Três perfis de acesso: admin (Moorah), rh (empresa contratante) e colaborador.
  const DEMO_USERS = {
    admin: { email: 'admin@moorah.com.br', name: 'Admin Moorah', groups: ['moorah-admin'], sub: 'demo-admin' },
    tecnico: { email: 'tecnico@sst.com.br', name: 'Técnico(a) SST Demo', groups: ['tecnico'], sub: 'demo-tec' },
    rh: { email: 'rh@empresa.com.br', name: 'Gestor(a) de RH Demo', groups: ['rh', 'mentask'], sub: 'demo-rh' },
    colaborador: { email: 'colaborador@empresa.com.br', name: 'Colaborador(a) Demo', groups: ['colaborador'], sub: 'demo-colab' },
  };
  function isDemo() {
    try { return localStorage.getItem(DEMO_KEY) === '1'; } catch (e) { return false; }
  }
  function demoPerfil() {
    try { return localStorage.getItem(DEMO_PERFIL_KEY) || 'rh'; } catch (e) { return 'rh'; }
  }
  // Papel do usuário a partir dos grupos do Cognito (fonte da verdade na produção).
  function perfilFromGroups(groups) {
    if (groups.indexOf('moorah-admin') !== -1) return 'admin';
    if (groups.indexOf('tecnico') !== -1) return 'tecnico'; // white-label SST (carteira de empresas)
    if (groups.indexOf('colaborador') !== -1) return 'colaborador';
    return 'rh'; // 'rh', 'mentask' (legado) e demais grupos de produto
  }

  // Zera o contexto de empresa (drill-down). Chamado ao entrar, sair e alternar
  // demo — evita que um 'morah-empresa-id' antigo (ex.: 'loc-3' do modo demo)
  // vaze para a sessão real e vá no header x-empresa-id. Auditoria C5.
  function limparContextoEmpresa() {
    try {
      localStorage.removeItem('morah-empresa-id');
      localStorage.removeItem('morah-empresa-nome');
    } catch (e) {}
  }

  function pool() {
    if (!window.AmazonCognitoIdentity) {
      throw new Error('SDK do Cognito não carregado (amazon-cognito-identity-js).');
    }
    return new AmazonCognitoIdentity.CognitoUserPool({
      UserPoolId: CFG.UserPoolId,
      ClientId: CFG.ClientId,
    });
  }

  function cognitoUser(email) {
    return new AmazonCognitoIdentity.CognitoUser({ Username: email, Pool: pool() });
  }

  // Traduz as mensagens de erro do Cognito para PT-BR amigável.
  function friendly(err) {
    const code = (err && (err.code || err.name)) || '';
    const map = {
      NotAuthorizedException: 'E-mail ou senha incorretos.',
      UserNotFoundException: 'E-mail ou senha incorretos.',
      UserNotConfirmedException: 'Sua conta ainda não foi confirmada. Verifique o código enviado ao seu e-mail.',
      UsernameExistsException: 'Já existe uma conta com este e-mail.',
      CodeMismatchException: 'Código de verificação inválido.',
      ExpiredCodeException: 'O código expirou. Solicite um novo.',
      InvalidPasswordException: 'A senha não atende aos requisitos (mín. 8 caracteres, com maiúscula, minúscula e número).',
      InvalidParameterException: 'Verifique os dados informados.',
      LimitExceededException: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
      TooManyRequestsException: 'Muitas tentativas. Aguarde um momento.',
      PasswordResetRequiredException: 'É necessário redefinir sua senha.',
    };
    return map[code] || (err && err.message) || 'Ocorreu um erro. Tente novamente.';
  }

  /* ---------- API pública ---------- */
  const Auth = {
    config: CFG,

    // Cadastro B2C: cria a conta e dispara o e-mail com o código de confirmação.
    signUp({ name, email, password }) {
      return new Promise((resolve, reject) => {
        const attrs = [];
        if (name) attrs.push(new AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'name', Value: name }));
        pool().signUp(email, password, attrs, null, (err, res) => {
          if (err) return reject(new Error(friendly(err)));
          resolve(res);
        });
      });
    },

    // Confirma a conta com o código de 6 dígitos enviado por e-mail.
    confirm({ email, code }) {
      return new Promise((resolve, reject) => {
        cognitoUser(email).confirmRegistration(code, true, (err, res) => {
          if (err) return reject(new Error(friendly(err)));
          resolve(res);
        });
      });
    },

    resendCode({ email }) {
      return new Promise((resolve, reject) => {
        cognitoUser(email).resendConfirmationCode((err, res) => {
          if (err) return reject(new Error(friendly(err)));
          resolve(res);
        });
      });
    },

    // Login por SRP. Resolve com a sessão; rejeita com mensagem amigável.
    // Primeiro acesso (senha temporária do AdminCreateUser): rejeita com
    // NEW_PASSWORD_REQUIRED e guarda o desafio — concluir com completeNewPassword().
    _pendingNewPassword: null,
    signIn({ email, password }) {
      return new Promise((resolve, reject) => {
        const user = cognitoUser(email);
        const details = new AmazonCognitoIdentity.AuthenticationDetails({
          Username: email, Password: password,
        });
        user.authenticateUser(details, {
          onSuccess: (session) => {
            Auth._pendingNewPassword = null;
            // Login real: sai do modo demo e limpa o contexto de empresa herdado
            // (senão um 'loc-N' do demo vazaria no header x-empresa-id). Auditoria C5.
            try { localStorage.removeItem(DEMO_KEY); localStorage.removeItem(DEMO_PERFIL_KEY); } catch (e) {}
            limparContextoEmpresa();
            resolve(session);
          },
          onFailure: (err) => reject(new Error(friendly(err))),
          newPasswordRequired: (userAttributes) => {
            Auth._pendingNewPassword = { user, userAttributes };
            reject(Object.assign(new Error('NEW_PASSWORD_REQUIRED'), { code: 'NEW_PASSWORD_REQUIRED' }));
          },
        });
      });
    },

    // Conclui o desafio de primeira senha (onboarding B2B: RH/técnico criado pelo admin).
    completeNewPassword({ password }) {
      return new Promise((resolve, reject) => {
        const p = Auth._pendingNewPassword;
        if (!p) return reject(new Error('Nenhum primeiro acesso pendente. Faça login novamente.'));
        // Atributos exigidos não podem incluir os imutáveis retornados pelo desafio.
        const attrs = {};
        p.user.completeNewPasswordChallenge(password, attrs, {
          onSuccess: (session) => {
            Auth._pendingNewPassword = null;
            try { localStorage.removeItem(DEMO_KEY); localStorage.removeItem(DEMO_PERFIL_KEY); } catch (e) {}
            limparContextoEmpresa();
            resolve(session);
          },
          onFailure: (err) => reject(new Error(friendly(err))),
        });
      });
    },

    // Esqueci a senha: dispara o código.
    forgotPassword({ email }) {
      return new Promise((resolve, reject) => {
        cognitoUser(email).forgotPassword({
          onSuccess: resolve,
          onFailure: (err) => reject(new Error(friendly(err))),
        });
      });
    },

    // Confirma a nova senha com o código recebido.
    confirmForgotPassword({ email, code, password }) {
      return new Promise((resolve, reject) => {
        cognitoUser(email).confirmPassword(code, password, {
          onSuccess: resolve,
          onFailure: (err) => reject(new Error(friendly(err))),
        });
      });
    },

    // Sessão atual (ou null). Renova tokens automaticamente se possível.
    currentSession() {
      return new Promise((resolve) => {
        if (isDemo()) return resolve({ isValid: () => true, demo: true });
        const user = pool().getCurrentUser();
        if (!user) return resolve(null);
        user.getSession((err, session) => {
          if (err || !session || !session.isValid()) return resolve(null);
          resolve(session);
        });
      });
    },

    // Dados do usuário logado a partir do ID token (nome, e-mail, grupos, perfil).
    async currentUser() {
      if (isDemo()) {
        const p = demoPerfil();
        return Object.assign({ perfil: p }, DEMO_USERS[p] || DEMO_USERS.rh);
      }
      const session = await this.currentSession();
      if (!session) return null;
      const payload = session.getIdToken().decodePayload();
      const groups = payload['cognito:groups'] || [];
      return {
        email: payload.email || '',
        name: payload.name || (payload.email ? payload.email.split('@')[0] : ''),
        groups: groups,
        perfil: perfilFromGroups(groups),
        sub: payload.sub,
      };
    },

    // JWT (ID token) da sessão REAL do Cognito — null no modo demo.
    // É o que a API do Mentask valida (authorizer JWT do API Gateway).
    async idToken() {
      if (isDemo()) return null;
      const session = await this.currentSession();
      if (!session || session.demo) return null;
      try { return session.getIdToken().getJwtToken(); } catch (e) { return null; }
    },

    // O usuário tem acesso a um produto? (etiqueta/grupo)
    async hasProduct(productKey) {
      const u = await this.currentUser();
      return !!u && u.groups.indexOf(productKey) !== -1;
    },

    // Login social via Hosted UI do Cognito (Google / Microsoft).
    // provider: 'Google' | 'Microsoft' (nome do IdP configurado no User Pool).
    // Só funciona após configurar o domínio do Hosted UI + os provedores.
    federatedSignIn(provider) {
      if (!CFG.hostedUiDomain || !CFG.oauthRedirect) {
        const e = new Error('Login social ainda não configurado. Use e-mail e senha por enquanto.');
        e.code = 'SOCIAL_NOT_CONFIGURED';
        throw e;
      }
      const url = 'https://' + CFG.hostedUiDomain + '/oauth2/authorize'
        + '?identity_provider=' + encodeURIComponent(provider)
        + '&redirect_uri=' + encodeURIComponent(CFG.oauthRedirect)
        + '&response_type=code'
        + '&client_id=' + encodeURIComponent(CFG.ClientId)
        + '&scope=' + encodeURIComponent(CFG.oauthScopes);
      window.location.assign(url);
    },

    signOut() {
      try { localStorage.removeItem(DEMO_KEY); localStorage.removeItem(DEMO_PERFIL_KEY); } catch (e) {}
      limparContextoEmpresa();
      const user = pool().getCurrentUser();
      if (user) user.signOut();
    },

    // Modo demonstração (fase de teste). enterDemo(perfil) + ir ao painel = entrar sem login.
    // perfil: 'admin' | 'rh' | 'colaborador' (padrão: 'rh').
    enterDemo(perfil) {
      try {
        localStorage.setItem(DEMO_KEY, '1');
        localStorage.setItem(DEMO_PERFIL_KEY, DEMO_USERS[perfil] ? perfil : 'rh');
      } catch (e) {}
      limparContextoEmpresa(); // não herda a empresa de uma sessão anterior
    },
    exitDemo() { try { localStorage.removeItem(DEMO_KEY); localStorage.removeItem(DEMO_PERFIL_KEY); } catch (e) {} limparContextoEmpresa(); },
    isDemo,

    // Guarda de rota: garante sessão; se não houver, manda pro login.
    async requireAuth() {
      const session = await this.currentSession();
      if (!session) {
        window.location.replace(CFG.loginUrl);
        return null;
      }
      return this.currentUser();
    },
  };

  window.MorahAuth = Auth;
})();
