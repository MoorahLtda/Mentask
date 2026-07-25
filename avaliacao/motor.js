// Motor de Resultados Moorah v1.0 — Avaliação Psicossocial NR-1
// Consome payloads do questionário (window.MORAH_QUESTIONARIO / avaliacao/index.html)
// e produz: semáforo por dimensão COPSOQ (tercis), indicadores Moorah, exposições
// e bandeiras de alerta. Lógica pura — a mesma que a Lambda de agregação usará na AWS.
//
// Metodologia:
// - Núcleo COPSOQ II-Br: soma por dimensão por respondente → média entre respondentes →
//   classificação por tercis da faixa teórica, respeitando a direção do risco.
// - Indicadores Moorah: índice de risco 0–4 (itens de proteção invertidos: 4−v) →
//   cortes fixos 1,33 / 2,67.
// - Comportamentos ofensivos: não somam — % de expostos + frequência + fontes.
// - k-anonimato: recortes por setor só são considerados suficientes com n ≥ 5.

window.MorahMotor = (function () {
  'use strict';

  const K_ANONIMATO = 5;

  // ---------- Configuração das dimensões ----------
  const NUCLEO = [
    { id: 'demandas',    nome: 'Demandas no trabalho',            dir: 'risco',    itens: ['1A', '1B', '2A', '2B', '3A', '3B'], max: 24 },
    { id: 'influencia',  nome: 'Influência e desenvolvimento',    dir: 'protecao', itens: ['4A', '4B', '5A', '5B'],             max: 16 },
    { id: 'significado', nome: 'Significado e comprometimento',   dir: 'protecao', itens: ['6A', '6B', '7A', '7B'],             max: 16 },
    { id: 'relacoes',    nome: 'Relações interpessoais',          dir: 'protecao', itens: ['8A', '8B', '9A', '9B', '10A', '10B'], max: 24 },
    { id: 'lideranca',   nome: 'Liderança',                       dir: 'protecao', itens: ['11A', '11B', '12A', '12B'],         max: 16 },
    { id: 'satisfacao',  nome: 'Satisfação no trabalho',          dir: 'protecao', itens: ['13'],                               max: 3 },
    { id: 'conflitoTF',  nome: 'Conflito trabalho-família',       dir: 'risco',    itens: ['14A', '14B'],                       max: 6 },
    { id: 'valores',     nome: 'Valores no local de trabalho',    dir: 'protecao', itens: ['15A', '15B', '16A', '16B'],         max: 16 },
    { id: 'saudeGeral',  nome: 'Saúde geral',                     dir: 'protecao', itens: ['17'],                               max: 4 },
    { id: 'burnout',     nome: 'Burnout e estresse',              dir: 'risco',    itens: ['18A', '18B', '19A', '19B'],         max: 16 },
  ];

  const OFENSIVOS = [
    { id: '20', nome: 'Atenção sexual indesejada' },
    { id: '21', nome: 'Ameaças de violência' },
    { id: '22', nome: 'Violência física' },
    { id: '23', nome: 'Bullying' },
    { id: 'C1', nome: 'Humilhação ou constrangimento público' },
    { id: 'C2', nome: 'Hostilidade ou perseguição por superior' },
    { id: 'C3', nome: 'Discriminação' },
    { id: 'C4', nome: 'Testemunhou assédio ou violência' },
  ];

  // p: 1 = item de proteção (inverte: risco = 4 − v)
  const MOORAH = [
    { id: 'apoio',          nome: 'Apoio e comunidade',                 itens: [{ id: 'B1', p: 1 }, { id: 'B2', p: 1 }, { id: 'B3', p: 1 }] },
    { id: 'reconhecimento', nome: 'Reconhecimento e desenvolvimento',   itens: [{ id: 'B4', p: 1 }, { id: 'B5', p: 1 }, { id: 'B6', p: 1 }] },
    { id: 'papeis',         nome: 'Clareza e conflito de papéis',       itens: [{ id: 'B7' }, { id: 'B8' }] },
    { id: 'carga',          nome: 'Carga, ritmo e jornada',             itens: [{ id: 'B9' }, { id: 'B10', p: 1 }, { id: 'B11' }, { id: 'B12' }, { id: 'B13', p: 1 }] },
    { id: 'seguranca',      nome: 'Segurança e mudanças',               itens: [{ id: 'B14' }, { id: 'B15' }, { id: 'B16', p: 1 }] },
    { id: 'remoto',         nome: 'Trabalho remoto ou híbrido',         itens: [{ id: 'B17', p: 1 }] },
    { id: 'canal',          nome: 'Confiança no canal de escuta',       itens: [{ id: 'C6', p: 1 }] },
    { id: 'sinais',         nome: 'Sinais de alerta de saúde',          itens: [{ id: 'D1' }, { id: 'D2' }, { id: 'D3' }] },
  ];

  // ---------- Helpers ----------
  function valor(av, itemId) {
    const r = av.respostas && av.respostas[itemId];
    return r && typeof r.v === 'number' ? r.v : null;
  }

  function nivelNucleo(media, max, dir) {
    const t1 = max / 3, t2 = (2 * max) / 3;
    if (dir === 'risco') return media > t2 ? 'critico' : media > t1 ? 'atencao' : 'adequado';
    return media < t1 ? 'critico' : media < t2 ? 'atencao' : 'adequado';
  }

  function nivelMoorah(indice) {
    // Cortes documentados (tercis da escala 0–4): atenção >=1,33, crítico >=2,67 —
    // coerente com a bandeira B12 (>=2,67). Antes era >2,66 (inconsistente). Auditoria B1.
    return indice >= 2.67 ? 'critico' : indice >= 1.33 ? 'atencao' : 'adequado';
  }

  function pct(parte, todo) { return todo ? Math.round((parte / todo) * 100) : 0; }

  // ---------- Cálculo de um conjunto de respostas ----------
  // incluirVozes: só o resultado GLOBAL leva as citações abertas (F1/F2). Em
  // recortes por setor pequeno uma citação verbatim identifica quem escreveu. (C6)
  function resultadoDe(avs, incluirVozes) {
    const n = avs.length;

    // Núcleo COPSOQ: soma por respondente → média
    const nucleo = NUCLEO.map(function (d) {
      const somas = avs.map(function (av) {
        let s = 0, ok = true;
        d.itens.forEach(function (it) {
          const v = valor(av, it);
          if (v === null) ok = false; else s += v;
        });
        return ok ? s : null;
      }).filter(function (s) { return s !== null; });
      const media = somas.length ? somas.reduce(function (a, b) { return a + b; }, 0) / somas.length : null;
      return {
        id: d.id, nome: d.nome, dir: d.dir, max: d.max,
        media: media === null ? null : Math.round(media * 10) / 10,
        nivel: media === null ? null : nivelNucleo(media, d.max, d.dir),
        respondentes: somas.length,
      };
    });

    // Indicadores Moorah: índice de risco 0–4
    const moorah = MOORAH.map(function (t) {
      const indices = avs.map(function (av) {
        let soma = 0, cont = 0;
        t.itens.forEach(function (it) {
          const v = valor(av, it.id);
          if (v === null) return;
          soma += it.p ? (4 - v) : v;
          cont++;
        });
        return cont ? soma / cont : null;
      }).filter(function (x) { return x !== null; });
      const indice = indices.length ? indices.reduce(function (a, b) { return a + b; }, 0) / indices.length : null;
      return {
        id: t.id, nome: t.nome,
        indice: indice === null ? null : Math.round(indice * 100) / 100,
        nivel: indice === null ? null : nivelMoorah(indice),
        respondentes: indices.length,
      };
    });

    // Comportamentos ofensivos: exposição
    const ofensivos = OFENSIVOS.map(function (o) {
      let expostos = 0, recorrentes = 0;
      const fontes = {};
      avs.forEach(function (av) {
        const v = valor(av, o.id);
        if (v !== null && v > 0) {
          expostos++;
          if (v >= 2) recorrentes++;
          const fs = (av.fontesExposicao && av.fontesExposicao[o.id]) || [];
          fs.forEach(function (f) { fontes[f] = (fontes[f] || 0) + 1; });
        }
      });
      return { id: o.id, nome: o.nome, expostos: expostos, pct: pct(expostos, n), recorrentes: recorrentes, fontes: fontes };
    });

    // Extras categóricos
    function pctResposta(itemId, textos) {
      let conta = 0, base = 0;
      avs.forEach(function (av) {
        const r = av.respostas && av.respostas[itemId];
        if (!r) return;
        // "Prefiro não responder" (e v:null) = não-resposta: fora do denominador,
        // senão dilui a bandeira (ex.: afastamento D5 subestimado). Auditoria A7.
        if (r.t === 'Prefiro não responder' || r.v === null || r.v === undefined) return;
        base++;
        if (textos.indexOf(r.t) >= 0) conta++;
      });
      return { pct: pct(conta, base), n: conta, base: base };
    }
    const extras = {
      canalDesconhecido: pctResposta('C5', ['Não', 'Não tenho certeza']),
      pensouSair: pctResposta('D4', ['Sim']),
      afastamento: pctResposta('D5', ['Sim']),
    };

    // Vozes (campos abertos) — só no resultado GLOBAL (k-anonimato, C6).
    // String() protege contra payload não-string (paridade com motor-core, C6/B9).
    const vozes = [];
    if (incluirVozes) {
      avs.forEach(function (av) {
        const c = av.camposAbertos || {};
        if (c.F1 && String(c.F1).trim()) vozes.push({ pergunta: 'F1', texto: String(c.F1).trim() });
        if (c.F2 && String(c.F2).trim()) vozes.push({ pergunta: 'F2', texto: String(c.F2).trim() });
      });
    }

    // ---------- Bandeiras de alerta ----------
    const bandeiras = [];
    ofensivos.forEach(function (o) {
      if (o.recorrentes > 0) {
        bandeiras.push({
          nivel: 'critico',
          titulo: 'Exposição recorrente (≥ mensal): ' + o.nome,
          detalhe: o.recorrentes + ' relato(s) com frequência mensal ou maior' + (Object.keys(o.fontes).length ? ' · fontes: ' + Object.keys(o.fontes).join(', ') : ''),
          acao: 'Apuração via canal de denúncias + medida de proteção (Lei 14.457/22)',
        });
      } else if (o.expostos > 0) {
        bandeiras.push({
          nivel: 'atencao',
          titulo: 'Exposição relatada: ' + o.nome,
          detalhe: o.expostos + ' relato(s) no período de 12 meses (' + o.pct + '% dos respondentes)',
          acao: 'Monitorar e reforçar prevenção; orientar lideranças',
        });
      }
    });
    if (extras.canalDesconhecido.base > 0 && extras.canalDesconhecido.pct >= 25) {
      bandeiras.push({
        nivel: 'atencao',
        titulo: 'Canal de denúncias pouco conhecido',
        detalhe: extras.canalDesconhecido.pct + '% não sabem onde/como relatar assédio ou violência',
        acao: 'Campanha de divulgação do canal + treinamento com a CIPA',
      });
    }
    const canalConf = moorah.find(function (m) { return m.id === 'canal'; });
    if (canalConf && canalConf.indice !== null && canalConf.indice > 2.0) {
      bandeiras.push({
        nivel: 'atencao',
        titulo: 'Baixa confiança no canal de escuta',
        detalhe: 'Índice de desconfiança ' + canalConf.indice.toFixed(2) + ' (escala 0–4)',
        acao: 'Revisar governança do canal (independência, sigilo, retorno ao denunciante)',
      });
    }
    if (extras.afastamento.base > 0 && extras.afastamento.pct >= 10) {
      bandeiras.push({
        nivel: 'critico',
        titulo: 'Afastamentos por saúde emocional',
        detalhe: extras.afastamento.pct + '% relatam afastamento nos últimos 12 meses',
        acao: 'Investigação de nexo + integração com o PCMSO (NR-7)',
      });
    }
    // Desconexão (B12): média bruta do item
    (function () {
      const vs = avs.map(function (av) { return valor(av, 'B12'); }).filter(function (v) { return v !== null; });
      if (vs.length) {
        const m = vs.reduce(function (a, b) { return a + b; }, 0) / vs.length;
        if (m >= 2.67) {
          bandeiras.push({
            nivel: 'atencao',
            titulo: 'Contato frequente fora do horário de trabalho',
            detalhe: 'Média ' + m.toFixed(2) + ' (escala 0–4) no indicador de desconexão',
            acao: 'Política de desconexão + revisão de escalas e jornada',
          });
        }
      }
    })();

    const criticas = nucleo.filter(function (d) { return d.nivel === 'critico'; }).length +
                     moorah.filter(function (m) { return m.nivel === 'critico'; }).length;

    return { n: n, nucleo: nucleo, moorah: moorah, ofensivos: ofensivos, extras: extras, vozes: vozes, bandeiras: bandeiras, dimensoesCriticas: criticas };
  }

  // ---------- Agregação com recortes por setor ----------
  function calcular(avaliacoes) {
    const avs = (avaliacoes || []).filter(function (a) { return a && a.respostas; });
    const porSetor = {};
    avs.forEach(function (a) {
      const chave = (a.setor || 'Não informado').trim() || 'Não informado';
      const norm = chave.toLowerCase();
      if (!porSetor[norm]) porSetor[norm] = { setor: chave, avs: [] };
      porSetor[norm].avs.push(a);
    });
    const recortes = Object.keys(porSetor).map(function (k) {
      const g = porSetor[k];
      const suficiente = g.avs.length >= K_ANONIMATO;
      return {
        // n só é exposto em recortes suficientes: revelar 'n=2' de um setor
        // pequeno já é informação identificante. Auditoria C6.
        setor: g.setor, n: suficiente ? g.avs.length : null, suficiente: suficiente,
        resultado: suficiente ? resultadoDe(g.avs, false) : null, // k-anonimato: sem dados abaixo de 5
      };
    }).sort(function (a, b) { return (b.n || 0) - (a.n || 0); });

    return {
      n: avs.length,
      kAnonimato: K_ANONIMATO,
      amostraSuficiente: avs.length >= K_ANONIMATO,
      global: avs.length ? resultadoDe(avs, true) : null,
      recortes: recortes,
    };
  }

  // ---------- Gerador de dados de demonstração ----------
  // Cria respostas sintéticas plausíveis com perfis distintos por setor,
  // para demonstrar o semáforo, os recortes e as bandeiras. Marca demo: true.
  function gerarDemo() {
    const Q = window.MORAH_QUESTIONARIO;
    if (!Q) return [];
    // perfil: 0 = saudável, 1 = intermediário, 2 = crítico
    const setores = [
      { nome: 'Administrativo', n: 6, perfil: 0 },
      { nome: 'Comercial',      n: 6, perfil: 1 },
      { nome: 'Produção',       n: 8, perfil: 2 },
      { nome: 'Logística',      n: 5, perfil: 1 },
    ];
    function sorteia(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function respostaItem(item, perfil) {
      const esc = Q.escalas[item.escala];
      if (!esc) return null;
      // Índices "ruins" ficam no começo (Sempre/Em grande parte) p/ escalas de risco;
      // decide pela direção aproximada: usa peso do perfil p/ puxar a resposta.
      const nOp = esc.length;
      let ix;
      const r = Math.random();
      if (perfil === 2)      ix = r < 0.55 ? 0 : r < 0.85 ? 1 : 2;             // tende ao extremo "alto"
      else if (perfil === 1) ix = r < 0.25 ? 1 : r < 0.75 ? 2 : 3;             // meio
      else                   ix = r < 0.6 ? nOp - 1 : r < 0.9 ? nOp - 2 : 2;   // tende ao extremo "baixo"
      ix = Math.max(0, Math.min(nOp - 1, ix));
      return esc[ix];
    }
    const out = [];
    setores.forEach(function (s) {
      for (let i = 0; i < s.n; i++) {
        const respostas = {}, fontes = {};
        Q.secoes.forEach(function (sec) {
          sec.itens.forEach(function (item) {
            if (item.tipo === 'texto') return;
            // Direção invertida: p/ dimensões de proteção, perfil crítico deve marcar baixo
            let perfilEfetivo = s.perfil;
            const dirItem = item.dir || sec.direcao;
            if (dirItem === 'protecao') perfilEfetivo = 2 - s.perfil;
            // Exposição (EXPO): maioria "Não", perfil crítico com alguns relatos
            if (item.escala === 'EXPO') {
              const expoe = s.perfil === 2 ? Math.random() < 0.25 : s.perfil === 1 ? Math.random() < 0.08 : Math.random() < 0.02;
              const esc = Q.escalas.EXPO;
              const op = expoe ? esc[Math.random() < 0.3 ? 2 : 3] : esc[4];
              respostas[item.id] = { v: op.v, t: op.t };
              if (op.v > 0 && item.followup) fontes[item.id] = [sorteia(window.MORAH_QUESTIONARIO.fontesExposicao)];
              return;
            }
            const op = respostaItem(item, perfilEfetivo);
            if (op) respostas[item.id] = { v: op.v, t: op.t };
          });
        });
        out.push({
          versao: Q.versao, demo: true,
          enviadoEm: new Date(Date.now() - Math.floor(Math.random() * 5) * 86400000).toISOString(),
          duracaoSeg: 600 + Math.floor(Math.random() * 600),
          convite: null, setor: s.nome,
          respostas: respostas, fontesExposicao: fontes, camposAbertos: {},
        });
      }
    });
    // Duas vozes de exemplo
    out[0].camposAbertos = { F1: 'O volume de trabalho aumentou muito e o prazo continua o mesmo.', F2: 'Mais clareza nas metas e pausas respeitadas.' };
    out[1].camposAbertos = { F1: 'Mensagens de trabalho fora do horário, inclusive no fim de semana.' };
    return out;
  }

  return {
    K_ANONIMATO: K_ANONIMATO,
    NUCLEO: NUCLEO,
    MOORAH: MOORAH,
    OFENSIVOS: OFENSIVOS,
    calcular: calcular,
    resultadoDe: resultadoDe,
    gerarDemo: gerarDemo,
  };
})();
