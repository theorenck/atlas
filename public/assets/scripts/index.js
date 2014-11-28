var API = { address : "http://localhost:4567/api" };

var editor;
var CodeView;

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
 * @return String ou Array Array com os params que faltaram, string se deu certo
 */
function prepareStatement(statement, params){
  $.each(params, function(index, value){
    statement = statement.replace(':' + index, value);
  });

  return statement.match(/\:([a-zA]+[a-zA-Z0-9_]*)/g) || statement;
}

$('[data-behavior~=execute-sql]').on('submit', function() {
  Index.editor.save();
  CodeView.getDoc().setValue($('#statement').val());


  var _submit   = $(this).find('button[type="submit"]');
  var statement = $('textarea#statement').val();
  var params    = prepareParams();

  statement = prepareStatement(statement, params);

  if (Array.isArray(statement)) {
    var message  = "Desculpe, mas você esqueceu de preencher os seguintes parâmetros: <strong>" + statement.join(', ').replace(':', '') + '</strong>';
    $(".container").prepend('<div class="alert alert-dismissable alert-danger"><button type="button" class="close" data-dismiss="alert">×</button><strong>Oh snap! </strong>'+message+'</div>');
    return false;
  }else{
    _submit.button("loading");
    reset(statement);
    $.post(
      API.address + "/statements",
      JSON.stringify({
        "statement": statement,
        "limit": parseInt($('input#limit').val(), 10),
        "offset": 0,
        "params" : params
      }), function(data) {
        createHeader(data);
        appendResults(data);
        _submit.button("reset");
        $("#results-area").removeClass("hidden");
        CodeView.refresh();
        $("#query-area").addClass("hidden");
        $("#results-area h2").append($('<small>').text(" "+data.records+" registros encontrados"));
    }).fail(function(xhr, status, error) {
      fail(xhr, status, error, function() {
        _submit.button("reset");
      });
    });
    return false;

  }

});

$('[data-behavior~=see-more]').on('click', function() {
  $('[data-behavior~=see-more]').button("loading");

  var limit     = parseInt($('input#limit').val(), 10);
  var page      = $(this).data("currentPage") || 1;
  var statement = $("#sql").text();
  var params    = prepareParams();

  $.post(
    API.address + "/statements",
    JSON.stringify({
      "statement":statement,
      "limit": limit,
      "offset": limit * page,
      "params" : params
    }), function(data) {
      appendResults(data);
      $('[data-behavior~=see-more]').button("reset");
      $('[data-behavior~=see-more]').data("currentPage",page+1);
  }).fail( function(xhr, status, error) {
    fail(xhr, status, error, function() {
      $('[data-behavior~=see-more]').button("reset");
    });
  });
});


$('[data-behavior~=edit-sql]').on('click', function(){
  $("#results-area").toggleClass("hidden");
  $("#query-area").toggleClass("hidden");
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
  } else if (xhr.status == 0) {
    return "There was an unexpected error when accessing the server.";
  } else {
    return xhr.statusText;
  }
}

function getFriendlyMessage(message) {
  return message.replace(
    /.*\[SoftVelocity Inc\.\]\[TopSpeed ODBC Driver\](\[ISAM\]ISAM)?/,""
  );
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

// function pega(e){
//   var params = [];
//   console.log(e);
//   var x = e.match(/\:([a-zA]+[a-zA-Z0-9_]*)/g);
//   console.log(e.match(/\:([a-zA]+[a-zA-Z0-9_]*)/g));


// }

function prepareParams(){
  var headers  = $('[data-behaivor=table-editable]').find('tbody tr');
  var params   = {}

  $.each(headers, function(i, el){
    valor = $(el).find('td:last').text();
    if($.trim(valor) !== '')
      params[$(el).find('td:first').text()] = valor;
  });

  return params;
}

function prepareSyntaxHighlight(){
  /* @todo - iterar os textarea com data-behaivor = code */
  code = CodeMirror.fromTextArea(document.getElementById("statement"), {
    lineNumbers: true,
    extraKeys: {
      "Ctrl-Space": "autocomplete",
      "Ctrl-S" : function(e){ console.log(e.options.value); },
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
      console.log(stream);
    }
    // readOnly : true
    // hintOptions: {
    //   tables: {
    //       "zw14ppro": [ "codproduto", "codbarras", "descricao1" ],
    //       "table2": [ "other_columns1", "other_columns2" ]
    //   }
    // }
  });

  code.setOption("hintOptions",{
      tables: JSON.parse(localStorage.getItem("tables"))
  });

  CodeView = CodeMirror.fromTextArea(document.getElementById("sql"), {
    lineNumbers: true,
    mode: {name: "sql", globalVars: true},
    tabSize : 2,
    tabMode : "default",
    styleActiveLine: false,
    matchBrackets: true,
    mode : 'text/x-sql',
    cursorBlinkRate : 0,
    viewportMargin: Infinity,
    readOnly : 'nocursor'
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


    // $(document).on('focus', "[data-behaivor=table-editable] tbody td",function(){
    //   if (isLastTr === false) {
    //     var exclui = false;
    //     var qtdTds = $(this).closest('tr').find('td').length;

    //     $.each($(this).closest('tr').find('td'), function(index, td) {
    //         if ($.trim($(td).text()) === '')
    //           exclui++;
    //     });

    //     if (exclui === qtdTds) {
    //       $(this).closest('tr').remove();
    //     };

    //     $(this).closest('tr').next().find('td:first').focus();

    //   }
    // });

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
      console.log('oi');
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
      $('[data-container=options]').stop().slideToggle();
    });

  }


};
$(Index.init);



// $(function(){

  // $(document).scroll(function(){
  //   var alturaDocumento= $(document).height();
  //   var alturaScrol    = $(document).scrollTop();
  //   var percentualTopo = alturaDocumento * 0.6;

  //   var qtdRegistrosCarregados   = 0;

  //   if(alturaScrol > percentualTopo){
  //     $('[data-behavior="see-more"]').click();
  //   }
  // });

// });