moment.locale('pt-BR');

var Dashboard = {

  geraGrafico : function(data){
    var labels   = [];
    var datasets = [];
    var valores  = { total : [], media : [] };
    var dia;

    $.each(data.rows, function(el, val){
      dia = val[0].split('-')[2];

      labels.push(dia);
      valores.total.push(val[3]);
      valores.media.push(val[2]);

    });

    var data = {
      "labels" : labels,
      "datasets" : [
        {
          label: "Outro Volume",
          fillColor: "rgba(220,220,220,0.2)",
          strokeColor: "rgba(220,220,220,1)",
          pointColor: "rgba(220,220,220,1)",
          pointStrokeColor: "#fff",
          pointHighlightFill: "#fff",
          pointHighlightStroke: "rgba(220,220,220,1)",
          data: valores.media
        },
        {
          label: "Volume total",
          fillColor: "rgba(151,187,205,0.2)",
          strokeColor: "rgba(151,187,205,1)",
          pointColor: "rgba(151,187,205,1)",
          pointStrokeColor: "#fff",
          pointHighlightFill: "#fff",
          pointHighlightStroke: "rgba(151,187,205,1)",
          data: valores.total
        }
      ]
    };

    var options = {
      responsive : true,
      maintainAspectRatio : false,
      scaleShowGridLines : false,
      scaleGridLineColor : "rgba(0,0,0,.05)",
      scaleGridLineWidth : 1,
      bezierCurve : true,
      bezierCurveTension : 0.4,
      pointDot : true,
      pointDotRadius : 4,
      pointDotStrokeWidth : 1,
      pointHitDetectionRadius : 20,
      datasetStroke : true,
      datasetStrokeWidth : 2,
      datasetFill : true,
      tooltipTemplate : "<%= datasetLabel %>: R$ <%= value %>",
    };

    var ctx = $("#volume-vendas").get(0).getContext("2d");
    var myLineChart = new Chart(ctx).Line(data, options);
  },

  efetuaChamada : function(){
    Dashboard.loader();
    $.post(
      '/api/statements',
      JSON.stringify({
        "statement": $("#query").val() ,
        "limit": 20,
        "offset": 0
      })
    )

    .done(function(data){
      $(".alert").remove();
      Dashboard.geraGrafico(data);
    })
    .fail(function(err){
      $(".alert").remove();
      var message = getErrorMessage(err);
      $(".container").prepend('<div class="alert alert-dismissable alert-danger"><button type="button" class="close" data-dismiss="alert">×</button><strong>Oh snap! </strong>'+message+'</div>');
    })
    .always(function(){
      Dashboard.loader();
    });
  },

  loader : function(container){
    var container = container || '.grafico-content';
    var loader    = $(container).find('.loader');
    $(loader).stop().fadeToggle();
  },

  init : function(){
    Dashboard.efetuaChamada();
    $(document).on('click', '[data-behaivor~=carregar-dados]', Dashboard.efetuaChamada);
    $('#reportrange').daterangepicker(
      {
        ranges: {
           'Hoje': [moment(), moment()],
           'Ontem': [moment().subtract('days', 1), moment().subtract('days', 1)],
           'Últimos 7 Dias': [moment().subtract('days', 6), moment()],
           'Últimos 30 Dias': [moment().subtract('days', 29), moment()],
           'Este Mês': [moment().startOf('month'), moment().endOf('month')],
           'Último Mês': [moment().subtract('month', 1).startOf('month'), moment().subtract('month', 1).endOf('month')]
        },
        startDate: moment().subtract('days', 29),
        endDate: moment(),
        locale: {
          applyLabel: 'Aplicar',
          cancelLabel: 'Limpar',
          fromLabel: 'De',
          toLabel: 'Para',
          customRangeLabel: 'Personalizado',
          daysOfWeek: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex','Sab'],
          monthNames: ['Janeiro', 'Favereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
        }

      },
      function(start, end) {
          $('.data-container .data-atual').html(start.format('MMMM/YYYY'));
          $('.data-container .data-especifica').html(start.format('D') + ' até ' + end.format('D'));

          $('#reportrange span.text').html(start.format('D [de] MMMM, YYYY') + ' - ' + end.format('D [de] MMMM, YYYY'));
      }
  );
  },
};

$(Dashboard.init);

function getErrorMessage(xhr) {
  if (xhr.responseJSON !== undefined &&  xhr.responseJSON.errors !== undefined ) {
    return xhr.responseJSON.errors.replace(/.*\[SoftVelocity Inc\.\]\[TopSpeed ODBC Driver\](\[ISAM\]ISAM)?/,"");
  } else if (xhr.status == 0) {
    return "There was an unexpected error when accessing the server.";
  } else {
    return xhr.statusText;
  }
}
