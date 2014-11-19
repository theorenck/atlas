moment.locale('pt-br');

var Indicadores = {

  periodo : {
    inicio : '2013-11-01 00:00:00',//(moment().format("YYYY-MM-DD 00:00:00")),
    fim    : '2013-11-30 00:00:00'//(moment(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)).format("YYYY-MM-DD 00:00:00"))
  },

  volumeVendasDiario : function(){
    return "SELECT {FN CONVERT({FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-73049, {D '2001-01-01'})}, SQL_DATE)} AS \"DATA_EMISSAO\", COUNT(p.numeropedido) AS \"QUANTIDADE\", {FN CONVERT(SUM(p.valortotal), SQL_FLOAT)} AS \"VOLUME_VENDAS\", {FN CONVERT(SUM(p.valortotal)/COUNT(p.numeropedido),SQL_FLOAT)} AS \"VALOR_MEDIO_PEDIDO\" FROM zw14vped p WHERE p.situacao = 'Finalizado' AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-73049, {D '2001-01-01'})} BETWEEN {TS '" + Indicadores.periodo.inicio + "'} AND {TS '" + Indicadores.periodo.fim + "'} GROUP BY p.dataemiss ORDER BY p.dataemiss";
  },

  valorMedioDoPedido : function(){
    return "SELECT {FN CONVERT(SUM(p.valortotal)/COUNT(p.numeropedido),SQL_FLOAT)} AS \"VALOR_MEDIO_PEDIDO\" FROM zw14vped p WHERE p.situacao = 'Finalizado' AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-73049, {D '2001-01-01'})} BETWEEN {TS '" + Indicadores.periodo.inicio + "'} AND {TS '" + Indicadores.periodo.fim + "'}";
  },

  mediaDiariaDePedidos : function(qtdDias){
    return "SELECT COUNT(p.numeropedido)/" + qtdDias + " AS \"MEDIA_DIARIA_PEDIDOS\" FROM zw14vped p WHERE p.situacao = 'Finalizado' AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-73049, {D '2001-01-01'})} BETWEEN {TS '" + Indicadores.periodo.inicio + "'} AND {TS '" + Indicadores.periodo.fim + "'}";
  },

  numeroPedidosPeriodo : function(){
    return "SELECT COUNT(*) AS \"PEDIDOS_PERIODO\" FROM zw14vped p WHERE p.situacao = 'Finalizado' AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-73049, {D '2001-01-01'})} BETWEEN {TS '" + Indicadores.periodo.inicio + "'} AND {TS '" + Indicadores.periodo.fim + "'}";
  },

  mediaItemsDoPedido : function(numeroPedidos){
    return "SELECT COUNT(*)/" + numeroPedidos + " AS \"MEDIA_ITENS_PEDIDO\" FROM {OJ zw14vpei LEFT OUTER JOIN zw14vped ON zw14vped.numeropedido=zw14vpei.numeropedido} WHERE zw14vped.situacao = 'Finalizado' AND {FN TIMESTAMPADD (SQL_TSI_DAY, zw14vped.dataemiss-73049, {D '2001-01-01'})} BETWEEN {TS '" + Indicadores.periodo.inicio + "'} AND {TS '" + Indicadores.periodo.fim + "'}";
  },

  executar : function(sql){
    var _data;

    $.post(
      '/api/statements',
      JSON.stringify({"statement": statement})
    )
    .done(function(data){
      _data = data;
    });

    return _data;
  }
};

var Dashboard = {

  renderGraph : function(data){
    var labels   = [];
    var datasets = [];
    var valores  = { total : [], media : [] };
    var dia;
    var data;

    if(data.records === 0 ){
      $(".alert").remove();
      var message = "Não encontramos nenhum dado para esse periodo";
      $(".container").prepend('<div class="alert alert-dismissable alert-danger"><button type="button" class="close" data-dismiss="alert">×</button><strong>Oh snap! </strong>'+message+'</div>');
      return;
    }

    $.each(data.rows, function(el, val){
      data = val[0].split('-');
      dia  = data[2] + '/' + data[1];

      labels.push(dia);
      valores.total.push(val[3]);
      valores.media.push(val[2]);
    });

    data = {
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
      scaleOverride: true,
      scaleLabel: "R$ <%=value%>",
      scaleSteps: 5,
      scaleStepWidth: 10000,
      scaleStartValue : 0,
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
      datasetStrokeWidth : 1,
      datasetFill : true,
      tooltipTemplate : "<%= datasetLabel %>: R$ <%= value %>",
    };

    var ctx = $("#volume-vendas").get(0).getContext("2d");
    var myLineChart = new Chart(ctx).Line(data, options);
  },

  /**
   * @var statement query a ser executada
   **/
  getStatement : function(statement){
    return $.post(
      '/api/statements',
      JSON.stringify({"statement": statement})
    )
    .fail(function(err){
      $(".alert").remove();
      var message = getErrorMessage(err);
      $(".container").prepend('<div class="alert alert-dismissable alert-danger"><button type="button" class="close" data-dismiss="alert">×</button><strong>Oh snap! </strong>'+message+'</div>');
    })

  },

  loader : function(container){
    var container = container || '.grafico-content';
    var loader    = $(container).find('.loader');
    $(loader).stop().fadeToggle();
  },

  loadDaterangepicker : function(){
    $('#reportrange').daterangepicker(
      {
        ranges: {
          'Hoje': [moment(), moment()],
          'Ontem': [moment().subtract(1,'days'), moment().subtract(1,'days')],
          'Últimos 7 Dias': [moment().subtract(6,'days'), moment()],
          'Últimos 30 Dias': [moment().subtract(29,'days'), moment()],
          'Este Mês': [moment().startOf('month'), moment().endOf('month')],
          'Último Mês': [moment().subtract(1,'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        },
        startDate: moment().subtract(29,'days'),
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

          Indicadores.periodo = {
            inicio : start.format("YYYY-MM-DD 00:00:00"),
            fim    : end.format("YYYY-MM-DD 00:00:00"),
          };

          $('.data-container .data-atual').html(start.format('MMMM/YYYY'));
          $('.data-container .data-especifica').html(start.format('D') + ' até ' + end.format('D'));

          $('#reportrange span.text').html(start.format('D [de] MMMM, YYYY') + ' - ' + end.format('D [de] MMMM, YYYY'));
      }
    );
  },

  renderIndicador : function(container, qtd){
    $(container).find('.qtd').html(qtd);
  },

  init : function(){
    Dashboard.loadDaterangepicker();
    /* @todo setar o estado inicial do periodo */

    // Dashboard.getStatement('.grafico-content', Indicadores.volumeVendasDiario(), Dashboard.renderGraph);

    var statement = Indicadores.mediaDiariaDePedidos(22);
    $.when(Dashboard.getStatement(statement)).done(function(data){
      var media = data.rows[0][0] || 0;
      Dashboard.renderIndicador('.media-diaria-de-pedidos', media);
    });

    statement = Indicadores.valorMedioDoPedido();
    $.when(Dashboard.getStatement(statement)).done(function(data){
      var media = data.rows[0][0] || 0;
      Dashboard.renderIndicador('.valor-medio-do-pedido', media);
    });

    statement = Indicadores.numeroPedidosPeriodo();
    $.when(Dashboard.getStatement(statement)).done(function(data){

      var media = data.rows[0][0] || 0;
      statement = Indicadores.mediaItemsDoPedido(data.num);
      Dashboard.renderIndicador('.valor-medio-do-pedido', media);

    });

    // Dashboard.getStatement('.valor-medio-do-pedido', Indicadores.valorMedioDoPedido(), Dashboard.renderValorMedioDoPedido);
    // Dashboard.getStatement('.valor-medio-do-pedido', Indicadores.mediaItemsDoPedido(), Dashboard.renderMediaItemsDoPedido);
  }

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
