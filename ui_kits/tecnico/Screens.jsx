// Morah técnico — screen content. Composes bundle primitives.
const M = window.MorahDesignSystem_32f810;
const { StatCard, Card, Button, Badge, Tabs, Input, Select, ResultBand, Icon } = M;

/* ---------- shared bits ---------- */
// Escopo por empresa nos dados locais (demo): cada empresa ativa tem seu conjunto,
// espelhando o comportamento real do banco (multi-tenant).
function chaveEmpresa(base) {
  let id = null;
  try { id = localStorage.getItem('morah-empresa-id'); } catch (e) {}
  const k = base + '-' + (id || 'padrao');
  // Migração: dados demo antigos (chave sem sufixo) reaparecem no contexto atual
  try {
    if (localStorage.getItem(k) === null && localStorage.getItem(base) !== null) {
      localStorage.setItem(k, localStorage.getItem(base));
      localStorage.removeItem(base);
    }
  } catch (e) {}
  return k;
}

function PanelCard({ children, style }) {
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', padding: 'var(--space-6)', ...style }}>{children}</div>
  );
}

function EmptyState({ icon = 'info', title, sub, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: 'var(--gray-100)',  fg: 'var(--text-muted)' },
    info:    { bg: 'var(--info-50)',   fg: 'var(--info-500)' },
    berry:   { bg: 'var(--berry-50)',  fg: 'var(--berry-600)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '56px 24px', gap: 8 }}>
      <span style={{ width: 46, height: 46, borderRadius: 'var(--radius-md)', background: t.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: t.fg, marginBottom: 6 }}>
        <Icon name={icon} size={21} />
      </span>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--text-strong)' }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 380, lineHeight: 1.6 }}>{sub}</div>
    </div>
  );
}

function PanelTitle({ title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 'var(--space-5)' }}>
      <div>
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-strong)' }}>{title}</h3>
        {sub && <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ---------- Bar chart (Histórico de Avaliações) ---------- */
function BarChart({ chart }) {
  const W = 1040, H = 280, padL = 40, padB = 30, padT = 18;
  const innerH = H - padB - padT, innerW = W - padL - 12;
  const n = chart.values.length;
  const bw = 22;
  const yticks = [0, 4, 8, 12, 16];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 300 }}>
      {yticks.map((v) => {
        const y = padT + innerH - (v / chart.max) * innerH;
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - 12} y2={y} stroke="var(--gray-100)" strokeWidth="1" />
            <text x={padL - 12} y={y + 4} textAnchor="end" fontFamily="var(--font-mono)" fontSize="11" fill="var(--text-faint)">{v}</text>
          </g>
        );
      })}
      {chart.values.map((v, i) => {
        const cx = padL + (innerW / n) * (i + 0.5);
        const bh = (v / chart.max) * innerH;
        const y = padT + innerH - bh;
        return (
          <g key={i}>
            {v > 0 && <rect x={cx - bw / 2} y={y} width={bw} height={bh} rx="5" fill="var(--berry-500)" />}
            {v > 0 && <text x={cx} y={y - 8} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" fill="var(--text-muted)">{v}</text>}
            {v === 0 && <line x1={cx - bw / 2} y1={padT + innerH} x2={cx + bw / 2} y2={padT + innerH} stroke="var(--gray-300)" strokeWidth="2" strokeLinecap="round" />}
            <text x={cx} y={H - 8} textAnchor="middle" fontFamily="var(--font-body)" fontSize="11.5" fill="var(--text-muted)">{chart.labels[i]}/2026</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- Overview ---------- */
function OverviewScreen() {
  const D = window.MORAH;
  const [range, setRange] = React.useState('Últimos 6 meses');
  const [kpisApi, setKpisApi] = React.useState(null); // sessão real → números do banco

  React.useEffect(() => {
    (async () => {
      try {
        if (!window.MorahApi || !window.MorahAuth) return;
        if (!(await window.MorahAuth.idToken())) return; // modo demo → KPIs mock
        const perfil = (window.MORAH_USER || {}).perfil;
        const [cols, cps] = await Promise.all([
          window.MorahApi.chamar('GET', '/colaboradores').catch(() => []),
          window.MorahApi.chamar('GET', '/campanhas').catch(() => []),
        ]);
        let empresasN = null;
        if (perfil === 'admin' || perfil === 'tecnico') {
          const es = await window.MorahApi.chamar('GET', '/empresas').catch(() => null);
          empresasN = es ? es.length : null;
        }
        const convites = cps.reduce((a, c) => a + (Number(c.convites) || 0), 0);
        const respostas = cps.reduce((a, c) => a + (Number(c.respondidos) || 0), 0);
        setKpisApi([
          empresasN !== null
            ? { id: 'emp', label: perfil === 'tecnico' ? 'Empresas na carteira' : 'Empresas', value: String(empresasN), icon: 'building-2', tone: 'blue' }
            : { id: 'cps', label: 'Campanhas', value: String(cps.length), icon: 'calendar-range', tone: 'blue' },
          { id: 'col', label: 'Colaboradores', value: String(cols.length), icon: 'users', tone: 'green' },
          { id: 'env', label: 'Convites enviados', value: String(convites), icon: 'send', tone: 'amber' },
          { id: 'res', label: 'Respostas · adesão', value: respostas + (convites ? ' · ' + Math.round((respostas / convites) * 100) + '%' : ''), icon: 'message-circle', tone: 'berry' },
        ]);
      } catch (e) { /* demo → KPIs mock */ }
    })();
  }, []);

  const kpis = kpisApi || D.kpis;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
        {kpis.map((k) => <StatCard key={k.id} label={k.label} value={k.value} icon={k.icon} tone={k.tone} data={k.data} />)}
      </div>
      {!kpisApi && (
        <PanelCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-strong)' }}>Histórico de Avaliações</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--berry-500)' }}></span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Avaliações Realizadas</span>
              </span>
              <div style={{ width: 168 }}><Select value={range} onChange={(e) => setRange(e.target.value)} options={['Últimos 6 meses', 'Últimos 12 meses', 'Este ano']} /></div>
            </div>
          </div>
          <BarChart chart={D.chart} />
        </PanelCard>
      )}
    </div>
  );
}

/* ---------- Empresas (admin: todas as contratantes · técnico: carteira white-label) ---------- */
function EmpresasScreen() {
  const D = window.MORAH;
  const KEY = 'morah-empresas';
  const seedLocal = () => D.companies.map((c, i) => ({ id: 'loc-' + i, razao_social: c.name, cnpj: c.cnpj, colaboradores: 0, status: 'ativa' }));
  const lerLocal = () => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v) return v;
      const s = seedLocal();
      localStorage.setItem(KEY, JSON.stringify(s)); // persiste o seed: "Gerenciar" resolve o nome após o reload
      return s;
    } catch (e) { return seedLocal(); }
  };
  const [modo, setModo] = React.useState('local');
  const [lista, setLista] = React.useState(lerLocal);
  const [q, setQ] = React.useState('');
  const [form, setForm] = React.useState({ razao: '', cnpj: '', rhNome: '', rhEmail: '' });
  const [erro, setErro] = React.useState('');
  const [aviso, setAviso] = React.useState('');
  const perfil = (window.MORAH_USER || {}).perfil || 'tecnico';
  const empresaAtivaId = (() => { try { return localStorage.getItem('morah-empresa-id'); } catch (e) { return null; } })();

  const carregar = async () => { setLista(await window.MorahApi.chamar('GET', '/empresas')); };
  React.useEffect(() => {
    (async () => { try { if (!window.MorahApi) return; await carregar(); setModo('api'); } catch (e) {} })();
  }, []);
  const salvarLocal = (l) => { setLista(l); try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} };

  const criar = async () => {
    if (!form.razao.trim()) { setErro('Informe a razão social.'); return; }
    setErro(''); setAviso('');
    if (modo === 'api') {
      try {
        const corpo = { razao_social: form.razao.trim(), cnpj: form.cnpj.trim() || null };
        if (perfil === 'admin' && form.rhEmail.trim()) { corpo.rh_email = form.rhEmail.trim(); corpo.rh_nome = form.rhNome.trim() || null; }
        const r = await window.MorahApi.chamar('POST', '/empresas', corpo);
        await carregar();
        setForm({ razao: '', cnpj: '', rhNome: '', rhEmail: '' });
        setAviso(r.rh ? 'Empresa criada — o RH (' + r.rh.email + ') recebeu a senha temporária por e-mail.' : 'Empresa criada' + (perfil === 'tecnico' ? ' na sua carteira.' : '.'));
      } catch (e) { setErro(e.message); }
      return;
    }
    salvarLocal([{ id: 'loc-' + Date.now(), razao_social: form.razao.trim(), cnpj: form.cnpj.trim(), colaboradores: 0, status: 'ativa' }, ...lista]);
    setForm({ razao: '', cnpj: '', rhNome: '', rhEmail: '' });
  };

  const gerenciar = (e) => {
    // Entra na empresa: define o contexto e abre a Visão Geral dela.
    // O nome é guardado junto p/ o topo travado aparecer imediatamente após o reload.
    try {
      localStorage.setItem('morah-empresa-id', e.id);
      localStorage.setItem('morah-empresa-nome', e.razao_social || '');
      sessionStorage.setItem('morah-ir-para', 'empresa');
    } catch (x) {}
    window.location.reload();
  };

  const filtro = q.trim().toLowerCase();
  const list = lista.filter((c) => !filtro || (c.razao_social || '').toLowerCase().includes(filtro) || (c.cnpj || '').includes(filtro));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PanelCard>
        <PanelTitle title="Nova empresa"
          sub={perfil === 'tecnico'
            ? (modo === 'api' ? 'A empresa entra na sua carteira — você gerencia estrutura, colaboradores e campanhas dela.' : 'Modo demonstração — dados locais')
            : 'Cadastro da contratante · informe o e-mail do RH para criar o acesso (senha temporária enviada automaticamente)'} />
        <div style={{ display: 'grid', gridTemplateColumns: perfil === 'admin' ? '1.6fr 1fr 1fr 1.2fr auto' : '2fr 1.2fr auto', gap: 10 }}>
          <Input placeholder="Razão social" value={form.razao} onChange={(e) => setForm({ ...form, razao: e.target.value })} />
          <Input placeholder="CNPJ (opcional)" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
          {perfil === 'admin' && <Input placeholder="Nome do RH (opcional)" value={form.rhNome} onChange={(e) => setForm({ ...form, rhNome: e.target.value })} />}
          {perfil === 'admin' && <Input placeholder="E-mail do RH (cria o acesso)" value={form.rhEmail} onChange={(e) => setForm({ ...form, rhEmail: e.target.value })} />}
          <Button variant="primary" iconLeft="plus" onClick={criar}>Cadastrar</Button>
        </div>
        {erro && <div style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--critical-500)', fontWeight: 600 }}>{erro}</div>}
        {aviso && <div style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--success-700)', fontWeight: 600 }}>{aviso}</div>}
      </PanelCard>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, maxWidth: 360 }}>
          <Input icon="search" placeholder="Buscar por nome ou CNPJ" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Badge tone="berry">{list.length} empresa(s)</Badge>
        {modo === 'local' && <Badge tone="warning" solid>Modo demonstração</Badge>}
      </div>

      {list.length === 0 ? (
        <PanelCard style={{ padding: 0 }}>
          <EmptyState icon="building-2" title="Nenhuma empresa"
            sub={perfil === 'tecnico' ? 'Cadastre a primeira empresa da sua carteira para começar a operar.' : 'Cadastre a primeira contratante.'} />
        </PanelCard>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
          {list.map((c) => (
            <Card key={c.id} interactive padding="var(--space-5)" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--berry-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--berry-600)', flexShrink: 0 }}>
                  <Icon name="building-2" size={17} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-strong)', lineHeight: 1.35 }}>{c.razao_social}</span>
                    {c.id === empresaAtivaId && <Badge tone="success" solid>Ativa</Badge>}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 7 }}>
                    {c.cnpj || 'CNPJ não informado'} · {c.colaboradores || 0} colaborador(es)
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--gray-100)' }}>
                <Button size="sm" variant="secondary" iconLeft="arrow-right" onClick={() => gerenciar(c)}>Gerenciar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Relatórios ---------- */
function RelatoriosScreen() {
  const lerAvaliacoes = () => { try { return JSON.parse(localStorage.getItem('morah-avaliacoes') || '[]'); } catch (e) { return []; } };
  const [avaliacoes, setAvaliacoes] = React.useState(lerAvaliacoes);
  const [recorte, setRecorte] = React.useState('Todos os setores');
  const [aggApi, setAggApi] = React.useState(null);      // agregados vindos do servidor (k-anonimato lá)
  const [campanhaApi, setCampanhaApi] = React.useState(null);
  const [modo, setModo] = React.useState('local');

  // Sessão real → resultados agregados da API (o dado bruto nunca chega ao navegador)
  React.useEffect(() => {
    (async () => {
      try {
        if (!window.MorahApi) return;
        const cps = await window.MorahApi.chamar('GET', '/campanhas');
        const cp = cps.find((x) => x.status === 'ativa') || cps[0];
        if (!cp) { setModo('api'); return; } // logado sem campanha ainda
        const r = await window.MorahApi.chamar('GET', '/campanhas/' + cp.id + '/resultados');
        setCampanhaApi(cp); setAggApi(r); setModo('api');
      } catch (e) { /* demo → cálculo local */ }
    })();
  }, []);

  const M = window.MorahMotor;
  const aggLocal = React.useMemo(() => M.calcular(avaliacoes), [avaliacoes]);
  // Auditoria A9: em modo API NUNCA cair no cálculo local (morah-avaliacoes = dados
  // demo/offline). Sem agregado do servidor → estado vazio, não o demo. Assim o
  // relatório e o laudo de uma sessão logada jamais exibem demonstração como real.
  const aggVazio = { n: 0, kAnonimato: (M && M.K_ANONIMATO) || 5, amostraSuficiente: false, global: null, recortes: [] };
  const agg = modo === 'api' ? (aggApi || aggVazio) : aggLocal;

  // Última visão para o laudo/plano (lidos daqui). Marca ORIGEM (real/demo) e a EMPRESA
  // do resultado: o laudo recusa emitir demo (A9) e "Sugerir ações" só usa se a empresa
  // bater com a ativa (A8) — nada de plano da empresa A cair na empresa B.
  React.useEffect(() => {
    try {
      if (agg && agg.n) {
        let empresaId = null;
        try { empresaId = localStorage.getItem('morah-empresa-id'); } catch (e) {}
        const marcado = Object.assign({}, agg, { _empresaId: empresaId || null, _origem: modo === 'api' ? 'real' : 'demo' });
        sessionStorage.setItem('morah-ultimo-resultado', JSON.stringify(marcado));
      }
    } catch (e) {}
  }, [agg, modo]);

  const gerarDemo = () => {
    const demo = M.gerarDemo();
    const tudo = [...avaliacoes, ...demo];
    try { localStorage.setItem('morah-avaliacoes', JSON.stringify(tudo)); } catch (e) {}
    setAvaliacoes(tudo);
  };
  const limparDemo = () => {
    const reais = avaliacoes.filter((a) => !a.demo);
    try { localStorage.setItem('morah-avaliacoes', JSON.stringify(reais)); } catch (e) {}
    setAvaliacoes(reais);
    setRecorte('Todos os setores');
  };

  if (!agg.n) {
    return (
      <PanelCard style={{ padding: 0 }}>
        <EmptyState icon="bar-chart-3" title="Ainda não há respostas"
          sub={modo === 'api'
            ? (campanhaApi ? 'A campanha "' + campanhaApi.nome + '" ainda não recebeu respostas.' : 'Crie uma campanha e envie o questionário na tela Colaboradores.')
            : 'Envie o questionário aos colaboradores para gerar o diagnóstico — ou gere dados de demonstração para conhecer o relatório.'} />
        {modo === 'local' && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 'var(--space-6)' }}>
            <Button variant="secondary" iconLeft="sparkles" onClick={gerarDemo}>Gerar dados de demonstração</Button>
          </div>
        )}
      </PanelCard>
    );
  }

  // k-anonimato aplicado no servidor: há respostas, mas menos que o mínimo — nada é exibido
  if (!agg.global) {
    return (
      <PanelCard style={{ padding: 0 }}>
        <EmptyState icon="lock" title="Aguardando o mínimo de respostas"
          sub={'Já há ' + agg.n + ' resposta(s), mas os resultados só são liberados com ' + agg.kAnonimato + ' ou mais — proteção de anonimato aplicada no servidor.'} />
      </PanelCard>
    );
  }

  // Recorte selecionado (k-anonimato aplicado pelo motor)
  // O rótulo da opção é gerado UMA vez e usado tanto na lista quanto na seleção,
  // para casar EXATO. Antes o match era por prefixo (recorte.indexOf(r.setor)===0):
  // com setores como "Produção" e "Produção Norte", selecionar um podia trazer o
  // resultado do outro — dado errado no relatório e, por tabela, no laudo. Auditoria M5.
  const rotuloRecorte = (r) => r.setor + (r.suficiente ? '' : ' (n<' + agg.kAnonimato + ' — oculto)');
  const opcoes = ['Todos os setores', ...agg.recortes.map(rotuloRecorte)];
  const recSel = agg.recortes.find((r) => rotuloRecorte(r) === recorte);
  const bloqueado = recSel && !recSel.suficiente;
  const res = recSel && recSel.suficiente ? recSel.resultado : agg.global;
  const nExibido = recSel && recSel.suficiente ? recSel.n : agg.n;

  const temDemo = avaliacoes.some((a) => a.demo);
  const totalBandeiras = res ? res.bandeiras.length : 0;

  const NivelRow = ({ nome, detalhe, nivel }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderTop: '1px solid var(--gray-100)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-strong)' }}>{nome}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>{detalhe}</div>
      </div>
      {nivel ? <ResultBand level={nivel} /> : <Badge tone="neutral">Sem dados</Badge>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ width: 260 }}>
          <Select value={recorte} onChange={(e) => setRecorte(e.target.value)} options={opcoes} />
        </div>
        <Badge tone="berry">{nExibido} resposta(s)</Badge>
        {modo === 'api' && campanhaApi && <Badge tone="info">{campanhaApi.nome}</Badge>}
        {!agg.amostraSuficiente && <Badge tone="warning" solid>Amostra &lt; {agg.kAnonimato} — modo de teste</Badge>}
        <div style={{ flex: 1 }}></div>
        <Button variant="primary" iconLeft="file-text" onClick={() => window.open('../../avaliacao/laudo.html', '_blank')}>Abrir laudo (PDF)</Button>
        {modo === 'local' && (temDemo
          ? <Button variant="ghost" iconLeft="trash-2" onClick={limparDemo}>Limpar dados de teste</Button>
          : <Button variant="ghost" iconLeft="sparkles" onClick={gerarDemo}>Gerar dados de demonstração</Button>)}
      </div>

      {bloqueado ? (
        <PanelCard style={{ padding: 0 }}>
          <EmptyState icon="lock" title="Recorte protegido por anonimato" sub={'Este setor tem menos de ' + agg.kAnonimato + ' respondentes. Para proteger o anonimato (k-anonimato), os resultados só são exibidos com ' + agg.kAnonimato + ' ou mais respostas.'} />
        </PanelCard>
      ) : (
        <React.Fragment>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
            <StatCard label="Respostas" value={String(nExibido)} icon="clipboard-list" tone="berry" />
            <StatCard label="Dimensões críticas" value={String(res.dimensoesCriticas)} icon="alert-triangle" tone={res.dimensoesCriticas ? 'amber' : 'green'} />
            <StatCard label="Bandeiras de alerta" value={String(totalBandeiras)} icon="flag" tone={totalBandeiras ? 'amber' : 'green'} />
          </div>

          {/* Bandeiras */}
          {totalBandeiras > 0 && (
            <PanelCard>
              <PanelTitle title="Bandeiras de alerta imediato" sub="Gatilhos que independem do score — tratar prioritariamente no plano de ação" />
              {res.bandeiras.map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 4px', borderTop: '1px solid var(--gray-100)', alignItems: 'flex-start' }}>
                  <span style={{ marginTop: 2, color: b.nivel === 'critico' ? 'var(--critical-500)' : 'var(--warning-500)' }}><Icon name="flag" size={16} /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-strong)' }}>{b.titulo}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: '2px 0' }}>{b.detalhe}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--berry-700)', fontWeight: 600 }}>Ação sugerida: {b.acao}</div>
                  </div>
                  <ResultBand level={b.nivel} />
                </div>
              ))}
            </PanelCard>
          )}

          {/* Núcleo COPSOQ */}
          <PanelCard>
            <PanelTitle title="Dimensões COPSOQ II-Br" sub="Núcleo validado — classificação por tercis da faixa teórica, respeitando a direção do risco" />
            {res.nucleo.map((d) => (
              <NivelRow key={d.id} nome={d.nome} nivel={d.nivel}
                detalhe={(d.media === null ? '—' : d.media + ' / ' + d.max) + ' · ' + (d.dir === 'risco' ? 'maior = pior' : 'maior = melhor')} />
            ))}
          </PanelCard>

          {/* Indicadores Moorah */}
          <PanelCard>
            <PanelTitle title="Indicadores Moorah" sub="Índice de risco 0–4 (itens de proteção invertidos) · cortes 1,33 / 2,67" />
            {res.moorah.map((m) => (
              <NivelRow key={m.id} nome={m.nome} nivel={m.nivel}
                detalhe={m.indice === null ? 'sem respostas aplicáveis' : 'índice ' + m.indice.toFixed(2) + ' / 4'} />
            ))}
          </PanelCard>

          {/* Exposições */}
          <PanelCard>
            <PanelTitle title="Comportamentos ofensivos e violência" sub="Últimos 12 meses — qualquer exposição gera acompanhamento" />
            {res.ofensivos.map((o) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 4px', borderTop: '1px solid var(--gray-100)' }}>
                <div style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-strong)' }}>{o.nome}</div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{o.expostos} relato(s) · {o.pct}%</span>
                {o.expostos === 0 ? <Badge tone="success" solid>Sem relatos</Badge> : o.recorrentes > 0 ? <Badge tone="critical" solid>Recorrente</Badge> : <Badge tone="warning" solid>Pontual</Badge>}
              </div>
            ))}
          </PanelCard>

          {/* Voz do trabalhador */}
          {res.vozes.length > 0 && (
            <PanelCard>
              <PanelTitle title="Voz do trabalhador" sub="Relatos abertos, exibidos sem identificação" />
              {res.vozes.map((v, i) => (
                <div key={i} style={{ padding: '9px 4px', borderTop: '1px solid var(--gray-100)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-body)', fontStyle: 'italic' }}>
                  “{v.texto}”
                </div>
              ))}
            </PanelCard>
          )}

          <div style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)', lineHeight: 1.7 }}>
            Relatório gerado pela plataforma Moorah · Questionário Moorah v1.0 (núcleo COPSOQ II-Br)<br />
            Dados anônimos e agregados — recortes exibidos apenas com n ≥ {agg.kAnonimato}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

/* ---------- Comparar Relatórios (evolução entre campanhas) ---------- */
function CompararScreen() {
  const [modo, setModo] = React.useState('local');
  const [cps, setCps] = React.useState([]);
  const [selA, setSelA] = React.useState('—');
  const [selB, setSelB] = React.useState('—');
  const [resA, setResA] = React.useState(null);
  const [resB, setResB] = React.useState(null);
  const [erro, setErro] = React.useState('');

  React.useEffect(() => {
    (async () => {
      try {
        if (!window.MorahApi) return;
        const lista = await window.MorahApi.chamar('GET', '/campanhas');
        setCps(lista); setModo('api');
        if (lista.length >= 2) { setSelA(lista[1].nome); setSelB(lista[0].nome); }
      } catch (e) {}
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      if (modo !== 'api') return;
      setErro('');
      const buscar = async (nome, setRes) => {
        const cp = cps.find((c) => c.nome === nome);
        if (!cp) { setRes(null); return; }
        try { setRes(await window.MorahApi.chamar('GET', '/campanhas/' + cp.id + '/resultados')); }
        catch (e) { setRes(null); setErro(e.message); }
      };
      await buscar(selA, setResA);
      await buscar(selB, setResB);
    })();
  }, [selA, selB, modo, cps]);

  const prontos = resA && resA.global && resB && resB.global;
  const compara = (dimId) => {
    const a = resA.global.nucleo.find((d) => d.id === dimId);
    const b = resB.global.nucleo.find((d) => d.id === dimId);
    if (!a || !b || a.media === null || b.media === null) return null;
    const delta = b.media - a.media;
    const melhorou = a.dir === 'risco' ? delta < 0 : delta > 0;
    return { a, b, delta, melhorou, estavel: Math.abs(delta) < 0.05 };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PanelCard>
        <PanelTitle title="Comparação entre campanhas" sub={modo === 'api' ? 'Escolha dois ciclos para ver a evolução por dimensão' : 'Disponível com sessão real e duas campanhas encerradas — no modo demonstração, os ciclos ainda não existem'} />
        {modo === 'api' ? (
          <React.Fragment>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 260 }}><Select value={selA} onChange={(e) => setSelA(e.target.value)} options={['—', ...cps.map((c) => c.nome)]} /></div>
              <Icon name="arrow-right" size={16} color="var(--text-muted)" />
              <div style={{ width: 260 }}><Select value={selB} onChange={(e) => setSelB(e.target.value)} options={['—', ...cps.map((c) => c.nome)]} /></div>
            </div>
            {erro && <div style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--critical-500)', fontWeight: 600 }}>{erro}</div>}
            {!prontos && !erro && (
              <div style={{ marginTop: 14, fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {cps.length < 2 ? 'É preciso ter pelo menos 2 campanhas com respostas suficientes (n ≥ 5) para comparar.' : 'Selecione duas campanhas com resultados liberados (n ≥ 5).'}
              </div>
            )}
            {prontos && (
              <div style={{ marginTop: 16 }}>
                {resA.global.nucleo.map((d) => {
                  const cmp = compara(d.id);
                  if (!cmp) return null;
                  return (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 4px', borderTop: '1px solid var(--gray-100)', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 220, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-strong)' }}>{d.nome}</div>
                      <ResultBand level={cmp.a.nivel} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{cmp.a.media} → {cmp.b.media}</span>
                      <ResultBand level={cmp.b.nivel} />
                      {cmp.estavel
                        ? <Badge tone="neutral">Estável</Badge>
                        : cmp.melhorou ? <Badge tone="success" solid>Melhorou</Badge> : <Badge tone="critical" solid>Piorou</Badge>}
                    </div>
                  );
                })}
              </div>
            )}
          </React.Fragment>
        ) : (
          <EmptyState icon="arrow-left-right" title="Dois ciclos são necessários" sub="Com sessão real, crie campanhas por período (ex.: 2026-1 e 2026-2); a evolução dimensão a dimensão aparece aqui." />
        )}
      </PanelCard>
      <PanelCard>
        <PanelTitle title="Legenda de Interpretação dos Resultados" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
          {[
            { lv: 'critico', desc: 'Necessita de intervenção imediata.' },
            { lv: 'atencao', desc: 'Requer atenção e melhorias.' },
            { lv: 'adequado', desc: 'Situação adequada.' },
          ].map((b, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ResultBand level={b.lv} showRange />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', paddingLeft: 2 }}>{b.desc}</span>
            </div>
          ))}
        </div>
      </PanelCard>
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)', lineHeight: 1.7 }}>
        Relatório gerado pela plataforma Moorah · Ferramenta de Indicador de Estresse<br />
        Dados anônimos e agregados — 11/06/2026 às 13:37:29
      </div>
    </div>
  );
}

/* ---------- Modelos de Apresentação ---------- */
function ModelosScreen() {
  const D = window.MORAH;
  return (
    <PanelCard>
      <PanelTitle
        title="Biblioteca de Modelos"
        sub={`${D.models.length} itens`}
        right={
          <div style={{ display: 'flex', gap: 6 }}>
            <button aria-label="Ver em lista" style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--surface-card)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}><Icon name="list" size={15} /></button>
            <button aria-label="Ver em grade" style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', border: '1px solid var(--berry-200)', background: 'var(--berry-50)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--berry-600)' }}><Icon name="layout-grid" size={15} /></button>
          </div>
        }
      />
      <div>
        {D.models.map((m, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 2px',
            borderBottom: i < D.models.length - 1 ? '1px solid var(--gray-100)' : 'none',
          }}>
            <span style={{ width: 38, height: 38, borderRadius: 'var(--radius-sm)', background: 'var(--berry-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--berry-600)', flexShrink: 0 }}>
              <Icon name={m.kind === 'Vídeo' ? 'play' : m.kind === 'Slides' ? 'presentation' : 'file-text'} size={17} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-strong)', lineHeight: 1.35 }}>{m.t}</span>
                <Badge tone="info">{m.kind}</Badge>
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 3 }}>Adicionado em {m.d}</div>
            </div>
            <Button size="sm" variant="secondary" iconLeft={m.kind === 'Vídeo' ? 'play' : 'download'} style={{ flexShrink: 0 }}>{m.kind === 'Vídeo' ? 'Assistir' : 'Baixar'}</Button>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

/* ---------- Termos ---------- */
function TermosScreen() {
  const VERSAO = '1.0';
  const KEY = 'morah-aceite-termos';
  const [aceite, setAceite] = React.useState(null);   // { versao, aceito_em } | null
  const [modo, setModo] = React.useState('local');
  const [erro, setErro] = React.useState('');
  const usuario = window.MORAH_USER || {};

  React.useEffect(() => {
    (async () => {
      try {
        if (!window.MorahApi) return;
        const r = await window.MorahApi.chamar('GET', '/aceite-termos');
        setModo('api');
        setAceite(r.find((a) => a.versao === VERSAO) || null);
      } catch (e) {
        try { setAceite(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e2) {}
      }
    })();
  }, []);

  const aceitar = async () => {
    const registro = { versao: VERSAO, aceito_em: new Date().toISOString() };
    if (modo === 'api') {
      try { await window.MorahApi.chamar('POST', '/aceite-termos', { versao: VERSAO }); setAceite(registro); }
      catch (e) { setErro(e.message); }
      return;
    }
    try { localStorage.setItem(KEY, JSON.stringify(registro)); } catch (e) {}
    setAceite(registro);
  };

  const fmtQuando = (a) => { try { return new Date(a.aceito_em).toLocaleString('pt-BR'); } catch (e) { return '—'; } };

  return (
    <PanelCard style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
        <div>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-strong)' }}>Termos de Uso da Plataforma — v{VERSAO}</h3>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.8, marginTop: 6 }}>
            Usuário: {usuario.name || '—'}{usuario.email ? ' (' + usuario.email + ')' : ''}
            {aceite && <span> · Aceito em: <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-body)' }}>{fmtQuando(aceite)}</span></span>}
          </div>
          {erro && <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--critical-500)', fontWeight: 600, marginTop: 4 }}>{erro}</div>}
        </div>
        {aceite
          ? <Badge tone="success" style={{ marginTop: 3 }}>Aceito</Badge>
          : <Badge tone="warning" solid style={{ marginTop: 3 }}>Pendente</Badge>}
      </div>
      <div style={{
        background: 'var(--gray-50)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
        padding: 'var(--space-6) var(--space-8)', marginTop: 14,
        fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.75,
        height: 'calc(100vh - 440px)', minHeight: 320, overflow: 'auto',
      }}>
        <strong>TERMOS DE USO DA PLATAFORMA MOORAH — LICENCIAMENTO PARA REVENDA E APLICAÇÃO</strong>
        <p><strong>1. ACEITAÇÃO DOS TERMOS.</strong> Ao utilizar a plataforma "Moorah" o USUÁRIO concorda integralmente com as condições de uso, captura e tratamento de dados psicossociais conforme a NR-1, garantindo a anonimização e agregação dos resultados.</p>
        <p><strong>2. LICENÇA DE USO.</strong> A licença concede ao técnico de segurança do trabalho o direito de aplicar avaliações, gerar relatórios e gerenciar empresas vinculadas à sua conta, dentro do limite de avaliações contratado.</p>
        <p><strong>3. PROTEÇÃO DE DADOS (LGPD).</strong> O tratamento de dados pessoais observa a Lei nº 13.709/2018. As respostas individuais são anonimizadas na coleta e apresentadas exclusivamente de forma agregada; a plataforma não permite a identificação de respondentes nos relatórios, painéis ou exportações.</p>
        <p><strong>4. RESPONSABILIDADES DO USUÁRIO.</strong> O USUÁRIO compromete-se a aplicar os instrumentos de avaliação conforme as orientações técnicas da plataforma, a manter sigilo sobre suas credenciais de acesso e a utilizar os resultados unicamente para fins de gestão de riscos psicossociais no âmbito do PGR.</p>
        <p><strong>5. PROPRIEDADE INTELECTUAL.</strong> Os instrumentos, metodologias de interpretação, marca e materiais de apoio disponibilizados são de titularidade da Moorah, sendo vedada a reprodução ou redistribuição fora do escopo da licença contratada.</p>
        <p><strong>6. VIGÊNCIA E RESCISÃO.</strong> Estes termos vigoram enquanto durar a relação contratual. O descumprimento das cláusulas acima autoriza a suspensão imediata do acesso, sem prejuízo das demais medidas cabíveis.</p>
        <p><strong>7. DISPOSIÇÕES GERAIS.</strong> Dúvidas sobre estes termos ou sobre o tratamento de dados podem ser encaminhadas ao encarregado de dados indicado no contrato de licenciamento.</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
        {!aceite && <Button variant="primary" iconLeft="check" onClick={aceitar}>Li e aceito os termos (v{VERSAO})</Button>}
        <Button variant="secondary" iconLeft="printer" onClick={() => window.print()}>Imprimir / salvar PDF</Button>
      </div>
    </PanelCard>
  );
}

/* ---------- Estrutura organizacional (CRUD genérico: unidades/setores/departamentos/cargos) ---------- */
function EstruturaScreen({ recurso, rotuloSing, rotuloPl, exemplo }) {
  const KEY = chaveEmpresa('morah-estr-' + recurso);
  const lerLocal = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
  const [modo, setModo] = React.useState('local');
  const [lista, setLista] = React.useState(lerLocal);
  const [nome, setNome] = React.useState('');
  const [erro, setErro] = React.useState('');
  const [editando, setEditando] = React.useState(null); // { id, nome }

  const carregar = async () => { setLista(await window.MorahApi.chamar('GET', '/' + recurso)); };
  React.useEffect(() => {
    (async () => { try { if (!window.MorahApi) return; await carregar(); setModo('api'); } catch (e) {} })();
  }, []);
  const salvarLocal = (l) => { setLista(l); try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} };

  const adicionar = async () => {
    if (!nome.trim()) { setErro('Informe o nome.'); return; }
    setErro('');
    if (modo === 'api') {
      try { await window.MorahApi.chamar('POST', '/' + recurso, { nome: nome.trim() }); await carregar(); setNome(''); }
      catch (e) { setErro(e.message); }
      return;
    }
    salvarLocal([...lista, { id: Date.now(), nome: nome.trim() }]);
    setNome('');
  };
  const renomear = async (item, novo) => {
    setEditando(null);
    if (!novo.trim() || novo.trim() === item.nome) return;
    if (modo === 'api') {
      try { await window.MorahApi.chamar('PATCH', '/' + recurso + '/' + item.id, { nome: novo.trim() }); await carregar(); }
      catch (e) { setErro(e.message); }
      return;
    }
    salvarLocal(lista.map((x) => (x.id === item.id ? { ...x, nome: novo.trim() } : x)));
  };
  const remover = async (item) => {
    if (modo === 'api') {
      try { await window.MorahApi.chamar('DELETE', '/' + recurso + '/' + item.id); await carregar(); }
      catch (e) { setErro(e.message); }
      return;
    }
    salvarLocal(lista.filter((x) => x.id !== item.id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PanelCard>
        <PanelTitle title={'Nova ' + rotuloSing} sub={modo === 'api' ? 'Salvo no banco da sua empresa' : 'Modo demonstração — dados locais'} />
        <div style={{ display: 'flex', gap: 10, maxWidth: 560 }}>
          <div style={{ flex: 1 }}>
            <Input placeholder={'Nome — ex.: ' + exemplo} value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') adicionar(); }} />
          </div>
          <Button variant="primary" iconLeft="plus" onClick={adicionar}>Adicionar</Button>
        </div>
        {erro && <div style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--critical-500)', fontWeight: 600 }}>{erro}</div>}
      </PanelCard>

      <PanelCard>
        <PanelTitle title={rotuloPl} sub={lista.length + ' cadastrado(s)'} />
        {lista.length === 0 ? (
          <EmptyState icon="layers" title={'Nenhum(a) ' + rotuloSing + ' cadastrado(a)'} sub={'Use o formulário acima para estruturar ' + rotuloPl.toLowerCase() + ' da empresa.'} />
        ) : (
          lista.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 4px', borderTop: '1px solid var(--gray-100)' }}>
              {editando && editando.id === item.id ? (
                <div style={{ flex: 1, maxWidth: 420 }}>
                  <Input autoFocus value={editando.nome}
                    onChange={(e) => setEditando({ id: item.id, nome: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') renomear(item, editando.nome); if (e.key === 'Escape') setEditando(null); }}
                    onBlur={() => renomear(item, editando.nome)} />
                </div>
              ) : (
                <div style={{ flex: 1, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--text-strong)' }}>{item.nome}</div>
              )}
              <Button size="sm" variant="ghost" iconLeft="pencil" onClick={() => setEditando({ id: item.id, nome: item.nome })}>Renomear</Button>
              <Button size="sm" variant="ghost" iconLeft="trash-2" style={{ color: 'var(--critical-500)' }} onClick={() => remover(item)} />
            </div>
          ))
        )}
      </PanelCard>
    </div>
  );
}

/* ---------- Campanhas de avaliação ---------- */
function CampanhasScreen() {
  const KEY = chaveEmpresa('morah-campanhas');
  const lerLocal = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
  const [modo, setModo] = React.useState('local');
  const [lista, setLista] = React.useState(lerLocal);
  const [form, setForm] = React.useState({ nome: 'Avaliação Psicossocial ' + new Date().getFullYear(), inicio: '', fim: '' });
  const [erro, setErro] = React.useState('');

  const carregar = async () => { setLista(await window.MorahApi.chamar('GET', '/campanhas')); };
  React.useEffect(() => {
    (async () => { try { if (!window.MorahApi) return; await carregar(); setModo('api'); } catch (e) {} })();
  }, []);
  const salvarLocal = (l) => { setLista(l); try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} };

  const criar = async () => {
    if (!form.nome.trim()) { setErro('Dê um nome à campanha.'); return; }
    setErro('');
    if (modo === 'api') {
      try {
        await window.MorahApi.chamar('POST', '/campanhas', { nome: form.nome.trim(), inicio: form.inicio || null, fim: form.fim || null });
        await carregar();
      } catch (e) { setErro(e.message); }
      return;
    }
    salvarLocal([{ id: Date.now(), nome: form.nome.trim(), inicio: form.inicio, fim: form.fim, status: 'ativa', convites: 0, respondidos: 0 }, ...lista]);
  };
  const mudarStatus = async (c, status) => {
    if (modo === 'api') {
      try { await window.MorahApi.chamar('PATCH', '/campanhas/' + c.id, { status }); await carregar(); }
      catch (e) { setErro(e.message); }
      return;
    }
    salvarLocal(lista.map((x) => (x.id === c.id ? { ...x, status } : x)));
  };

  const dataStyle = {
    fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--text-strong)',
    background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-control)', padding: '10px 12px', outline: 'none',
  };
  const fmtData = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '—');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PanelCard>
        <PanelTitle title="Nova campanha" sub={modo === 'api' ? 'Um ciclo de avaliação por período — os convites são vinculados à campanha ativa' : 'Modo demonstração — dados locais'} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <Input placeholder="Nome da campanha" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <input type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} style={dataStyle} title="Início" />
          <input type="date" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} style={dataStyle} title="Fim" />
          <Button variant="primary" iconLeft="plus" onClick={criar}>Criar campanha</Button>
        </div>
        {erro && <div style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--critical-500)', fontWeight: 600 }}>{erro}</div>}
      </PanelCard>

      <PanelCard>
        <PanelTitle title="Campanhas" sub={lista.length + ' campanha(s)'} />
        {lista.length === 0 ? (
          <EmptyState icon="calendar-range" title="Nenhuma campanha" sub="Crie a primeira campanha para organizar o ciclo de avaliação e enviar os convites." />
        ) : (
          lista.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px', borderTop: '1px solid var(--gray-100)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1.4, minWidth: 200 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-strong)' }}>{c.nome}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
                  {fmtData(c.inicio)} — {fmtData(c.fim)} · v{c.instrumento_versao || '1.0'}
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {(c.convites || 0)} convite(s) · {(c.respondidos || 0)} resposta(s)
              </span>
              {c.status === 'ativa' ? <Badge tone="success" solid>Ativa</Badge>
                : c.status === 'encerrada' ? <Badge tone="neutral">Encerrada</Badge>
                : <Badge tone="info">Rascunho</Badge>}
              {c.status !== 'ativa' && <Button size="sm" variant="leaf" iconLeft="play" onClick={() => mudarStatus(c, 'ativa')}>Ativar</Button>}
              {c.status === 'ativa' && <Button size="sm" variant="secondary" iconLeft="square" onClick={() => mudarStatus(c, 'encerrada')}>Encerrar</Button>}
            </div>
          ))
        )}
      </PanelCard>
    </div>
  );
}

/* ---------- Gestão de Denúncias (RH / comitê — Lei 14.457/22) ---------- */
function DenunciasGestaoScreen() {
  const KEY = 'morah-denuncias';
  const lerLocal = () => {
    try { return (JSON.parse(localStorage.getItem(KEY) || '[]')).map((d) => ({ status: 'aberta', ...d, id: d.id || d.protocolo })); }
    catch (e) { return []; }
  };
  const [modo, setModo] = React.useState('local');
  const [lista, setLista] = React.useState(lerLocal);
  const [erro, setErro] = React.useState('');

  const carregar = async () => { setLista(await window.MorahApi.chamar('GET', '/denuncias')); };
  React.useEffect(() => {
    (async () => { try { if (!window.MorahApi) return; await carregar(); setModo('api'); } catch (e) {} })();
  }, []);

  const mudarStatus = async (d, status) => {
    if (modo === 'api') {
      try { await window.MorahApi.chamar('PATCH', '/denuncias/' + d.id, { status }); await carregar(); }
      catch (e) { setErro(e.message); }
      return;
    }
    const novo = lista.map((x) => (x.id === d.id ? { ...x, status } : x));
    setLista(novo);
    try { localStorage.setItem(KEY, JSON.stringify(novo)); } catch (e) {}
  };

  const abertas = lista.filter((d) => d.status === 'aberta').length;
  const apurando = lista.filter((d) => d.status === 'apurando').length;
  const fmtData = (d) => { try { return new Date(d.criado_em || d.em).toLocaleDateString('pt-BR'); } catch (e) { return '—'; } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
        <StatCard label="Relatos abertos" value={String(abertas)} icon="inbox" tone={abertas ? 'amber' : 'green'} />
        <StatCard label="Em apuração" value={String(apurando)} icon="search" tone="blue" />
        <StatCard label="Total recebidos" value={String(lista.length)} icon="shield" tone="berry" />
      </div>

      <PanelCard>
        <PanelTitle title="Relatos recebidos" sub="Apuração sigilosa — a identidade de quem relata nunca é registrada. Retorno pelo número de protocolo." />
        {erro && <div style={{ marginBottom: 8, fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--critical-500)', fontWeight: 600 }}>{erro}</div>}
        {lista.length === 0 ? (
          <EmptyState icon="shield" title="Nenhum relato recebido" sub="Os relatos enviados pelos colaboradores no Canal de Denúncias aparecem aqui para apuração." />
        ) : (
          lista.map((d) => (
            <div key={d.id} style={{ display: 'flex', gap: 12, padding: '12px 4px', borderTop: '1px solid var(--gray-100)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--berry-700)' }}>{d.protocolo}</span>
                  <Badge tone="berry">{d.categoria}</Badge>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-faint)' }}>{fmtData(d)}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-body)', marginTop: 6, lineHeight: 1.6 }}>{d.relato}</div>
              </div>
              {d.status === 'concluida' ? <Badge tone="success" solid>Concluída</Badge>
                : d.status === 'apurando' ? <Badge tone="info">Em apuração</Badge>
                : <Badge tone="warning" solid>Aberta</Badge>}
              {d.status === 'aberta' && <Button size="sm" variant="secondary" iconLeft="search" onClick={() => mudarStatus(d, 'apurando')}>Iniciar apuração</Button>}
              {d.status === 'apurando' && <Button size="sm" variant="leaf" iconLeft="check" onClick={() => mudarStatus(d, 'concluida')}>Concluir</Button>}
              {d.status === 'concluida' && <Button size="sm" variant="ghost" iconLeft="rotate-ccw" onClick={() => mudarStatus(d, 'apurando')}>Reabrir</Button>}
            </div>
          ))
        )}
      </PanelCard>
    </div>
  );
}

/* ---------- Plano de Ação (NR-1: medidas com prazo, responsável e indicador) ---------- */
function PlanoScreen() {
  const KEY = chaveEmpresa('morah-plano');
  const M = window.MorahMotor;
  const DIMENSOES = ['—'].concat(M.NUCLEO.map((d) => d.nome)).concat(M.MOORAH.map((m) => m.nome)).concat(['Outra']);
  const lerLocal = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
  const [modo, setModo] = React.useState('local');
  const [lista, setLista] = React.useState(lerLocal);
  const [form, setForm] = React.useState({ titulo: '', dimensao: '—', prioridade: 'media', responsavel: '', prazo: '', indicador: '' });
  const [erro, setErro] = React.useState('');
  const [aviso, setAviso] = React.useState('');

  const carregar = async () => { setLista(await window.MorahApi.chamar('GET', '/acoes')); };
  React.useEffect(() => {
    (async () => { try { if (!window.MorahApi) return; await carregar(); setModo('api'); } catch (e) {} })();
  }, []);
  const salvarLocal = (l) => { setLista(l); try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} };

  const criarAcao = async (dados) => {
    if (modo === 'api') { await window.MorahApi.chamar('POST', '/acoes', dados); return; }
    salvarLocal([{ id: Date.now() + Math.random(), status: 'pendente', criado_em: new Date().toISOString(), ...dados }, ...lerLocal()]);
  };

  const adicionar = async () => {
    if (!form.titulo.trim()) { setErro('Descreva a medida (título).'); return; }
    setErro('');
    try {
      await criarAcao({
        titulo: form.titulo.trim(),
        dimensao: form.dimensao === '—' ? null : form.dimensao,
        prioridade: form.prioridade,
        responsavel: form.responsavel.trim() || null,
        prazo: form.prazo || null,
        indicador: form.indicador.trim() || null,
      });
      if (modo === 'api') await carregar();
      setForm({ titulo: '', dimensao: '—', prioridade: 'media', responsavel: '', prazo: '', indicador: '' });
    } catch (e) { setErro(e.message); }
  };

  // Sugestões a partir do último relatório (bandeiras + dimensões críticas)
  const sugerir = async () => {
    let agg = null;
    try { agg = JSON.parse(sessionStorage.getItem('morah-ultimo-resultado') || 'null'); } catch (e) {}
    if (!agg || !agg.global) { setAviso('Abra a tela Relatórios primeiro — as sugestões nascem do último diagnóstico.'); return; }
    // Auditoria A8: o resultado é uma chave de sessão única; se ele for de OUTRA empresa
    // (viu a empresa A em Relatórios, trocou p/ B e clicou aqui), não gerar plano de A em B.
    let empresaAtual = null;
    try { empresaAtual = localStorage.getItem('morah-empresa-id'); } catch (e) {}
    if (agg._empresaId && empresaAtual && agg._empresaId !== empresaAtual) {
      setAviso('O último relatório aberto é de outra empresa. Abra a tela Relatórios desta empresa antes de sugerir ações.');
      return;
    }
    const existentes = new Set(lista.map((a) => a.titulo));
    const sugestoes = [];
    agg.global.bandeiras.forEach((b) => {
      if (!existentes.has(b.acao)) sugestoes.push({ titulo: b.acao, dimensao: b.titulo, prioridade: b.nivel === 'critico' ? 'alta' : 'media', indicador: 'Reavaliação no próximo ciclo' });
    });
    agg.global.nucleo.filter((d) => d.nivel === 'critico').forEach((d) => {
      const t = 'Tratar dimensão crítica: ' + d.nome;
      if (!existentes.has(t)) sugestoes.push({ titulo: t, dimensao: d.nome, prioridade: 'alta', indicador: 'Sair do tercil crítico no próximo ciclo' });
    });
    agg.global.moorah.filter((m) => m.nivel === 'critico').forEach((m) => {
      const t = 'Tratar indicador crítico: ' + m.nome;
      if (!existentes.has(t)) sugestoes.push({ titulo: t, dimensao: m.nome, prioridade: 'alta', indicador: 'Índice abaixo de 2,67 no próximo ciclo' });
    });
    if (!sugestoes.length) { setAviso('Nenhuma sugestão nova — o plano já cobre as bandeiras e dimensões críticas do último relatório.'); return; }
    try {
      for (const s of sugestoes) await criarAcao(s);
      if (modo === 'api') await carregar();
      setAviso(sugestoes.length + ' ação(ões) sugerida(s) adicionada(s) a partir do último relatório.');
    } catch (e) { setErro(e.message); }
  };

  const mudarStatus = async (a, status) => {
    if (modo === 'api') {
      try { await window.MorahApi.chamar('PATCH', '/acoes/' + a.id, { status }); await carregar(); } catch (e) { setErro(e.message); }
      return;
    }
    salvarLocal(lista.map((x) => (x.id === a.id ? { ...x, status } : x)));
  };
  const remover = async (a) => {
    if (modo === 'api') {
      try { await window.MorahApi.chamar('DELETE', '/acoes/' + a.id); await carregar(); } catch (e) { setErro(e.message); }
      return;
    }
    salvarLocal(lista.filter((x) => x.id !== a.id));
  };

  const vencida = (a) => a.prazo && a.status !== 'concluida' && new Date(a.prazo) < new Date(new Date().toDateString());
  const fmtData = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : 'sem prazo');
  const pendentes = lista.filter((a) => a.status !== 'concluida').length;
  const vencidas = lista.filter(vencida).length;

  const inputStyle = {
    fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--text-strong)',
    background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-control)', padding: '10px 12px', outline: 'none', width: '100%',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
        <StatCard label="Ações no plano" value={String(lista.length)} icon="list-checks" tone="berry" />
        <StatCard label="Em aberto" value={String(pendentes)} icon="clock" tone={pendentes ? 'amber' : 'green'} />
        <StatCard label="Vencidas" value={String(vencidas)} icon="alert-triangle" tone={vencidas ? 'amber' : 'green'} />
      </div>

      <PanelCard>
        <PanelTitle title="Nova ação" sub={modo === 'api' ? 'Registrada no banco da empresa — compõe a evidência de gestão exigida pela NR-1' : 'Modo demonstração — dados locais'} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.9fr', gap: 10 }}>
          <Input placeholder="Medida — ex.: Revisar metas do setor Produção" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          <Select value={form.dimensao} onChange={(e) => setForm({ ...form, dimensao: e.target.value })} options={DIMENSOES} />
          <Select value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })} options={['alta', 'media', 'baixa']} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1.6fr auto', gap: 10, marginTop: 10 }}>
          <Input placeholder="Responsável" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
          <input type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} style={inputStyle} title="Prazo" />
          <Input placeholder="Indicador de eficácia — ex.: absenteísmo do setor" value={form.indicador} onChange={(e) => setForm({ ...form, indicador: e.target.value })} />
          <Button variant="primary" iconLeft="plus" onClick={adicionar}>Adicionar</Button>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="secondary" iconLeft="sparkles" onClick={sugerir}>Sugerir ações do último relatório</Button>
          {aviso && <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--success-700)', fontWeight: 600 }}>{aviso}</span>}
          {erro && <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--critical-500)', fontWeight: 600 }}>{erro}</span>}
        </div>
      </PanelCard>

      <PanelCard>
        <PanelTitle title="Plano de ação" sub="Medidas priorizadas · o fiscal verifica prazos, responsáveis e indicadores" />
        {lista.length === 0 ? (
          <EmptyState icon="list-checks" title="Plano vazio" sub="Adicione medidas manualmente ou gere sugestões a partir do último relatório." />
        ) : (
          lista.map((a) => (
            <div key={a.id} style={{ display: 'flex', gap: 12, padding: '12px 4px', borderTop: '1px solid var(--gray-100)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {a.prioridade === 'alta' ? <Badge tone="critical" solid>Alta</Badge> : a.prioridade === 'baixa' ? <Badge tone="neutral">Baixa</Badge> : <Badge tone="warning" solid>Média</Badge>}
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-strong)' }}>{a.titulo}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: vencida(a) ? 'var(--critical-500)' : 'var(--text-muted)', marginTop: 5 }}>
                  {(a.dimensao ? a.dimensao + ' · ' : '')}{(a.responsavel ? a.responsavel + ' · ' : '')}prazo {fmtData(a.prazo)}{vencida(a) ? ' (VENCIDA)' : ''}{a.indicador ? ' · indicador: ' + a.indicador : ''}
                </div>
              </div>
              {a.status === 'concluida' ? <Badge tone="success" solid>Concluída</Badge>
                : a.status === 'andamento' ? <Badge tone="info">Em andamento</Badge>
                : <Badge tone="neutral">Pendente</Badge>}
              {a.status === 'pendente' && <Button size="sm" variant="secondary" iconLeft="play" onClick={() => mudarStatus(a, 'andamento')}>Iniciar</Button>}
              {a.status !== 'concluida' && <Button size="sm" variant="leaf" iconLeft="check" onClick={() => mudarStatus(a, 'concluida')}>Concluir</Button>}
              {a.status === 'concluida' && <Button size="sm" variant="ghost" iconLeft="rotate-ccw" onClick={() => mudarStatus(a, 'andamento')}>Reabrir</Button>}
              <Button size="sm" variant="ghost" iconLeft="trash-2" style={{ color: 'var(--critical-500)' }} onClick={() => remover(a)} />
            </div>
          ))
        )}
      </PanelCard>
    </div>
  );
}

/* ---------- Colaborador: Questionários Pendentes ---------- */
function PendentesScreen() {
  const [respondido, setRespondido] = React.useState(() => {
    try { return localStorage.getItem('morah-avaliacao-ok') === '1'; } catch (e) { return false; }
  });
  const [convitesApi, setConvitesApi] = React.useState(null); // null = demo/local
  const url = new URL('../../avaliacao/', window.location.href).href;

  // Sessão real: convites verdadeiros deste colaborador vêm da API
  React.useEffect(() => {
    (async () => {
      try {
        if (!window.MorahApi) return;
        const r = await window.MorahApi.chamar('GET', '/meus-convites');
        setConvitesApi(r);
      } catch (e) { /* demo → card local */ }
    })();
  }, []);

  const CardConvite = ({ titulo, sub, resp, onClick, rotulo }) => (
    <PanelCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--berry-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--berry-600)', flexShrink: 0 }}>
          <Icon name="clipboard-list" size={20} />
        </span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--text-strong)' }}>{titulo}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
        </div>
        {resp ? <Badge tone="success" solid>Respondido</Badge> : <Badge tone="warning" solid>Pendente</Badge>}
        {(!resp || rotulo) && <Button variant={resp ? 'secondary' : 'primary'} iconLeft="play-circle" onClick={onClick}>{rotulo || 'Responder agora'}</Button>}
      </div>
    </PanelCard>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {convitesApi !== null ? (
        convitesApi.length === 0
          ? <PanelCard style={{ padding: 0 }}><EmptyState icon="check-circle" title="Nenhum questionário pendente" sub="Quando o RH enviar uma nova avaliação, ela aparecerá aqui." /></PanelCard>
          : convitesApi.map((cv) => (
              <CardConvite key={cv.token} titulo={cv.campanha}
                sub={'Questionário Moorah · anônimo · 15 a 20 minutos'}
                resp={cv.status === 'respondido'}
                onClick={() => window.open(url + '?t=' + cv.token, '_blank')} />
            ))
      ) : (
        <CardConvite titulo="Avaliação Psicossocial — NR-1"
          sub="Questionário Moorah v1.0 · anônimo · 15 a 20 minutos"
          resp={respondido}
          onClick={() => window.open(url, '_blank')}
          rotulo={respondido ? 'Responder novamente' : 'Responder agora'} />
      )}
      <PanelCard>
        <PanelTitle title="Sobre a sua participação" />
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.7 }}>
          Suas respostas são <b>anônimas</b> — os resultados são calculados por grupos e nenhuma resposta
          individual pode ser identificada. A participação é voluntária e avalia as condições do ambiente
          de trabalho, não o seu desempenho. Recortes só são exibidos com 5 ou mais respondentes.
        </div>
      </PanelCard>
    </div>
  );
}

/* ---------- Colaborador: Canal de Denúncias (Lei 14.457/22) ---------- */
function DenunciaScreen() {
  const CATEGORIAS = ['Assédio moral', 'Assédio sexual', 'Discriminação', 'Violência ou ameaça', 'Sobrecarga ou condições de trabalho', 'Outro'];
  const [categoria, setCategoria] = React.useState(CATEGORIAS[0]);
  const [relato, setRelato] = React.useState('');
  const [erro, setErro] = React.useState('');
  const [protocolo, setProtocolo] = React.useState(null);

  const enviar = async () => {
    if (relato.trim().length < 10) { setErro('Descreva a situação com um pouco mais de detalhe para que ela possa ser apurada.'); return; }
    // Sessão real → registra no servidor (protocolo oficial); demo → localStorage
    try {
      if (window.MorahApi) {
        const r = await window.MorahApi.chamar('POST', '/denuncias', { categoria, relato: relato.trim() });
        setProtocolo(r.protocolo);
        return;
      }
    } catch (e) {
      if (e.code !== 'SEM_JWT' && e.code !== 'SEM_API') { setErro(e.message); return; }
    }
    const p = 'MD-' + Date.now().toString(36).toUpperCase();
    try {
      const arr = JSON.parse(localStorage.getItem('morah-denuncias') || '[]');
      arr.push({ protocolo: p, categoria, relato: relato.trim(), em: new Date().toISOString() });
      localStorage.setItem('morah-denuncias', JSON.stringify(arr));
    } catch (e) {}
    setProtocolo(p);
  };

  if (protocolo) {
    return (
      <PanelCard>
        <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
          <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success-500)', marginBottom: 14 }}>
            <Icon name="check" size={26} />
          </span>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 'var(--text-xl)', color: 'var(--text-strong)' }}>Relato registrado com sigilo</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: '8px auto 0', maxWidth: 480, lineHeight: 1.7 }}>
            Guarde o seu protocolo para acompanhamento:&nbsp;
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--berry-700)' }}>{protocolo}</span><br />
            O relato será tratado com confidencialidade e sem retaliação, conforme a Lei 14.457/22.
          </div>
          <div style={{ marginTop: 18 }}>
            <Button variant="secondary" onClick={() => { setProtocolo(null); setRelato(''); setErro(''); }}>Registrar outro relato</Button>
          </div>
        </div>
      </PanelCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PanelCard>
        <PanelTitle title="Registrar relato" sub="Canal sigiloso e sem retaliação (Lei 14.457/22). Você não precisa se identificar." />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>
          <div style={{ width: 320, maxWidth: '100%' }}>
            <Select value={categoria} onChange={(e) => setCategoria(e.target.value)} options={CATEGORIAS} />
          </div>
          <textarea value={relato} onChange={(e) => { setRelato(e.target.value); setErro(''); }}
            placeholder="Descreva a situação: o que aconteceu, onde, quando e com que frequência. Não é necessário se identificar."
            style={{
              width: '100%', minHeight: 140, resize: 'vertical', padding: '12px 14px',
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--text-strong)',
              background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-control)', outline: 'none',
            }} />
          {erro && <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--critical-500)', fontWeight: 600 }}>{erro}</div>}
          <div>
            <Button variant="primary" iconLeft="send" onClick={enviar}>Enviar relato</Button>
          </div>
        </div>
      </PanelCard>
      <PanelCard>
        <PanelTitle title="Como o seu relato é tratado" />
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.7 }}>
          O relato chega apenas ao comitê responsável pela apuração, com registro de protocolo e prazo de retorno.
          A empresa é proibida de retaliar quem relata de boa-fé. Em situação de risco imediato, procure
          também a liderança direta, o RH ou os canais públicos (Disque 100 / 180).
        </div>
      </PanelCard>
    </div>
  );
}

/* ---------- Enviar Questionário ---------- */
function EnvioScreen() {
  const KEY = chaveEmpresa('morah-colaboradores');
  const ler = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
  const [modo, setModo] = React.useState('local'); // 'api' com sessão real; 'local' no demo
  const [campanha, setCampanha] = React.useState(null);
  const [lista, setLista] = React.useState(ler);
  const [form, setForm] = React.useState({ nome: '', email: '', fone: '', setor: '' });
  const [erro, setErro] = React.useState('');
  const [aviso, setAviso] = React.useState('');
  const baseUrl = new URL('../../avaliacao/', window.location.href).href;

  const salvar = (l) => { setLista(l); if (modo === 'local') { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} } };
  const novoToken = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 8);
  const linkDe = (c) => baseUrl + '?t=' + c.token;

  // ===== Modo API: colaboradores + campanha ativa + status dos convites vêm do banco =====
  const carregarApi = async () => {
    const cols = await window.MorahApi.chamar('GET', '/colaboradores');
    const cps = await window.MorahApi.chamar('GET', '/campanhas');
    const cp = cps.find((x) => x.status === 'ativa') || cps[0] || null;
    let convites = [];
    if (cp) convites = await window.MorahApi.chamar('GET', '/campanhas/' + cp.id + '/convites');
    const porColab = {};
    convites.forEach((cv) => { porColab[cv.nome + '|' + (cv.email || '')] = cv; });
    setCampanha(cp);
    setLista(cols.map((co) => {
      const cv = porColab[co.nome + '|' + (co.email || '')];
      return {
        id: co.id, nome: co.nome, email: co.email || '', fone: co.telefone || '',
        setor: co.setor_nome || '', token: cv ? cv.token : null,
        status: cv ? (cv.status === 'respondido' ? 'resp' : 'env') : 'nao',
      };
    }));
  };

  React.useEffect(() => {
    (async () => {
      try {
        if (!window.MorahApi) return;
        await carregarApi();
        setModo('api');
      } catch (e) {
        // SEM_JWT (demo) ou API indisponível → localStorage
        try {
          const envios = JSON.parse(localStorage.getItem('morah-avaliacoes') || '[]');
          const toks = new Set(envios.map((x) => x.convite).filter(Boolean));
          const loc = ler();
          if (toks.size && loc.some((c) => toks.has(c.token) && c.status !== 'resp')) {
            const novo = loc.map((c) => (toks.has(c.token) ? { ...c, status: 'resp' } : c));
            try { localStorage.setItem(KEY, JSON.stringify(novo)); } catch (e2) {}
            setLista(novo);
          }
        } catch (e2) {}
      }
    })();
  }, []);

  // Garante campanha ativa + convite (token) para o colaborador — API cria e dispara o e-mail via SES
  const garantirConvite = async (c) => {
    if (c.token) return c.token;
    let cp = campanha;
    if (!cp) {
      cp = await window.MorahApi.chamar('POST', '/campanhas', { nome: 'Avaliação Psicossocial ' + new Date().getFullYear() });
      setCampanha(cp);
    }
    const r = await window.MorahApi.chamar('POST', '/campanhas/' + cp.id + '/convites', { colaboradorIds: [c.id] });
    await carregarApi();
    if (r.emails_enviados > 0) setAviso('Convite enviado por e-mail pela plataforma para ' + c.nome.split(' ')[0] + '.');
    const convites = await window.MorahApi.chamar('GET', '/campanhas/' + cp.id + '/convites');
    const cv = convites.find((x) => x.nome === c.nome && (x.email || '') === (c.email || ''));
    return cv ? cv.token : null;
  };

  const adicionar = async () => {
    if (!form.nome.trim()) { setErro('Informe o nome do colaborador.'); return; }
    if (!form.email.trim() && !form.fone.trim()) { setErro('Informe e-mail ou WhatsApp para o envio.'); return; }
    setErro('');
    if (modo === 'api') {
      try {
        await window.MorahApi.chamar('POST', '/colaboradores', {
          nome: form.nome.trim(), email: form.email.trim() || null, telefone: form.fone.trim() || null,
          setor: form.setor.trim() || null, // Auditoria M3: enviar o setor (o back resolve/cria por nome)
        });
        await carregarApi();
        setForm({ nome: '', email: '', fone: '', setor: '' });
      } catch (e) { setErro(e.message); }
      return;
    }
    salvar([...lista, {
      id: Date.now(), token: novoToken(), status: 'nao',
      nome: form.nome.trim(), email: form.email.trim(), fone: form.fone.trim(), setor: form.setor.trim(),
    }]);
    setForm({ nome: '', email: '', fone: '', setor: '' });
  };
  const marcar = (c, status) => salvar(lista.map((x) => (x.id === c.id ? { ...x, status } : x)));
  const remover = async (c) => {
    if (modo === 'api') {
      try { await window.MorahApi.chamar('DELETE', '/colaboradores/' + c.id); await carregarApi(); } catch (e) { setErro(e.message); }
      return;
    }
    salvar(lista.filter((x) => x.id !== c.id));
  };

  const mensagem = (c, token) => 'Olá, ' + c.nome.split(' ')[0] + '! Você foi convidado(a) a responder a Avaliação do Ambiente de Trabalho da sua empresa. É anônima e leva cerca de 15 minutos. Acesse: ' + baseUrl + '?t=' + token;
  const viaWhats = async (c) => {
    const token = modo === 'api' ? await garantirConvite(c) : c.token;
    if (!token) return;
    const d = c.fone.replace(/\D/g, '');
    const n = d.length <= 11 ? '55' + d : d;
    window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(mensagem(c, token)), '_blank');
    if (modo === 'local' && c.status === 'nao') marcar(c, 'env');
  };
  const viaEmail = async (c) => {
    if (modo === 'api') {
      const jaTinha = !!c.token;
      const token = await garantirConvite(c);
      // convite novo: a plataforma já enviou via SES; reenvio manual abre o e-mail pronto
      if (jaTinha && token) {
        window.open('mailto:' + c.email + '?subject=' + encodeURIComponent('Avaliação do Ambiente de Trabalho — sua participação é importante') + '&body=' + encodeURIComponent(mensagem(c, token)));
      }
      return;
    }
    window.open('mailto:' + c.email + '?subject=' + encodeURIComponent('Avaliação do Ambiente de Trabalho — sua participação é importante') + '&body=' + encodeURIComponent(mensagem(c, c.token)));
    if (c.status === 'nao') marcar(c, 'env');
  };
  const copiarLink = async (c) => {
    const token = modo === 'api' ? await garantirConvite(c) : c.token;
    if (!token) return;
    navigator.clipboard.writeText(baseUrl + '?t=' + token);
    if (modo === 'local' && c.status === 'nao') marcar(c, 'env');
  };

  const StatusBadge = ({ s }) => (
    s === 'resp' ? <Badge tone="success" solid>Respondido</Badge>
    : s === 'env' ? <Badge tone="info">Enviado</Badge>
    : <Badge tone="neutral">Não enviado</Badge>
  );

  const respondidos = lista.filter((c) => c.status === 'resp').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PanelCard>
        <PanelTitle title="Cadastrar colaborador" sub="O convite individual é gerado com um link único. O envio marca o status; as respostas continuam anônimas e desvinculadas da identidade." />
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 1fr 1fr auto', gap: 10, alignItems: 'center' }}>
          <Input placeholder="Nome completo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Input placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="WhatsApp (DDD + número)" value={form.fone} onChange={(e) => setForm({ ...form, fone: e.target.value })} />
          <Input placeholder="Setor" value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} />
          <Button variant="primary" iconLeft="plus" onClick={adicionar}>Adicionar</Button>
        </div>
        {erro && <div style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--critical-500)', fontWeight: 600 }}>{erro}</div>}
        {aviso && <div style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--success-700)', fontWeight: 600 }}>{aviso}</div>}
      </PanelCard>

      <PanelCard>
        <PanelTitle title="Colaboradores"
          sub={(modo === 'api'
            ? (campanha ? 'Campanha: ' + campanha.nome + ' · ' : 'Sem campanha ativa (criada no 1º envio) · ')
            : 'Modo demonstração — dados locais · ')
            + lista.length + ' cadastrado(s) · ' + respondidos + ' respondido(s)'} />
        {lista.length === 0 ? (
          <EmptyState icon="users" title="Nenhum colaborador cadastrado" sub="Cadastre acima para enviar o questionário por e-mail ou WhatsApp." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {lista.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px', borderTop: '1px solid var(--gray-100)' }}>
                <div style={{ flex: 1.4, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {[c.email, c.fone, c.setor].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <StatusBadge s={c.status} />
                {c.fone ? <Button size="sm" variant="leaf" iconLeft="message-circle" onClick={() => viaWhats(c)}>WhatsApp</Button> : null}
                {c.email ? <Button size="sm" variant="secondary" iconLeft="mail" onClick={() => viaEmail(c)}>E-mail</Button> : null}
                <Button size="sm" variant="ghost" iconLeft="copy" onClick={() => copiarLink(c)}>Link</Button>
                <Button size="sm" variant="ghost" iconLeft="trash-2" style={{ color: 'var(--critical-500)' }} onClick={() => remover(c)} />
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard>
        <PanelTitle title="Como funciona o envio" />
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.7 }}>
          Cada colaborador recebe um <b>link único</b> (token de convite) que permite acompanhar quem já respondeu —
          sem nunca vincular a resposta à pessoa: os relatórios são sempre agregados (mínimo 5 respondentes por recorte).
          Nesta fase de teste, os botões abrem o WhatsApp/e-mail com a mensagem pronta; com a integração AWS,
          o disparo passa a ser automático (Amazon SES) e o status "Respondido" é atualizado em tempo real.
          Questionário Moorah v1.0 — 74 itens · núcleo COPSOQ II-Br + módulos Moorah · 15 a 20 minutos.
        </div>
      </PanelCard>
    </div>
  );
}

/* ---------- Cobrança (admin: controle total · RH/técnico: pagar faturas) ---------- */
function CobrancaScreen() {
  const perfil = (window.MORAH_USER || {}).perfil || 'rh';
  const admin = perfil === 'admin';
  const KEY = chaveEmpresa('morah-faturas');
  const hoje = new Date();
  const seedLocal = () => [
    { id: 'f1', descricao: 'Mensalidade Moorah — ' + (hoje.getMonth()) + '/' + hoje.getFullYear(), valor: 990, vencimento: new Date(hoje.getFullYear(), hoje.getMonth() - 1, 10).toISOString().slice(0, 10), status: 'paga', link_pagamento: '' },
    { id: 'f2', descricao: 'Mensalidade Moorah — ' + (hoje.getMonth() + 1) + '/' + hoje.getFullYear(), valor: 990, vencimento: new Date(hoje.getFullYear(), hoje.getMonth(), 10).toISOString().slice(0, 10), status: 'pendente', link_pagamento: 'https://www.asaas.com/c/exemplo-demo' },
  ];
  const lerLocal = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || seedLocal(); } catch (e) { return seedLocal(); } };
  const [modo, setModo] = React.useState('local');
  const [lista, setLista] = React.useState(lerLocal);
  const [empresas, setEmpresas] = React.useState([]);
  const [form, setForm] = React.useState({ empresa: '—', descricao: '', valor: '', vencimento: '', link: '' });
  const [erro, setErro] = React.useState('');

  const carregar = async () => { setLista(await window.MorahApi.chamar('GET', '/faturas')); };
  React.useEffect(() => {
    (async () => {
      try {
        if (!window.MorahApi || !window.MorahAuth) return;
        if (!(await window.MorahAuth.idToken())) return;
        await carregar(); setModo('api');
        if (admin) { try { setEmpresas(await window.MorahApi.chamar('GET', '/empresas')); } catch (e) {} }
      } catch (e) {}
    })();
  }, []);
  const salvarLocal = (l) => { setLista(l); try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} };

  const criar = async () => {
    if (!form.descricao.trim() || !form.valor) { setErro('Descrição e valor são obrigatórios.'); return; }
    setErro('');
    if (modo === 'api') {
      const emp = empresas.find((e) => e.razao_social === form.empresa);
      if (!emp) { setErro('Selecione a empresa da fatura.'); return; }
      try {
        const resp = await window.MorahApi.chamar('POST', '/faturas', {
          empresa_id: emp.id, descricao: form.descricao.trim(), valor: Number(form.valor),
          vencimento: form.vencimento || null, link_pagamento: form.link.trim() || null,
        });
        await carregar();
        setForm({ empresa: '—', descricao: '', valor: '', vencimento: '', link: '' });
        // Backend gera a cobrança no Asaas quando configurado; se não gerou, mostra o porquê.
        if (resp && resp.aviso) setErro(resp.aviso);
      } catch (e) { setErro(e.message); }
      return;
    }
    salvarLocal([{ id: 'f' + Date.now(), descricao: form.descricao.trim(), valor: Number(form.valor), vencimento: form.vencimento, status: 'pendente', link_pagamento: form.link.trim() }, ...lista]);
    setForm({ empresa: '—', descricao: '', valor: '', vencimento: '', link: '' });
  };

  const mudarStatus = async (f, status) => {
    if (modo === 'api') {
      try { await window.MorahApi.chamar('PATCH', '/faturas/' + f.id, { status }); await carregar(); }
      catch (e) { setErro(e.message); }
      return;
    }
    salvarLocal(lista.map((x) => (x.id === f.id ? { ...x, status } : x)));
  };

  const moeda = (v) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fmtData = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '—');
  const vencida = (f) => f.status === 'pendente' && f.vencimento && new Date(f.vencimento) < new Date(hoje.toDateString());
  const pendentes = lista.filter((f) => f.status === 'pendente');
  const totalPendente = pendentes.reduce((a, f) => a + Number(f.valor || 0), 0);

  const inputStyle = {
    fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--text-strong)',
    background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-control)', padding: '10px 12px', outline: 'none', width: '100%',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
        <StatCard label="Faturas pendentes" value={String(pendentes.length)} icon="file-clock" tone={pendentes.length ? 'amber' : 'green'} />
        <StatCard label="Valor em aberto" value={moeda(totalPendente)} icon="credit-card" tone={totalPendente ? 'amber' : 'green'} />
        <StatCard label="Total de faturas" value={String(lista.length)} icon="receipt" tone="berry" />
      </div>

      {admin && (
        <PanelCard>
          <PanelTitle title="Nova fatura" sub={modo === 'api' ? 'Cobrança manual — com o Asaas conectado, boletos e links serão gerados automaticamente' : 'Modo demonstração — dados locais'} />
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 0.8fr 0.9fr 1.4fr auto', gap: 10 }}>
            <Select value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })}
              options={['—', ...(modo === 'api' ? empresas.map((x) => x.razao_social) : window.MORAH.companies.map((c) => c.name))]} />
            <Input placeholder="Descrição — ex.: Mensalidade Agosto/2026" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            <Input placeholder="Valor (R$)" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value.replace(/[^\d.,]/g, '').replace(',', '.') })} />
            <input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} style={inputStyle} title="Vencimento" />
            <Input placeholder="Link de pagamento (opcional)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
            <Button variant="primary" iconLeft="plus" onClick={criar}>Emitir</Button>
          </div>
          {erro && <div style={{ marginTop: 8, fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--critical-500)', fontWeight: 600 }}>{erro}</div>}
        </PanelCard>
      )}

      <PanelCard>
        <PanelTitle title="Faturas" sub={admin ? 'Todas as cobranças emitidas' : 'Suas faturas — pague pelo link quando disponível'} />
        {!admin && erro && <div style={{ marginBottom: 8, fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--critical-500)', fontWeight: 600 }}>{erro}</div>}
        {lista.length === 0 ? (
          <EmptyState icon="credit-card" title="Nenhuma fatura" sub={admin ? 'Emita a primeira cobrança acima.' : 'Quando houver uma cobrança, ela aparecerá aqui com o link de pagamento.'} />
        ) : (
          lista.map((f) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px', borderTop: '1px solid var(--gray-100)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1.6, minWidth: 220 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-strong)' }}>{f.descricao}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: vencida(f) ? 'var(--critical-500)' : 'var(--text-muted)', marginTop: 3 }}>
                  {(f.empresa_nome ? f.empresa_nome + ' · ' : '')}venc. {fmtData(f.vencimento)}{vencida(f) ? ' (VENCIDA)' : ''}
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-strong)' }}>{moeda(f.valor)}</span>
              {f.status === 'paga' ? <Badge tone="success" solid>Paga</Badge>
                : f.status === 'cancelada' ? <Badge tone="neutral">Cancelada</Badge>
                : vencida(f) ? <Badge tone="critical" solid>Vencida</Badge>
                : <Badge tone="warning" solid>Pendente</Badge>}
              {f.status === 'pendente' && f.link_pagamento &&
                <Button size="sm" variant="leaf" iconLeft="external-link" onClick={() => window.open(f.link_pagamento, '_blank')}>Pagar</Button>}
              {f.status === 'pendente' && !f.link_pagamento && !admin &&
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)', color: 'var(--text-faint)' }}>aguardando boleto</span>}
              {admin && f.status === 'pendente' && <Button size="sm" variant="secondary" iconLeft="check" onClick={() => mudarStatus(f, 'paga')}>Marcar paga</Button>}
              {admin && f.status === 'pendente' && <Button size="sm" variant="ghost" iconLeft="x" onClick={() => mudarStatus(f, 'cancelada')}>Cancelar</Button>}
              {admin && f.status !== 'pendente' && <Button size="sm" variant="ghost" iconLeft="rotate-ccw" onClick={() => mudarStatus(f, 'pendente')}>Reabrir</Button>}
            </div>
          ))
        )}
      </PanelCard>
    </div>
  );
}

/* ---------- Central da Empresa (drill-down: admin/técnico entram aqui) ---------- */
function EmpresaDetalheScreen() {
  const ir = (id) => { if (window.MORAH_NAV) window.MORAH_NAV(id); };
  const contar = (chave) => { try { return (JSON.parse(localStorage.getItem(chaveEmpresa(chave)) || '[]')).length; } catch (e) { return 0; } };
  const [kpis, setKpis] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      try {
        if (!window.MorahApi || !window.MorahAuth || !(await window.MorahAuth.idToken())) throw new Error('demo');
        const [cols, cps, dens] = await Promise.all([
          window.MorahApi.chamar('GET', '/colaboradores').catch(() => []),
          window.MorahApi.chamar('GET', '/campanhas').catch(() => []),
          window.MorahApi.chamar('GET', '/denuncias').catch(() => []),
        ]);
        const conv = cps.reduce((a, c) => a + (Number(c.convites) || 0), 0);
        const resp = cps.reduce((a, c) => a + (Number(c.respondidos) || 0), 0);
        setKpis({ colaboradores: cols.length, campanhas: cps.length, adesao: conv ? Math.round((resp / conv) * 100) + '%' : '—', denuncias: dens.filter((d) => d.status !== 'concluida').length });
      } catch (e) {
        setKpis({
          colaboradores: contar('morah-colaboradores'),
          campanhas: contar('morah-campanhas'),
          adesao: '—',
          denuncias: 0,
        });
      }
    })();
  }, []);

  const SECOES = [
    { id: 'link',          icon: 'users',          titulo: 'Colaboradores',      desc: 'Cadastro e envio do questionário' },
    { id: 'campanhas',     icon: 'calendar-range', titulo: 'Campanhas',          desc: 'Ciclos de avaliação' },
    { id: 'relatorios',    icon: 'bar-chart-3',    titulo: 'Relatórios',         desc: 'Semáforo de riscos e laudo' },
    { id: 'plano',         icon: 'list-checks',    titulo: 'Plano de Ação',      desc: 'Medidas, prazos e responsáveis' },
    { id: 'denuncias',     icon: 'shield',         titulo: 'Denúncias',          desc: 'Apuração dos relatos do canal' },
    { id: 'comparar',      icon: 'arrow-left-right', titulo: 'Comparar Ciclos',  desc: 'Evolução entre campanhas' },
    { id: 'unidades',      icon: 'map-pin',        titulo: 'Unidades',           desc: 'Filiais e locais' },
    { id: 'setor',         icon: 'layers',         titulo: 'Setores',            desc: 'Estrutura de setores' },
    { id: 'departamentos', icon: 'network',        titulo: 'Departamentos',      desc: 'Organização interna' },
    { id: 'cargos',        icon: 'briefcase',      titulo: 'Cargos',             desc: 'Funções e posições' },
    { id: 'overview',      icon: 'layout-grid',    titulo: 'Visão Geral',        desc: 'Indicadores da empresa' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
        <StatCard label="Colaboradores" value={String(kpis ? kpis.colaboradores : '…')} icon="users" tone="berry" />
        <StatCard label="Campanhas" value={String(kpis ? kpis.campanhas : '…')} icon="calendar-range" tone="blue" />
        <StatCard label="Adesão" value={String(kpis ? kpis.adesao : '…')} icon="message-circle" tone="green" />
        <StatCard label="Denúncias em aberto" value={String(kpis ? kpis.denuncias : '…')} icon="shield" tone={kpis && kpis.denuncias ? 'amber' : 'green'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
        {SECOES.map((s) => (
          <Card key={s.id} interactive padding="var(--space-5)" onClick={() => ir(s.id)} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--berry-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--berry-600)', flexShrink: 0 }}>
                <Icon name={s.icon} size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-strong)' }}>{s.titulo}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
              </div>
              <Icon name="chevron-right" size={16} color="var(--text-faint)" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

window.Screens = {
  overview: OverviewScreen,
  empresas: EmpresasScreen,
  relatorios: RelatoriosScreen,
  comparar: CompararScreen,
  modelos: ModelosScreen,
  termos: TermosScreen,
  unidades: () => <EstruturaScreen recurso="unidades" rotuloSing="unidade" rotuloPl="Unidades" exemplo="Matriz — São Paulo" />,
  setor: () => <EstruturaScreen recurso="setores" rotuloSing="setor" rotuloPl="Setores" exemplo="Produção" />,
  departamentos: () => <EstruturaScreen recurso="departamentos" rotuloSing="departamento" rotuloPl="Departamentos" exemplo="Recursos Humanos" />,
  cargos: () => <EstruturaScreen recurso="cargos" rotuloSing="cargo" rotuloPl="Cargos" exemplo="Operador de Máquinas" />,
  campanhas: CampanhasScreen,
  link: EnvioScreen,
  pendentes: PendentesScreen,
  denuncia: DenunciaScreen,
  denuncias: DenunciasGestaoScreen,
  plano: PlanoScreen,
  cobranca: CobrancaScreen,
  empresa: EmpresaDetalheScreen,
};
