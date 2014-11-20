var API = { address : "http://localhost:4567/api" };

$('[data-behavior~=execute-sql]').on('submit', function() {
  var _submit = $(this).find('button[type="submit"]')
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
      createBody();
      appendResults(data);
      _submit.button("reset");
      $("#results-area").removeClass("hidden");
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
  $("#results table thead").empty();
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
  $("#results table").append($("<thead>").html($("<tr>")));
  $.each(data.columns,function() {
    $("#results table thead tr").append($("<th>").text(this.name));
  });
}

function createBody() {
  $("#results table").append($("<tbody>"));
}

function appendResults(data) {
  $.each(data.rows,function() {
    $("#results table tbody").append($("<tr>"));
    $.each(this,function(index,column) {
      $("#results table tbody tr:last").append($("<td nowrap>").text(column));
    });
  });
}

