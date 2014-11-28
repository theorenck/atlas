moment.locale('pt-br');
var timer;

var API = { address : "http://localhost:3000/api" };

var Indicadores = {

  situacao : "Finalizado",

  items : {
    "volumeVendasTotal" : false
  },

  periodo : {
    inicio    : (moment({ day: 30, month : 10, year : 2013 }).subtract(29,'days').format("YYYY-MM-DD 00:00:00")),
    fim       : (moment({ day: 30, month : 10, year : 2013 }).format("YYYY-MM-DD 00:00:00")),
    duracao   : function(grandeza) {
      var grandeza  = grandeza || 'days';
      var fim       = moment(Indicadores.periodo.fim);
      var inicio    = moment(Indicadores.periodo.inicio);
      var diferenca = fim.diff(inicio,grandeza);
      return diferenca + 1;
    },
  },

  volumeVendasTotal : function(){
    return "SELECT {FN CONVERT(SUM(p.valortotal), SQL_FLOAT)} AS \"VOLUME_VENDAS\" FROM zw14vped p WHERE p.situacao = '" + Indicadores.situacao + "'AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-72687, {D '2000-01-01'})} BETWEEN {TS '" + Indicadores.periodo.inicio + "'} AND {TS '" + Indicadores.periodo.fim + "'}";
  },

  volumeVendasDiario : function(){
    return "SELECT {FN CONVERT({FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-72687, {D '2000-01-01'})}, SQL_DATE)} AS \"DATA_EMISSAO\", COUNT(p.numeropedido) AS \"QUANTIDADE\", {FN CONVERT(SUM(p.valortotal), SQL_FLOAT)} AS \"VOLUME_VENDAS\", {FN CONVERT(SUM(p.valortotal-p.valordescontogeral), SQL_FLOAT)} AS \"VOLUME_VENDAS_LIQUIDO\", {FN CONVERT(SUM(p.valortotal)/COUNT(p.numeropedido),SQL_FLOAT)} AS \"VALOR_MEDIO_PEDIDO\"FROM zw14vped p WHERE p.situacao = '" + Indicadores.situacao + "'AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-72687, {D '2000-01-01'})} BETWEEN {TS '" + Indicadores.periodo.inicio + "'} AND {TS '" + Indicadores.periodo.fim + "'} GROUP BY p.dataemiss ORDER BY p.dataemiss";
  },

  valorMedioDoPedido : function(){
    return "SELECT {FN CONVERT(SUM(p.valortotal)/COUNT(p.numeropedido),SQL_FLOAT)} AS \"VALOR_MEDIO_PEDIDO\" FROM zw14vped p WHERE p.situacao = '" + Indicadores.situacao + "' AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-72687, {D '2000-01-01'})} BETWEEN {TS '" + Indicadores.periodo.inicio + "'} AND {TS '" + Indicadores.periodo.fim + "'}";
  },

  mediaDiariaDePedidos : function(){
    return "SELECT COUNT(p.numeropedido)/" + Indicadores.periodo.duracao() + " AS \"MEDIA_DIARIA_PEDIDOS\" FROM zw14vped p WHERE p.situacao = '" + Indicadores.situacao + "' AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-72687, {D '2000-01-01'})} BETWEEN {TS '" + Indicadores.periodo.inicio + "'} AND {TS '" + Indicadores.periodo.fim + "'}";
  },

  numeroPedidosPeriodo : function(){
    return "SELECT COUNT(*) AS \"PEDIDOS_PERIODO\" FROM zw14vped p WHERE p.situacao = '" + Indicadores.situacao + "' AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-72687, {D '2000-01-01'})} BETWEEN {TS '" + Indicadores.periodo.inicio + "'} AND {TS '" + Indicadores.periodo.fim + "'}";
  },

  mediaItemsDoPedido : function(numeroPedidos){
    return "SELECT COUNT(*)/" + numeroPedidos + " AS \"MEDIA_ITENS_PEDIDO\" FROM {OJ zw14vpei LEFT OUTER JOIN zw14vped ON zw14vped.numeropedido=zw14vpei.numeropedido} WHERE zw14vped.situacao = '" + Indicadores.situacao + "' AND {FN TIMESTAMPADD (SQL_TSI_DAY, zw14vped.dataemiss-72687, {D '2000-01-01'})} BETWEEN {TS '" + Indicadores.periodo.inicio + "'} AND {TS '" + Indicadores.periodo.fim + "'}";
  },

  produtosMaisVendidos : function(){
    return "SELECT I.CODIGO AS \"CODIGO\", I.DESCRICAO AS \"DESCRICAO\", SUM(I.QUANTIDADE) AS \"QUANTIDADE\", {FN TRUNCATE({FN ROUND(AVG(I.PRECOUNIT),2)},2)} AS \"PRECO_MEDIO\", {FN CONVERT({FN TRUNCATE({FN ROUND(SUM(I.VALOR),2)},2)}, SQL_FLOAT)} AS \"TOTAL\" FROM {OJ ZW14VPEI I JOIN ZW14VPED V ON V.NUMEROPEDIDO = I.NUMEROPEDIDO } WHERE V.SITUACAO = '" + Indicadores.situacao + "' AND {FN TIMESTAMPADD (SQL_TSI_DAY, V.DATAEMISS-72687, {D '2000-01-01'})} BETWEEN {TS '" + Indicadores.periodo.inicio + "'} AND {TS '" + Indicadores.periodo.fim + "'} GROUP BY I.CODIGO, I.DESCRICAO ORDER BY 1";
  },

  clientesMaisCompraram : function(){
    return "SELECT V.NOMECLIENTE AS \"CLIENTE\", {FN CONVERT({FN ROUND(SUM(V.VALORTOTALGERAL),2)},SQL_FLOAT)} AS \"TOTAL\" FROM ZW14VPED V WHERE V.SITUACAO = '" + Indicadores.situacao + "' AND {FN TIMESTAMPADD (SQL_TSI_DAY, V.DATAEMISS-72687, {D '2000-01-01'})} BETWEEN {TS '" + Indicadores.periodo.inicio + "'} AND {TS '" + Indicadores.periodo.fim + "'} GROUP BY V.NOMECLIENTE ORDER BY 1";
  }

};

var Dashboard = {

  renderGraph : function(data){
    var valores    = Dashboard.prepareDataset(data.rows);
    valores.labels = valores.labels.length > 31 ? false : valores.labels;

    $('#volume-vendas').highcharts({
      colors : ['#3498DB', "#16A085"],
      chart: {
        type: 'areaspline',
        zoomType : 'x',
        panning: true,
        panKey: 'shift',
        resetZoomButton: {
          theme: {
            fill: '#2c3e50',
            stroke: '#2c3e50',
            style: {
              color: 'white',
            },
            r: 0,
            states: {
              hover: {
                fill: '#1a242f',
                stroke: '#2c3e50',
                style: {
                  color: 'white',
                  cursor: "pointer"
                }
              }
            }
          }
        }
      },
      title : {
        text : "<h3>Volume de vendas diário</h3>",
        useHtml : true,
        style : {
          fontFamily : "Lato, 'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize : '19px'
        }
      },
      legend: {
          layout: 'vertical',
          align: 'left',
          verticalAlign: 'top',
          x: 150,
          y: 100,
          floating: true,
          borderWidth: 1,
          backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF'
      },
      xAxis: {
          categories: valores.labels,
          plotBands: valores.plotBands,
          labels : { maxStaggerLines : 1 }
      },
      yAxis: {
          title: {
              text: false
          }
      },
      tooltip: {
          shared: true,
          valuePreffix: 'R$ '
      },
      credits: {
        enabled: false
      },
      plotOptions: {
        areaspline: {
          fillOpacity: 0.5
        }
      },
      series: [
        { name: 'Volume de vendas diário', data : valores.volumeVendas},
      ]
    });

  },

  renderPie : function(el, dataset, colors, title){
    var serie    = 'Quantidade';

    $(el).highcharts({
      colors : colors,
      // colors : ["rgb(16, 76, 69)", "rgb(18, 104, 92)", "rgb(20, 132, 115)", "rgb(22, 160, 133)", "rgb(24, 188, 156)", "rgb(26, 216, 179)", "rgb(28, 244, 202)"],
      chart: {
        type: 'pie',
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false
      },
      credits: {
        enabled: false
      },
      legend : false,
      plotOptions: {
        pie: {
          borderColor: '#FFF',
          innerSize: '60%',
          dataLabels: {
            enabled: false
          }
        }
      },
      title: {
        text: title,
        useHtml : true,
      },
      tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
      },
      series: [{
        type: 'pie',
        name: serie,
        data: dataset
      }]
    },
    function(chart) {
      var xpos = '50%';
      var ypos = '53%';
      var circleradius = 102;

      chart.renderer.circle(xpos, ypos, circleradius).attr({
          fill: '#fff'
      }).add();
    });

  },

  prepareDataset : function(rows){
    console.log(rows);
    var dataSet   = [];

    var dataAtual = moment(Indicadores.periodo.inicio).format("YYYY-MM-DD");
    var dataFinal = moment(Indicadores.periodo.fim).format("YYYY-MM-DD");

    var valores   = {
      valorMedioDoPedido : [],
      volumeVendasTotal  : [],
      volumeVendas       : [],
      labels             : [],
      plotBands          : []
    };

    /**
     * Procura nas linhas se existe valor para todos os dias,
     * se não existir insere a data e valor zero no array das linhas
     */
    while(dataAtual <= dataFinal){
      var find = _.find(rows, function(el) {
        return (el[0] === dataAtual);
      });

      find === undefined ? dataSet.push([dataAtual,0,0,0,0]) : dataSet.push(find);

      dataAtual = moment(dataAtual).add(1, 'day').format("YYYY-MM-DD");
    }


    $.each(dataSet, function(el, val){
      data      = val[0].split('-');
      diaSemana = moment(val[0]).format('dd');

      valores.labels.push(diaSemana + ' ' + data[2]);
      valores.volumeVendas.push(val[2]);
      valores.valorMedioDoPedido.push(val[4]);

      if (diaSemana === 'sáb') {
        valores.plotBands.push({
          from: el - 0.5,
          to: el + 1.5,
          color: 'rgba(192, 192, 192, .2)'
        });
      }

    });

    return valores;

  },

  /**
   * @var statement query a ser executada
   **/
  getStatement : function(statement){
    return $.ajax({
      type: "POST",
      contentType: "application/json",
      url: API.address + '/statements',
      data: JSON.stringify({"statement": statement})
    })
    .fail(function(err){
      $(".container > .alert").remove();
      var message = getErrorMessage(err);
      $(".container").prepend('<div data- class="alert alert-dismissable alert-danger"><button type="button" class="close" data-dismiss="alert">×</button><strong>Oh snap! </strong>'+message+'</div>');
      if (err.status === 0) {
        verifyServer();
      };
    })

  },

  /**
   * @var container el que contém o loader
   * @showHide "show" ou "hide", default pra "show", força o status do loader
   */
  loader : function(container, showHide){
    var container  = container || '.container';
    var loader     = $(container).find('.loader');
    var forceReset = showHide || 'show';
    var opacity    = showHide === 'hide' ? 0 : 1;

    $(loader).finish().animate({ opacity: opacity }, function(){
      opacity == 1 ? $(this).show() : $(this).hide();
    });
  },

  initDaterangepicker : function(){
    $('#reportrange').daterangepicker(
      {
        ranges: {
          'Hoje': [moment(), moment()],
          'Ontem': [moment().subtract(1,'days'), moment().subtract(1,'days')],
          'Últimos 7 Dias': [moment().subtract(6,'days'), moment()],
          'Últimos 30 Dias': [moment().subtract(29,'days'), moment()],
          'Últimos 90 Dias': [moment().subtract(89,'days'), moment()],
          'Este Mês': [moment().startOf('month'), moment().endOf('month')],
          'Último Mês': [moment().subtract(1,'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        },
        format : 'DD/MM/YYYY',
        showDropdowns : true,
        startDate: moment({year : 2013,month : 10, day : 1}),
        endDate: moment({year : 2013,month : 10, day : 30}),
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
      function(start, end, range) {
          var text;
          if (range !== undefined && range !== "Personalizado") {
            text = range;
          }else{
            var formato = "D [de] MMMM";
            if (start.format('YYYY') === end.format('YYYY')) {
              if (start.format('MMMM') === end.format('MMMM')) {
                formato = 'D';
              };
            }else{
              formato = 'D [de] MMMM, YYYY';
            }
            text = start.format(formato) + '  até  ' + end.format('D [de] MMMM, YYYY');
          }

          $('[data-behaivor=show-actual-date]').html(text);

          Indicadores.periodo.inicio = start.format("YYYY-MM-DD 00:00:00");
          Indicadores.periodo.fim    = end.format("YYYY-MM-DD 00:00:00");

          Dashboard.loader('.container', true);
          Dashboard.fetchIndicadores();
      }
    );
  },

  renderIndicador : function(container, qtd){
    var qtd = NumberHelpers.number_to_human(qtd, {
        labels : { thousand : 'mil', million : 'Mi', billion : 'Bi', trillion : 'Tri' },
        precision: 3,
        significant : true,
        separator : ",",
        delimiter : '.'
    });


    valores = qtd.split(' ');

    if (valores.length > 1)
      $(container).find('.grandeza').html(valores[1]);

    $(container).find('.valor').html(valores[0]);
  },

  fetchIndicadores : function(){

    /* Volume de Vendas Total */
    var statement = Indicadores.volumeVendasTotal();
    Dashboard.getStatement(statement).done(function(data){
      var valor = data.rows[0][0] || 0;
      Indicadores.items.volumeVendasTotal = valor;
      Dashboard.renderIndicador('[data-type=volume-total-de-vendas]', valor);
      Dashboard.loader("[data-type=volume-total-de-vendas]", 'hide');
    });

    /* Média diária de Pedidos */
    statement = Indicadores.mediaDiariaDePedidos();
    Dashboard.getStatement(statement).done(function(data){
      var media = data.rows[0][0] || 0;
      Dashboard.renderIndicador('[data-type=media-diaria-de-pedidos]', media);
      Dashboard.loader("[data-type=media-diaria-de-pedidos]", 'hide');
    });

    /* Valor Médio do Pedido */
    statement = Indicadores.valorMedioDoPedido();
    Dashboard.getStatement(statement).done(function(data){
      var media = data.rows[0][0] || 0;
      Dashboard.renderIndicador('[data-type=valor-medio-do-pedido]', media);
      Dashboard.loader("[data-type=valor-medio-do-pedido]", 'hide');
    });

    /* Média de itens do Pedido */
    statement = Indicadores.numeroPedidosPeriodo();
    Dashboard.getStatement(statement).done(function(data){
      var num   = data.rows[0][0] || 0;
      if (num === 0) {
        Dashboard.renderIndicador('[data-type=media-itens-do-pedido]', 0);
        Dashboard.loader("[data-type=media-itens-do-pedido]", 'hide');
        return;
      }

      statement = Indicadores.mediaItemsDoPedido(num);

      Dashboard.getStatement(statement).done(function(data){
        var media = data.rows[0][0] || 0;
        Dashboard.renderIndicador('[data-type=media-itens-do-pedido]', media);
        Dashboard.loader("[data-type=media-itens-do-pedido]", 'hide');
      });
    });

    /* Média de itens do Pedido */
    statement = Indicadores.volumeVendasDiario();
    Dashboard.getStatement(statement).done(function(data){
      Dashboard.renderGraph(data);
      Dashboard.loader(".grafico-content", 'hide');
    });

    /* Produtos mais vendidos */
    function  chamaMaisVendidos(){
      window.clearInterval(timer);
      statement = Indicadores.produtosMaisVendidos();
      Dashboard.getStatement(statement).done(function(data){
        var colors = ['#1abc9c', "#2ecc71", "#e74c3c", "#e67e22", "#f1c40f", "#3498db", "#9b59b6", "#34495e","#95a5a6", "#ecf0f1" ].reverse();
        var dataset = [];
        var percentual;
        var total    = 0;
        var produtos = (data.rows).sort(function(a,b){
          if (a[4] > b[4])
            return -1;
          if (a[4] < b[4])
            return 1;
          return 0;
        });

        for (var i = 0; i < 9; i++) {
          percentual = (produtos[i][4] * 100) / Indicadores.items.volumeVendasTotal;
          dataset.push([ produtos[i][1].toUpperCase(), percentual ]);
          total += percentual;
        };
        dataset.push([ "OUTROS", 100 - total ]);

        Dashboard.loader('[data-type=produtos-mais-vendidos]', 'hide');
        Dashboard.renderPie('[data-type=produtos-mais-vendidos] .pie', dataset, colors, '<h3>Produtos mais vendidos (%)</h3>');
      });
    }

    /* Clientes que mais Compraram */
    function chamaMaisClientes(){
      statement = Indicadores.clientesMaisCompraram();
      Dashboard.getStatement(statement).done(function(data){
        var colors  = [ "#3498db", '#1abc9c', "#2ecc71", "#e74c3c", "#e67e22", "#f1c40f", "#9b59b6", "#34495e","#95a5a6", "#ecf0f1" ].reverse();
        var dataset = [];
        var percentual;
        var total    = 0;
        var produtos = (data.rows).sort(function(a,b){
          if (a[1] > b[1])
            return -1;
          if (a[1] < b[1])
            return 1;
          return 0;
        });

        for (var i = 0; i < 9; i++) {
          percentual = (produtos[i][1] * 100) / Indicadores.items.volumeVendasTotal;
          dataset.push([ produtos[i][0].toUpperCase(), percentual ]);
          total += percentual;
        };
        dataset.push([ "OUTROS", 100 - total ]);

        Dashboard.loader('[data-type=clientes-mais-compraram]', 'hide');
        Dashboard.renderPie('[data-type=clientes-mais-compraram] .pie', dataset, colors, '<h3>Clientes que mais compraram (%)</h3>');
      });
    }

    timer = window.setInterval(function(){
      if (Indicadores.items.volumeVendasTotal !== false){
        chamaMaisVendidos();
        chamaMaisClientes();
      }
    }, 200);


  },

  init : function(){
    Dashboard.initDaterangepicker();
    $('[data-behaivor=show-actual-date]').html('Últimos 30 dias');
    Dashboard.fetchIndicadores();

    $('#popover').popover({
      html : true,
      placement : "top",
      content : "<p> Também chamado de <strong>Ticket Médio</strong>, vai auxiliá-lo a prever desde o momento do <a href='#'>retorno do investimento</a> até esforços de marketing para aumentar margens de lucro global para o seu negócio. A métrica é simples: cada vez que você faz uma venda, em média, você vai conseguir que o cliente gaste X reais. </p>",
      title : "Valor médio do pedido",
      trigger : 'focus'
    });
  }
};

$(Dashboard.init);

function getErrorMessage(xhr) {
  if (xhr.responseJSON !== undefined &&  xhr.responseJSON.errors !== undefined ) {
    return xhr.responseJSON.errors.replace(/.*\[SoftVelocity Inc\.\]\[TopSpeed ODBC Driver\](\[ISAM\]ISAM)?/,"");
  } else if (xhr.status === 0) {
    return "There was an unexpected error when accessing the server.";
  } else {
    return xhr.statusText;
  }
}

function verifyServer (){
  $.get(API.address + '/ping', function(data) {
      $(".container > .alert").remove();
      var message  = "Estamos de volta :D";
      $(".container").prepend('<div class="alert alert-dismissable alert-success"><button type="button" class="close" data-dismiss="alert">×</button><strong>Oh great! </strong>'+message+'</div>');
      return false;
  }).fail(function(xhr){
    setTimeout(function () {
      verifyServer();
    }, 1500);
  });
}