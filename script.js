/* =====================================================================
   Mini BD — Lógica da aplicação
   Atividade Extensionista II — UNINTER
   Autor: JUNIOR BORTOLOTTI — RU 4187385

   Estrutura do "banco de dados" mantido na memória do navegador:
     db = {
       tableName: "jogos",                       // nome da tabela
       fields:    [{name, type}, ...],           // colunas (campos)
       records:   [{id, ...valores}, ...]        // linhas (registros)
     }
   A persistência é feita no localStorage, que equivale a "salvar o arquivo".
   ===================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. ESTADO E CONSTANTES
     ------------------------------------------------------------------ */
  const CHAVE_ARMAZENAMENTO = 'minibd_oficina_v1';

  let db = {
    tableName: '',
    fields: [],
    records: []
  };

  /* Atalhos para selecionar elementos e criar elementos */
  const $ = (seletor) => document.querySelector(seletor);

  function criar(tag, classe) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    return elemento;
  }

  /* ------------------------------------------------------------------
     2. PERSISTÊNCIA (localStorage)
     ------------------------------------------------------------------ */
  function salvar() {
    try {
      localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(db));
    } catch (erro) {
      console.warn('Não foi possível salvar os dados:', erro);
    }
  }

  function carregar() {
    try {
      const bruto = localStorage.getItem(CHAVE_ARMAZENAMENTO);
      if (!bruto) return;

      const dados = JSON.parse(bruto);
      if (dados && dados.tableName &&
          Array.isArray(dados.fields) && Array.isArray(dados.records)) {
        db = dados;
      }
    } catch (erro) {
      console.warn('Não foi possível carregar os dados salvos:', erro);
    }
  }

  /* ------------------------------------------------------------------
     3. ETAPA 1 — CRIAÇÃO DA TABELA
     ------------------------------------------------------------------ */

  /* Cria uma linha de definição de campo: [nome] [tipo] [remover] */
  function criarLinhaCampo(nome, tipo) {
    nome = nome || '';
    tipo = tipo || 'texto';

    const linha = criar('div', 'linha campo-linha');

    const entradaNome = criar('input');
    entradaNome.type = 'text';
    entradaNome.className = 'campo-nome';
    entradaNome.placeholder = 'nome do campo (ex.: titulo)';
    entradaNome.value = nome;

    const selecaoTipo = criar('select');
    selecaoTipo.className = 'campo-tipo';
    ['texto', 'numero', 'data'].forEach(function (t) {
      const opcao = criar('option');
      opcao.value = t;
      opcao.textContent = t;
      selecaoTipo.appendChild(opcao);
    });
    selecaoTipo.value = tipo;

    const botaoRemover = criar('button', 'danger mini');
    botaoRemover.type = 'button';
    botaoRemover.textContent = 'remover';
    botaoRemover.addEventListener('click', function () {
      linha.remove();
    });

    linha.appendChild(entradaNome);
    linha.appendChild(selecaoTipo);
    linha.appendChild(botaoRemover);
    return linha;
  }

  /* Valida os dados do formulário e efetivamente cria a tabela */
  function criarTabela() {
    const nomeTabela = $('#nomeTabela').value.trim();
    const linhas = document.querySelectorAll('#listaCampos .campo-linha');
    const campos = [];

    linhas.forEach(function (linha) {
      const nome = linha.querySelector('.campo-nome').value.trim();
      const tipo = linha.querySelector('.campo-tipo').value;
      if (nome) campos.push({ name: nome, type: tipo });
    });

    /* Validações didáticas: cada mensagem ensina uma regra de banco de dados */
    if (!nomeTabela) {
      alert('Dê um nome para a tabela. (É o "assunto" que ela guarda.)');
      return;
    }
    if (campos.length === 0) {
      alert('Adicione pelo menos um campo. (Campo = coluna da tabela.)');
      return;
    }

    const nomesMinusculos = campos.map(function (c) { return c.name.toLowerCase(); });

    if (nomesMinusculos.indexOf('id') !== -1) {
      alert('O campo "id" é criado automaticamente como chave primária. Use outro nome.');
      return;
    }
    if (new Set(nomesMinusculos).size !== nomesMinusculos.length) {
      alert('Não repita nomes de campos: cada coluna precisa de um nome único.');
      return;
    }

    db = { tableName: nomeTabela, fields: campos, records: [] };
    salvar();
    renderizarTudo();
  }

  /* Carrega uma tabela de exemplo já preenchida (útil para demonstração) */
  function carregarExemplo() {
    db = {
      tableName: 'jogos',
      fields: [
        { name: 'titulo', type: 'texto'  },
        { name: 'genero', type: 'texto'  },
        { name: 'ano',    type: 'numero' },
        { name: 'nota',   type: 'numero' }
      ],
      records: [
        { id: 1, titulo: 'Minecraft',      genero: 'Sandbox',       ano: 2011, nota: 9  },
        { id: 2, titulo: 'Valorant',       genero: 'FPS',           ano: 2020, nota: 8  },
        { id: 3, titulo: 'Stardew Valley', genero: 'Simulação',     ano: 2016, nota: 10 },
        { id: 4, titulo: 'Free Fire',      genero: 'Battle Royale', ano: 2017, nota: 7  },
        { id: 5, titulo: 'Celeste',        genero: 'Plataforma',    ano: 2018, nota: 9  }
      ]
    };
    salvar();
    renderizarTudo();
  }

  function apagarTabela() {
    const confirmou = confirm(
      'Isso vai apagar a tabela e todos os registros. Deseja continuar?'
    );
    if (!confirmou) return;

    db = { tableName: '', fields: [], records: [] };
    salvar();
    renderizarTudo();
  }

  /* ------------------------------------------------------------------
     4. ETAPA 3 — INSERÇÃO DE REGISTROS
     ------------------------------------------------------------------ */

  /* Monta o formulário de inserção com um input para cada campo */
  function renderizarFormularioRegistro() {
    const formulario = $('#formRegistro');
    formulario.innerHTML = '';

    db.fields.forEach(function (campo) {
      const grupo = criar('div');

      const rotulo = criar('label');
      rotulo.textContent = campo.name;

      const entrada = criar('input');
      entrada.type = campo.type === 'numero'
        ? 'number'
        : (campo.type === 'data' ? 'date' : 'text');
      entrada.className = 'input-registro';
      entrada.dataset.campo = campo.name;
      entrada.dataset.tipo = campo.type;

      grupo.appendChild(rotulo);
      grupo.appendChild(entrada);
      formulario.appendChild(grupo);
    });
  }

  /* Lê o formulário, valida e insere um novo registro (nova linha) */
  function inserirRegistro() {
    const entradas = document.querySelectorAll('.input-registro');
    const registro = {};
    let campoFaltando = null;

    entradas.forEach(function (entrada) {
      const nomeCampo = entrada.dataset.campo;
      const tipo = entrada.dataset.tipo;
      const valor = entrada.value.trim();

      if (valor === '' && !campoFaltando) campoFaltando = nomeCampo;

      registro[nomeCampo] = (tipo === 'numero')
        ? (valor === '' ? '' : Number(valor))
        : valor;
    });

    if (campoFaltando) {
      alert('Preencha o campo: ' + campoFaltando);
      return;
    }

    /* Gera o próximo id — equivalente ao AUTO_INCREMENT / SERIAL do SQL */
    const proximoId = db.records.reduce(function (maior, r) {
      return Math.max(maior, r.id || 0);
    }, 0) + 1;

    const novoRegistro = Object.assign({ id: proximoId }, registro);
    db.records.push(novoRegistro);

    salvar();
    renderizarTudo();
    alert('Registro inserido! Equivalente a: INSERT INTO ' + db.tableName + ' ...');
  }

  /* Remove um registro pelo id — equivalente a DELETE ... WHERE id = X */
  function excluirRegistro(id) {
    const confirmou = confirm('Excluir o registro id=' + id + '?');
    if (!confirmou) return;

    db.records = db.records.filter(function (r) { return r.id !== id; });
    salvar();
    renderizarTudo();
  }

  /* ------------------------------------------------------------------
     5. ETAPA 4 — CONSULTAS (SELECT ... WHERE)
     ------------------------------------------------------------------ */

  /* Compara um valor da célula com o valor digitado, segundo o operador */
  function comparar(valorCelula, operador, valorDigitado) {
    const celula = String(
      valorCelula === undefined || valorCelula === null ? '' : valorCelula
    );
    const alvo = String(valorDigitado);

    switch (operador) {
      case '=':
        return celula.toLowerCase() === alvo.toLowerCase();
      case 'contem':
        return celula.toLowerCase().indexOf(alvo.toLowerCase()) !== -1;
      case '>':
        return Number(celula) > Number(alvo);
      case '<':
        return Number(celula) < Number(alvo);
      case '>=':
        return Number(celula) >= Number(alvo);
      case '<=':
        return Number(celula) <= Number(alvo);
      default:
        return false;
    }
  }

  /* Executa a consulta e exibe o SQL equivalente na tela */
  function executarConsulta(mostrarTudo) {
    let resultado = db.records.slice();
    let sql = 'SELECT * FROM ' + db.tableName;

    if (!mostrarTudo) {
      const campo = $('#campoConsulta').value;
      const operador = $('#operador').value;
      const valor = $('#valorConsulta').value.trim();

      if (valor === '') {
        alert('Digite o valor da consulta.');
        return;
      }

      resultado = resultado.filter(function (registro) {
        return comparar(registro[campo], operador, valor);
      });

      const operadorSql = (operador === 'contem') ? 'LIKE' : operador;
      const valorSql = (operador === 'contem')
        ? "'%" + valor + "%'"
        : (isNaN(Number(valor)) ? "'" + valor + "'" : valor);

      sql += ' WHERE ' + campo + ' ' + operadorSql + ' ' + valorSql;
    }

    sql += ';';

    $('#sqlGerado').textContent = sql;
    $('#contadorConsulta').textContent =
      resultado.length + ' registro(s) retornado(s) de ' + db.records.length + '.';

    const caixaResultado = $('#resultadoConsulta');
    caixaResultado.innerHTML = '';
    caixaResultado.appendChild(construirTabelaHTML(resultado, false));
  }

  /* ------------------------------------------------------------------
     6. RENDERIZAÇÃO GERAL
     ------------------------------------------------------------------ */

  /* Cria um "chip" colorido que representa uma coluna da tabela */
  function criarChip(nome, tipo, observacao) {
    const chip = criar('span', 'chip');
    chip.textContent = nome + ' ';

    const detalhe = criar('small');
    detalhe.textContent = observacao ? (tipo + ' · ' + observacao) : tipo;

    chip.appendChild(detalhe);
    return chip;
  }

  /* Constrói a tabela HTML a partir de uma lista de registros */
  function construirTabelaHTML(registros, comAcoes) {
    const tabela = criar('table');

    /* Cabeçalho: sempre começa pelo id */
    const cabecalho = criar('thead');
    const linhaCabecalho = criar('tr');
    const colunas = ['id'].concat(db.fields.map(function (c) { return c.name; }));

    colunas.forEach(function (nomeColuna) {
      const th = criar('th');
      th.textContent = nomeColuna;
      linhaCabecalho.appendChild(th);
    });

    if (comAcoes) {
      const th = criar('th');
      th.textContent = '';
      linhaCabecalho.appendChild(th);
    }

    cabecalho.appendChild(linhaCabecalho);
    tabela.appendChild(cabecalho);

    /* Corpo da tabela */
    const corpo = criar('tbody');

    if (registros.length === 0) {
      const linhaVazia = criar('tr');
      const celulaVazia = criar('td');
      celulaVazia.colSpan = colunas.length + (comAcoes ? 1 : 0);
      celulaVazia.className = 'vazio';
      celulaVazia.textContent = 'Nenhum registro encontrado.';
      linhaVazia.appendChild(celulaVazia);
      corpo.appendChild(linhaVazia);
    }

    registros.forEach(function (registro) {
      const linha = criar('tr');

      const celulaId = criar('td');
      celulaId.textContent = registro.id;
      linha.appendChild(celulaId);

      db.fields.forEach(function (campo) {
        const celula = criar('td');
        const valor = registro[campo.name];
        celula.textContent = (valor === undefined || valor === null) ? '' : valor;
        linha.appendChild(celula);
      });

      if (comAcoes) {
        const celulaAcao = criar('td');
        const botaoExcluir = criar('button', 'danger mini');
        botaoExcluir.textContent = 'excluir';
        botaoExcluir.addEventListener('click', function () {
          excluirRegistro(registro.id);
        });
        celulaAcao.appendChild(botaoExcluir);
        linha.appendChild(celulaAcao);
      }

      corpo.appendChild(linha);
    });

    tabela.appendChild(corpo);
    return tabela;
  }

  /* Preenche o <select> da consulta com os campos da tabela */
  function renderizarSelecaoConsulta() {
    const selecao = $('#campoConsulta');
    selecao.innerHTML = '';

    db.fields.forEach(function (campo) {
      const opcao = criar('option');
      opcao.value = campo.name;
      opcao.textContent = campo.name;
      selecao.appendChild(opcao);
    });
  }

  /* Função central: atualiza toda a interface conforme o estado de `db` */
  function renderizarTudo() {
    const temTabela = !!db.tableName;

    ['#cardInfo', '#cardInserir', '#cardConsultar', '#cardTabela']
      .forEach(function (seletor) {
        $(seletor).classList.toggle('oculto', !temTabela);
      });

    $('#cardCriar').classList.toggle('oculto', temTabela);

    /* Sem tabela criada: mostra o formulário com dois campos padrão */
    if (!temTabela) {
      const lista = $('#listaCampos');
      lista.innerHTML = '';
      lista.appendChild(criarLinhaCampo('titulo', 'texto'));
      lista.appendChild(criarLinhaCampo('ano', 'numero'));
      return;
    }

    /* Com tabela criada: preenche todas as seções */
    $('#infoNome').textContent = db.tableName;

    const chips = $('#infoCampos');
    chips.innerHTML = '';
    chips.appendChild(criarChip('id', 'número', 'chave primária'));
    db.fields.forEach(function (campo) {
      chips.appendChild(criarChip(campo.name, campo.type, ''));
    });

    renderizarFormularioRegistro();
    renderizarSelecaoConsulta();

    const caixaTabela = $('#tabelaRegistros');
    caixaTabela.innerHTML = '';
    caixaTabela.appendChild(construirTabelaHTML(db.records, true));
    $('#contadorTotal').textContent =
      'Total: ' + db.records.length + ' registro(s).';

    $('#resultadoConsulta').innerHTML = '';
    $('#sqlGerado').textContent = '-- a consulta aparecerá aqui';
    $('#contadorConsulta').textContent = '';
  }

  /* ------------------------------------------------------------------
     7. EXPORTAÇÃO EM CSV
     ------------------------------------------------------------------ */
  function exportarCSV() {
    if (!db.tableName) return;

    const cabecalho = ['id'].concat(db.fields.map(function (c) { return c.name; }));
    const linhas = [cabecalho.join(';')];

    db.records.forEach(function (registro) {
      linhas.push(cabecalho.map(function (coluna) {
        const valor = (registro[coluna] === undefined || registro[coluna] === null)
          ? ''
          : registro[coluna];
        return '"' + String(valor).replace(/"/g, '""') + '"';
      }).join(';'));
    });

    /* \uFEFF garante acentuação correta ao abrir no Excel */
    const blob = new Blob(['\uFEFF' + linhas.join('\n')],
                          { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = (db.tableName || 'tabela') + '.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /* ------------------------------------------------------------------
     8. INICIALIZAÇÃO
     ------------------------------------------------------------------ */
  function iniciar() {
    carregar();

    $('#btnAddCampo').addEventListener('click', function () {
      $('#listaCampos').appendChild(criarLinhaCampo('', 'texto'));
    });

    $('#btnCriarTabela').addEventListener('click', criarTabela);
    $('#btnExemplo').addEventListener('click', carregarExemplo);
    $('#btnApagarTabela').addEventListener('click', apagarTabela);
    $('#btnInserir').addEventListener('click', inserirRegistro);

    $('#btnConsultar').addEventListener('click', function () {
      executarConsulta(false);
    });
    $('#btnTodos').addEventListener('click', function () {
      executarConsulta(true);
    });

    $('#btnCSV').addEventListener('click', exportarCSV);

    renderizarTudo();
  }

  iniciar();
})();