$('[data-behavior~=execute-sql]').on('click', function() {
  $('[data-behavior~=execute-sql]').button("loading");
  var statement = $('textarea#statement').val();
  reset(statement);
  $.post(
    "/api/statements",
    JSON.stringify({
      "statement":statement,
      "limit": parseInt($('input#limit').val(), 10),
      "offset": 0
    }), function(data) {
      createHeader(data);
      appendResults(data);
      $('[data-behavior~=execute-sql]').button("reset");
      $("#results-area").removeClass("hidden");
      $("#results-area h2").append($('<small>').text(" "+data.records+" registros encontrados"));
    }
  ).fail( function(xhr, textStatus, errorThrown) {
    var message = getErrorMessage(xhr);
    $(".container").prepend('<div class="alert alert-dismissable alert-danger"><button type="button" class="close" data-dismiss="alert">×</button><strong>Oh snap! </strong>'+message+'</div>');
    $('[data-behavior~=execute-sql]').button("reset");
  });
});

$('[data-behavior~=see-more]').on('click', function() {
  $('[data-behavior~=see-more]').button("loading");
  var limit = parseInt($('input#limit').val(), 10);
  var page = $(this).data("currentPage") || 1;
  var statement = $("#sql").text();
  $.post(
    "/api/statements",
    JSON.stringify({
      "statement":statement,
      "limit": limit,
      "offset": limit * page
    }), function(data) {
      appendResults(data);
      $('[data-behavior~=see-more]').button("reset");
      $('[data-behavior~=see-more]').data("currentPage",page+1);
    }
  ).fail( function(xhr, textStatus, errorThrown) {
    var message = getErrorMessage(xhr);
    $(".container").prepend('<div class="alert alert-dismissable alert-danger"><button type="button" class="close" data-dismiss="alert">×</button><strong>Oh snap! </strong>'+message+'</div>');
    $('[data-behavior~=see-more]').button("reset");
  });
});

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
    // return xhr.responseJSON.errors.replace(/.*\[SoftVelocity Inc\.\]\[TopSpeed ODBC Driver\](\[ISAM\]ISAM)?/,"");
    return xhr.responseJSON.errors;
  } else if (xhr.status == 0) {
    return "There was an unexpected error when accessing the server.";
  } else {
    return xhr.statusText;
  }
}

function createHeader(data) {
  var _tr;
  $("#results table").append($("<thead>")).append($("<tr>"));
  _tr = $("#results table thead tr:last");
  $.each(data.columns,function() {
    _tr.append($("<th>").text(this.name));
  });
}

function appendResults(data) {
  var _tbody;
  
  $("#results table").append($("<tbody>"));
  _tbody = $("#results table tbody");
  $.each(data.rows,function() {
    _tbody.append($("<tr>"));
    $.each(this,function(index,column) {
      _tbody.find("tr:last").append($("<td nowrap>").text(column));
    });
  });
}

