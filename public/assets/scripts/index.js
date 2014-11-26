var API = { address : "http://localhost:4567/api" };

$('[data-behavior~=execute-sql]').on('submit', function() {
  Index.editor.save();
  var _submit = $(this).find('button[type="submit"]');
  var statement = $('textarea#statement').val();
  _submit.button("loading");
  reset(statement);
  $.post(
    API.address + "/statements",
    JSON.stringify({
      "statement": statement,
      "limit": parseInt($('input#limit').val(), 10),
      "offset": 0
    }), function(data) {
      createHeader(data);
      appendResults(data);
      _submit.button("reset");
      $("#results-area").removeClass("hidden");
      $("#query-area").addClass("hidden");
      $("#results-area h2").append($('<small>').text(" "+data.records+" registros encontrados"));
  }).fail(function(xhr, status, error) {
    fail(xhr, status, error, function() {
      _submit.button("reset");
    });
  });
  return false;
});

$('[data-behavior~=see-more]').on('click', function() {
  $('[data-behavior~=see-more]').button("loading");
  var limit = parseInt($('input#limit').val(), 10);
  var page = $(this).data("currentPage") || 1;
  var statement = $("#sql").text();
  $.post(
    API.address + "/statements",
    JSON.stringify({
      "statement":statement,
      "limit": limit,
      "offset": limit * page
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
  $("#sql code").empty().text(statement.toUpperCase());
  $('pre code').each(function(i, block) {
    hljs.highlightBlock(block);
  });
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

function prepareSyntaxHighlight(){
  return CodeMirror.fromTextArea(document.getElementById("statement"), {
    lineNumbers: true,
    extraKeys: {"Ctrl-Space": "autocomplete"},
    mode: {name: "sql", globalVars: true},
    styleActiveLine: false,
    matchBrackets: true,
    mode : 'text/x-sql',
    viewportMargin: Infinity
  });
}

var Index = {

  editor : [],

  init : function(){
    Index.editor = prepareSyntaxHighlight();
  }


};
$(Index.init)



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