moment.locale('pt-br');

var Api = { address : "http://localhost:4567/api" };
var Indicadores = {

  situacao : "PED:Finalizado",

  periodo : {
    inicio    : (moment({ day: 30, month : 10, year : 2013 }).subtract(29,'days').format("YYYY-MM-DD 00:00:00")),
    fim       : (moment({ day: 30, month : 10, year : 2013 }).format("YYYY-MM-DD 00:00:00")),
    duracao : function(grandeza) {
      var grandeza  = grandeza || 'days';
      var fim       = moment(Indicadores.periodo.fim);
      var inicio    = moment(Indicadores.periodo.inicio);
      var diferenca = fim.diff(inicio,grandeza);
      return diferenca+1;
    }
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

};

var Dashboard = {

  renderGraph : function(data){
    if(data.records === 0 ){
      $(".alert").remove();
      var message = "Não encontramos nenhum dado para esse periodo";
      $(".container").prepend('<div class="alert alert-dismissable alert-danger"><button type="button" class="close" data-dismiss="alert">×</button><strong>Oh snap! </strong>'+message+'</div>');
      return;
    }

    var valores    = Dashboard.prepareDataset(data.rows);
    valores.labels = valores.labels.length > 31 ? false : valores.labels;

    $('#volume-vendas').highcharts({
      colors : ['#3498db'],
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
        // text : "<h3>Volume de vendas diário</h3>",
        text : false,
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
        // { name: 'Valor Médio do Pedido', data : valores.valorMedioDoPedido}
      ]
    });

  },

  renderPie1 : function(el){

    if (el === '#pie1') {
      title = 'Quantidade Vendas Produto (%)';
      serie = 'Quantidade';
      data = [
          ['LUSTRE 36LP-10W.BIP. METAL',   45.0],
          ['ARANDELA 1LP-25W.HALOP. EM ALUMINIO COM VIDRO',       26.8],
          ['PENDENTE 1LP-BIPINO C/CUPULA EM VIDRO BRANCO',    8.5],
          ['ABAJOUR 1-LP-HALOPIN METAL C/VD.FOSCO',     6.2],
          ['APLIQUE 2LP-E14 QUADRO OXIDADO',   0.7]
      ];
    }
    else if (el === '#pie2') {
      title = 'Volume de vendas por Cliente';
      serie = 'Quantidade';
      data = [
          ['LUSTRE 36LP-10W.BIP. METAL',   45.0],
          ['ARANDELA 1LP-25W.HALOP. EM ALUMINIO COM VIDRO',       26.8],
          ['PENDENTE 1LP-BIPINO C/CUPULA EM VIDRO BRANCO',    8.5],
          ['ABAJOUR 1-LP-HALOPIN METAL C/VD.FOSCO',     6.2],
          ['APLIQUE 2LP-E14 QUADRO OXIDADO',   0.7]
      ];
    }
    else {
      title = 'Volume de vendas por Vendedor';
      serie = 'Quantidade';
      data = [
          ['LUSTRE 36LP-10W.BIP. METAL',   45.0],
          ['ARANDELA 1LP-25W.HALOP. EM ALUMINIO COM VIDRO',       26.8],
          ['PENDENTE 1LP-BIPINO C/CUPULA EM VIDRO BRANCO',    8.5],
          ['ABAJOUR 1-LP-HALOPIN METAL C/VD.FOSCO',     6.2],
          ['APLIQUE 2LP-E14 QUADRO OXIDADO',   0.7]
      ];
    }

    $(el).highcharts({
        chart: {
            plotBackgroundColor: null,
            plotBorderWidth: null,
            plotShadow: false
        },
        credits: {
          enabled: false
        },
        legend: false,
        title: {
            text: title
        },
        tooltip: {
            pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
               dataLabels: {
                   enabled: false
               },
                showInLegend: true
            }
        },
        series: [{
            type: 'pie',
            name: serie,
            data: data
        }]
    });
  },

  prepareDataset : function(rows){
    var dataSet   = [];

    var dataAtual = moment(Indicadores.periodo.inicio).format("YYYY-MM-DD");
    var dataFinal = moment(Indicadores.periodo.fim).format("YYYY-MM-DD");

    var valores   = {
      valorMedioDoPedido : [],
      volumeVendasTotal : [],
      volumeVendas : [],
      labels : [],
      plotBands : []
    };

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
    return $.post(
      Api.address + '/statements',
      JSON.stringify({"statement": statement})
    )
    .fail(function(err){
      $(".container > .alert").remove();
      var getErrorMessagege = getErrorMessage(err);
      $(".container").prepend('<div data- class="alert alert-dismissable alert-danger"><button type="button" class="close" data-dismiss="alert">×</button><strong>Oh snap! </strong>'+message+'</div>');
    })

  },

  loader : function(container){
    var container = container || '.grafico-content';
    var loader    = $(container).find('.loader');
    $(loader).stop().fadeToggle();
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

          $('#reportrange span.text').html(text);

          Indicadores.periodo.inicio = start.format("YYYY-MM-DD 00:00:00");
          Indicadores.periodo.fim    = end.format("YYYY-MM-DD 00:00:00");

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
      var media = data.rows[0][0] || 0;
      Dashboard.renderIndicador('[data-type=volume-total-de-vendas]', media);
    });

    /* Média diária de Pedidos */
    var statement = Indicadores.mediaDiariaDePedidos();
    Dashboard.getStatement(statement).done(function(data){
      var media = data.rows[0][0] || 0;
      Dashboard.renderIndicador('[data-type=media-diaria-de-pedidos]', media);
    });

    /* Valor Médio do Pedido */
    statement = Indicadores.valorMedioDoPedido();
    Dashboard.getStatement(statement).done(function(data){
      var media = data.rows[0][0] || 0;
      Dashboard.renderIndicador('[data-type=valor-medio-do-pedido]', media);
    });

    /* Média de itens do Pedido */
    statement = Indicadores.numeroPedidosPeriodo();
    Dashboard.getStatement(statement).done(function(data){
      var num   = data.rows[0][0] || 0;
      if (num === 0) { Dashboard.renderIndicador('[data-type=media-itens-do-pedido]', 0); return; };
      statement = Indicadores.mediaItemsDoPedido(num);

      Dashboard.getStatement(statement).done(function(data){
        var media = data.rows[0][0] || 0;
        Dashboard.renderIndicador('[data-type=media-itens-do-pedido]', media);
      });
    });

    /* Média de itens do Pedido */
    statement = Indicadores.volumeVendasDiario();
    Dashboard.getStatement(statement).done(function(data){
      Dashboard.renderGraph(data);
    });

  },

  init : function(){
    Dashboard.initDaterangepicker();
    $('#reportrange span.text').html('Últimos 30 dias');
    Dashboard.fetchIndicadores();
    Dashboard.renderPie1('#pie1');
    Dashboard.renderPie1('#pie2');
    Dashboard.renderPie1('#pie3');

    /* @todo Dividir a qtd de dias pelo periodo */

    // var a = moment('1800-12-29');
    // var b = moment('2000-01-01');
    // var days = a.diff(b, 'days');


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