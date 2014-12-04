moment.locale('pt-br');
API = { address : "http://localhost:3000/api" };

var editor;

Tables = {

  fetched : {},

  data : [],

  info : {
    fetched : 0,
    completed : 0,
  },

  fetchTables : function(){
    $.ajax({
      url: API.address + '/tables',
      type: 'GET',
    })
    .done(function(data) {
      Tables.data = data.tables;
      Tables.info.fetched = data.tables.length;
      $('[data-type=fetch-tables]').find('.to').text(Tables.info.fetched);
      Tables.fetchColumns();
    });
  },

  fetchColumns : function(){

    _.each(Tables.data, function(t){
      $.ajax({
        url: API.address + '/tables/' + t,
        type: 'GET',
      })
      .done(function(data) {
        var column = [];

        _.each(data.columns, function(c){
          column.push(c.name);
        });

        Tables.fetched[t] = column;

        Tables.info.completed++;
        $('[data-type=fetch-tables]').find('.from').text(Tables.info.completed);

        if (Tables.info.completed === Tables.info.fetched) {
          localStorage.setItem("tables", JSON.stringify(Tables.fetched));
          $('[data-type=fetch-tables]').find('.fa, .from, .to, .de').hide();
        };
      });

    });
  },

  init : function () {
    var _link  = $('[data-type=fetch-tables]');
    _link.on('click', function(){
      _link.find('.hidden').removeClass('hidden');
      Tables.fetchTables();
    });
  }
};

$(Tables.init);


/**
 * Verifica se não há nenhum parâmetro sobrando
 */
function verificaParametros(statement, params){
  var paramsStatement = _.map(statement.match(/\s\:([a-zA-Z0-9]+[a-zA-Z0-9_]*\b)/g), function(val) { return $.trim(val).replace(':',''); });
  var paramsReturn = [];

  _.forEach(params, function(value, index){
    if(!_.contains(paramsStatement, index))
      paramsReturn.push(index);
  });

  return paramsReturn.length > 0 ? paramsReturn.join(', ') : false;

}

/**
 * Verifica se todos parâmetros foram preenchidos
 */
function verificaStatement(statement, params){
  $.each(params, function(index, value){
    tokens    = statement.split(':' + index);
    statement = tokens.join(value);
  });

  return statement.match(/\s\:([a-zA-Z0-9]+[a-zA-Z0-9_]*\b)/g) || statement;
}

$('[data-behavior~=execute-sql]').on('submit', function() {
  Index.editor.save();

  var _submit        = $(this).find('button[type="submit"]');
  var statement      = $('textarea#statement').val();
  var params         = prepareParams();
  var limit          = prepareLimit();
  var offset         = function(){if( limit ){ return 0; }}();
  var paramsSobrando = verificaParametros(statement, params);
  reset(statement);

  if (Array.isArray(verificaStatement(statement, params))) {
    var params   = verificaStatement(statement, params);
    var message  = "Desculpe, mas você esqueceu de preencher os seguintes parâmetros: <strong>" + params.join(', ').replace(':', '') + '</strong>';
    $(".container").prepend('<div class="alert alert-dismissable alert-danger"><button type="button" class="close" data-dismiss="alert">×</button><strong>Oh snap! </strong>'+message+'</div>');
    return false;
  }
  else{
    _submit.button("loading");

    if(paramsSobrando !== false){
      var message  = "Existem parâmetros não utilizados: <strong>" + paramsSobrando + '</strong>';
      $(".container").prepend('<div class="alert alert-dismissable alert-warning"><button type="button" class="close" data-dismiss="alert">×</button><strong>Hey! </strong>'+message+'</div>');
    }

    $.ajax({
      type: "POST",
      url: API.address + "/statements",
      contentType: "application/json",
      data: JSON.stringify({
        "statement" : {
          "sql" : statement,
          "limit": limit,
          "offset": offset,
          "params" : params
        }
      }),
      beforeSend : function(){
        code.setOption('readOnly', 'nocursor');
        $('.atlCheckbox').addClass('atlCheckbox_disabled');
        $('[data-behaivor=limit-input]').attr('disabled', 'disabled');
      }
    })
    .done(function(data) {

      if(typeof data.errors !== 'undefined'){
          var message = data.errors;
          $(".container").prepend('<div class="alert alert-dismissable alert-danger"><button type="button" class="close" data-dismiss="alert">×</button><strong>Oh snap! </strong>'+message+'</div>');
      }else{
        Historico.addItem($('textarea#statement').val(),params,limit);

        createHeader(data.statement);
        appendResults(data.statement);
        if(data.statement.records === data.statement.fetched)
          $('[data-behavior=see-more]').hide();
        else
          $('[data-behavior=see-more]').show();

        $("[data-type=results]").removeClass("hidden");
        $("[data-type=console], [data-type=history]").addClass("hidden");
        $("#query-area").addClass("disabled");
        $("#results-area").removeClass("hidden");
        $('#query-area :input:not([data-behavior=edit-sql])').attr('disabled', 'disabled');
        $("h2[data-type=results]").append($('<small>').text(" "+data.statement.records+" registros"));

        // cria cabeçalhos que acompanhem o scroll para a tabela
        $table = $('#results .table');
        $table.floatThead('destroy');
        $table.floatThead({
            scrollContainer: function($table){
            return $table.closest('.wrapper');
          }
        });

      }

      _submit.button("reset");

    })
    .fail(function(xhr, status, error) {
      code.setOption('readOnly', false);
      $('.atlCheckbox').removeClass('atlCheckbox_disabled');
      $('[data-behaivor=limit-input]').removeAttr('disabled');
      fail(xhr, status, error, function() {
        _submit.button("reset");
      });
    });
    return false;

  }

});

$('[data-behavior~=see-more]').on('click', function() {
  $('[data-behavior~=see-more]').button("loading");

  var limit     = prepareLimit();
  var page      = $(this).data("currentPage") || 1;
  var statement = $('textarea#statement').val();
  var params    = prepareParams();
  var offset    = (function(){ if(limit) return limit * page; })();

  $.ajax({
    type: "POST",
    url: API.address + "/statements",
    contentType: "application/json",
    data: JSON.stringify({
        "statement" : {
          "sql" : statement,
          "limit": limit,
          "offset": offset,
          "params" : params
        }
      })
  })
  .done(function(data) {
    appendResults(data.statement);
    $('[data-behavior~=see-more]').button("reset");
    $('[data-behavior~=see-more]').data("currentPage",page+1);
  })
  .fail( function(xhr, status, error) {
    fail(xhr, status, error, function() {
      $('[data-behavior~=see-more]').button("reset");
    });
  });
});


$('[data-behavior~=edit-sql]').on('click', function(){
  $("[data-type=results]").addClass("hidden");
  $("[data-type=console], [data-type=history]").removeClass("hidden");
  $("#results-area").addClass("hidden");
  $("#query-area").removeClass("disabled");
  $('.atlCheckbox').removeClass('atlCheckbox_disabled');
  $(':input').removeAttr('disabled');
  $("h2[data-type=results] small").remove();
  code.setOption('readOnly', false);
});

function fail(xhr, textStatus, errorThrown, callback) {
  var message = getErrorMessage(xhr);
  $(".container").prepend('<div class="alert alert-dismissable alert-danger"><button type="button" class="close" data-dismiss="alert">×</button><strong>Oh snap! </strong>'+message+'</div>');
  if (callback !== undefined && typeof callback === "function") {
    callback.call();
  }
}

function reset(statement) {
  $(".alert").remove();
  $("#results-area").addClass("hidden");
  $("#results-area h2 small").remove();
  $('[data-behavior~=see-more]').data("currentPage",0);
  $("#results table thead").remove();
  $("#results table tbody").empty();
}

function getErrorMessage(xhr) {
  if (xhr.responseJSON !== undefined &&  xhr.responseJSON.errors !== undefined ) {
    return getFriendlyMessage(xhr.responseJSON.errors);
  }
  else if (xhr.status == 0) {
    return "There was an unexpected error when accessing the server.";
  } else {
    return xhr.statusText;
  }
}

function getFriendlyMessage(message) {
  var newMessage = [];

  _.forEach(message, function(el){
    newMessage.push(el[0].replace(
      /.*\[SoftVelocity Inc\.\]\[TopSpeed ODBC Driver\](\[ISAM\]ISAM)?/,""
    ));
  });

  return newMessage.join(', ');
}

function createHeader(data) {
  var _table   = $("#results table");
  var _thead   = _table.append('<thead>').find('thead');

  var view     = $('#tableResultsHeader').html();
  var template = _.template(view, { columns : data.columns });

  $(_thead).html(template);
}

function createBody(table){
  var _tbody = $(table).find('tbody');

  if(_tbody.length === 0){
    _tbody = $(table).append('<tbody>').find('tbody');
  }

  return _tbody;
}

function appendResults(data) {
  var _table = $("#results table");
  var _tbody = createBody(_table);

  var view     = $('#tableResultsRows').html();
  var template = _.template(view, { rows : data.rows });

  $(_tbody).append(template);
}

function prepareLimit(){
  if ($('[data-behaivor=disable-limit] :checkbox').is(':checked'))
    return parseInt($('#limit').val());
}

function prepareParams(){
  var headers  = $('[data-behaivor=table-editable]').find('tbody tr');
  var params   = {}
  var index, value;

  $.each(headers, function(i, el){
    value = $(el).find('td:last').text();
    if($.trim(value) !== ''){
      index = $.trim($(el).find('td:first').text());
      params[index] = $.trim(value);
    }
  });

  return params;
}

function prepareSyntaxHighlight(){
  /* @todo - iterar os textarea com data-behaivor = code */
  code = CodeMirror.fromTextArea(document.getElementById("statement"), {
    lineNumbers: true,
    extraKeys: {
      "Ctrl-Space": "autocomplete",
      "Ctrl-S" : function(e){
        Index.editor.save();
        var statement = $('textarea#statement').val();
        var params    = prepareParams();
        var limit     = prepareLimit();

        Historico.addItem(statement, params, limit)
      },
      "F8" : function(){
        $('[data-behavior=execute-sql]').submit();
      },
      "Ctrl-Enter" : function(e){
        // code.getInputField().blur();
        $('[data-behaivor=toggle-options]').focus();
      }},
    mode: {name: "sql", globalVars: true},
    tabSize : 2,
    tabMode : "default",
    styleActiveLine: false,
    matchBrackets: true,
    mode : 'text/x-sql',
    viewportMargin: Infinity,
    onKeyUp : function(stream){
      // console.log(stream);
    }
    // readOnly : true
  });

  code.setOption("hintOptions",{
      tables: JSON.parse(localStorage.getItem("tables"))
  });

  return code;

}

var Index = {
  editor : [],

  init : function(){
    Index.editor = prepareSyntaxHighlight();
    $('[data-behaivor=table-editable]').editableTableWidget({editor: $('<input id="table-editable-input">')});

    var isLastTr;
    var isLastTd;

    /**
     * escuta o blur da TD, verifica se é a ultima e se está vazia
     * Se não for vazia, então cria uma nova linha
     */
    $(document).on('blur', "[data-behaivor=table-editable] tbody tr:last td:last",function(){
      if ($.trim($(this).text()) !== '') {
        $('[data-behaivor=table-editable] tbody').append('<tr><td tabindex="1"/><td tabindex="1"/><td tabindex="1"/></tr>');
      }
    });

    /*
      $(document).on('focus', "[data-behaivor=table-editable] tbody td",function(){
        if (isLastTr === false) {
          var exclui = false;
          var qtdTds = $(this).closest('tr').find('td').length;

          $.each($(this).closest('tr').find('td'), function(index, td) {
              if ($.trim($(td).text()) === '')
                exclui++;
          });

          if (exclui === qtdTds) {
            $(this).closest('tr').remove();
          };

          $(this).closest('tr').next().find('td:first').focus();

        }
      });
    */

    /**
     * Quando entra na ultima linha, seta a flag para true
     * Se for a ultima TD seta pra true a ultimaTd tb
     */
    $(document).on('focus', "[data-behaivor=table-editable] tbody td",function(){
      var qtdTr = $('[data-behaivor=table-editable] tbody tr').length;
      var tr    = $(this).closest('tr');
      var qtdTd = tr.find('td').length;

      isLastTr  = tr.index() === (qtdTr-1);
      isLastTd  = $(this).index() === (qtdTd-1);
    });

    // verifica se só foi clicado o TAB, sem shift
    $(document).on('keydown', '[data-behaivor=table-editable] tbody tr:last td:last', function(event){
      if(!event.shiftKey && event.keyCode === 9 || event.keyCode === 40){
        window.setTimeout(function(){
          $('#limit').focus();
        }, 1);
      }
    });

    $(document).on('keydown', '[data-behaivor=table-editable] tbody tr:last', function(event){
      if(event.keyCode === 40){
        window.setTimeout(function(){
          $('#limit').focus();
        }, 1);
      }
    });

    $(document).on('keyup', '[data-behaivor=table-editable] tbody tr:first td:first', function(event){
      if(event.shiftKey && event.keyCode === 9){
        window.setTimeout(function(){
          $('#advanced-options').focus();
        }, 1);
      }
    });

    $(document).on('keydown', '#limit', function(event){
      if(event.shiftKey && event.keyCode === 9){
        window.setTimeout(function(){
          $('[data-behaivor=table-editable] tbody tr:last td:last').focus();
        }, 1);
      }
    });


    /**
     * Quando sai do link de op~ções avançadas abre e tá aberto,
     * foca na primeira linha
     */
    $(document).on('blur', '#advanced-options', function(){
      if( $('[data-container=options]').is(':visible')){
        window.setTimeout(function(){
          $('[data-behaivor=table-editable] tbody tr:first td:first').focus();
        }, 1);
      }
    });

    /**
     * Quando preciono TAB no input de edição e ele está posicionado na ultima tr e td da tabela
     * Cria uma nova linha e foca nela, senão só cria a nova linha
     */
    $(document).on('keydown', '#table-editable-input' ,function(event){

      if(isLastTr && isLastTd && !event.shiftKey && event.keyCode === 9){
        window.setTimeout(function(){
          $('[data-behaivor=table-editable] tbody tr:last td:first').focus();
        }, 1);
      }

    });

    $('[data-behaivor=toggle-options]').on('click', function(){
      $(this).find('.caret').toggleClass('caret-reversed');
      $('[data-container=options]').stop().slideToggle();
    });

    $(document).on('click','[data-behaivor=disable-limit]', function(){
      var checkbox = $(this).find(':checkbox');
      if (checkbox.is(':checked')) {
        $('[data-behaivor=limit-input]').removeAttr('disabled');
      }else{
        $('[data-behaivor=limit-input]').attr('disabled', 'disabled');
      }
    });

  }
};
$(Index.init);



function verifyServer (){
  $.get(API.address + '/ping', function(data) {
      reset(data);
      var message  = "Estamos de volta :D";
      $(".container").prepend('<div class="alert alert-dismissable alert-success"><button type="button" class="close" data-dismiss="alert">×</button><strong>Oh great! </strong>'+message+'</div>');
      return false;
  }).fail(function(xhr){
    setTimeout(function () {
    }, 1500);
  });
}


/**
 * CHECKBOX
 */
$(document).on('mouseenter', '[data-type=checkbox]', function(){
  $(this).addClass('atlCheckbox_hover');
});

$(document).on('focus', '[data-type=checkbox]', function(){
  $(this).addClass('atlCheckbox_active');
});

$(document).on('click', '[data-type=checkbox]', function(){
  $(this).toggleClass('atlCheckbox_checked');
});

$(document).on('blur', '[data-type=checkbox]', function(){
  $(this).removeClass('atlCheckbox_active');
});

$(document).on('mouseleave', '[data-type=checkbox]', function(){
  $(this).removeClass('atlCheckbox_hover').removeClass('.atlCheckbox_active');
});


var Historico = {

  render : function(){
    var history = JSON.parse(localStorage.getItem('history')) || [];
    if (history.length) {
      var view    = $('#historyItems').html();
      var template= _.template(view, { rows : history.reverse() });
      $('[data-behaivor=history-list]').html(template);
    }else{
      $('[data-behaivor=history-list]').html('');
    }
  },

  getStyleType : function(type){
    switch(type){
      case "SELECT":
        return 'info';
    }
  },

  addItem : function(statement, params, limit){
    var history = JSON.parse(localStorage.getItem('history')) || [];
    var type    = statement.match(/^[\n|\t|\s|\r]*(SELECT|DELETE|UPDATE|INSERT)\b/i)[1].toUpperCase();
    var item    = {
      "id"         : parseInt(Math.random() * 0xFFFFFF, 10).toString(16),
      "statement"  : statement,
      "params"     : params,
      "limit"      : limit,
      "created_at" : new Date(),
      'type'       : type
    }
    history.push(item);
    localStorage.setItem('history', JSON.stringify(history));
    Historico.render();
  },

  removeItem : function(id){
    var history = JSON.parse(localStorage.getItem('history')) || [];
    _.remove(history, function(historyItem) { return historyItem.id === id });
    localStorage.setItem('history', JSON.stringify(history));
  },

  loadItem : function(id){

    var confirmacao = confirm("Você tem certeza que deseja carregar esse item, você perderá qualquer alteração não salva?");

    if (confirmacao) {
      var history = JSON.parse(localStorage.getItem('history')) || [];
      var item    = _.find(history, function(historyItem) { return historyItem.id === id });
      var _table  = $('[data-behaivor=table-editable] tbody');

      /* Carregar no codeview */
      Index.editor.setValue(item.statement);

      /* Carregar parâmetros */
      _table.find('tr').remove();
      _.forEach(item.params, function(valor, nome){
        _table.append('<tr><td tabindex="1">' + nome + '</td><td tabindex="1"></td><td tabindex="1">' + valor + '</td></tr>');
      });
      _table.append('<tr><td tabindex="1">&nbsp;</td><td tabindex="1"></td><td tabindex="1"></td></tr>');

      /* Carregar carregarLimite */
      $('[data-behaivor=limit-input]').val(item.limit);

      $('.container > .alert').remove();
      var message = "Muito bem amiguinho, o item foi carregado com sucesso!";
      $(".container").prepend('<div class="alert alert-dismissable alert-success"><button type="button" class="close" data-dismiss="alert">×</button><strong>Oh great! </strong>'+message+'</div>');
    };

  },

  init : function(){
    Historico.render();

    $('[data-behaivor=history-list]').on('click', '.close-history-item', function(){
      var id = $(this).closest('a').attr('data-id');
      Historico.removeItem(id);
      Historico.render();
    });

    $('[data-behaivor=history-list]').on('click', 'a', function(e){
      if( $(e.target).is(':not(.fa-close)') && $(e.target).is(':not(.close-history-item)')){
        var id = $(this).attr('data-id');
        Historico.loadItem(id);
      }
    });

  }

}
$(Historico.init);



$(function(){
  var keys = '';
  $(document).on('keypress', function(e){
    keys += (''+e.which);
    if (keys === '112979910997110') {
      $("body").css({
        "background-image": 'url("http://images2.fanpop.com/image/photos/8900000/Grid-pac-man-8970124-1680-1050.jpg")',
        "background-attachment": 'fixed', "background-size": 'cover'
      }).append('<audio src="assets/audio/pacman_intro.mp3" autoplay loop></audio>');
      $('h1, .h1, h2, .h2, h3, .h3').css('color', '#ecf0f1');

    };
  });
});


$(function(){
  $('.escondeIsso').click(function(){
    $('.historico').addClass('hidden');
    $('.console').removeClass('col-md-8').addClass('col-md-12');
  });
});
