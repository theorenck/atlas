-- Lista de situacões de pedido

SELECT DISTINCT p.situacao FROM zw14vped p

-- Volume de vendas total do período

SELECT
  {FN CONVERT(SUM(p.valortotal), SQL_FLOAT)} AS "VOLUME_VENDAS"
FROM
  zw14vped p
WHERE
  p.situacao = 'Finalizado'
  AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-72687, {D '2000-01-01'})} BETWEEN {TS '2013-11-01 00:00:00'} AND {TS '2013-11-30 00:00:00'}

-- Volume de vendas de diário

SELECT
  {FN CONVERT({FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-72687, {D '2000-01-01'})}, SQL_DATE)} AS "DATA_EMISSAO",
  COUNT(p.numeropedido) AS "QUANTIDADE",
  {FN CONVERT(SUM(p.valortotal), SQL_FLOAT)} AS "VOLUME_VENDAS",
  {FN CONVERT(SUM(p.valortotal-p.valordescontogeral), SQL_FLOAT)} AS "VOLUME_VENDAS_LIQUIDO",
  {FN CONVERT(SUM(p.valortotal)/COUNT(p.numeropedido),SQL_FLOAT)} AS "VALOR_MEDIO_PEDIDO"
FROM
  zw14vped p
WHERE
  p.situacao = 'Finalizado'
  AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-72687, {D '2000-01-01'})} BETWEEN {TS '2013-11-01 00:00:00'} AND {TS '2013-11-30 00:00:00'}
GROUP BY
  p.dataemiss
ORDER BY
  p.dataemiss

-- Volume de vendas médio do pedido

SELECT
  {FN CONVERT(SUM(p.valortotal)/COUNT(p.numeropedido),SQL_FLOAT)} AS "VALOR_MEDIO_PEDIDO"
FROM
  zw14vped p
WHERE
  p.situacao = 'Finalizado'
  AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-72687, {D '2000-01-01'})} BETWEEN {TS '2013-11-01 00:00:00'} AND {TS '2013-11-30 00:00:00'}

-- Média diária de pedidos (considerar dias úteis (reais/padrão)? apenas dias que houvevenda? total de dias do intervalo apurado?)

SELECT
  {FN CONVERT(COUNT(p.numeropedido)/22,SQL_FLOAT)} AS "MEDIA_DIARIA_PEDIDOS"
FROM
  zw14vped p
WHERE
  p.situacao = 'Finalizado'
  AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-72687, {D '2000-01-01'})} BETWEEN {TS '2013-11-01 00:00:00'} AND {TS '2013-11-30 00:00:00'}

-- Média de itens por pedido

---- Query 1: Identificar o número de pedidos no período

SELECT
  COUNT(*) AS "PEDIDOS_PERIODO"
FROM
  zw14vped p
WHERE
  p.situacao = 'Finalizado'
  AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-72687, {D '2000-01-01'})} BETWEEN {TS '2013-11-01 00:00:00'} AND {TS '2013-11-30 00:00:00'}

---- Query 2: Cálculo do indicador, onde 114 deve ser substituído pelo número de pedidos no período (Query 2: PEDIDOS_PERIODO)

SELECT
  COUNT(*)/114 AS "MEDIA_ITENS_PEDIDO"
FROM
  {OJ zw14vpei LEFT OUTER JOIN zw14vped ON zw14vped.numeropedido=zw14vpei.numeropedido}
WHERE
  zw14vped.situacao = 'Finalizado'
  AND {FN TIMESTAMPADD (SQL_TSI_DAY, zw14vped.dataemiss-72687, {D '2000-01-01'})} BETWEEN {TS '2013-11-01 00:00:00'} AND {TS '2013-11-30 00:00:00'}




-- Volume de Venda por Tipo de Produto Analítico (baseado no histórico deprodutos)
SELECT
  P.CODPRODUTO AS "CODIGO",
  {FN CONVERT({TS '2014-10-01 00:00:00'},SQL_DATE)} AS "PERIODO_INICIO",
  {FN CONVERT({TS '2014-10-31 00:00:00'},SQL_DATE)} AS "PERIODO_FIM",
  P.DESCRICAO1 AS "DESCRICAO",
  P.CODBARRAS AS "CODIGO_BARRAS",
  SUM(H.QUANTIDADE) AS "QUANTIDADE",
  {FN TRUNCATE({FN ROUND(AVG(H.VALORUNITARIOLIQUIDO),2)},2)} AS "PRECO_MEDIO",
  {FN TRUNCATE({FN ROUND(SUM(H.QUANTIDADE * H.VALORUNITARIOLIQUIDO),2)},2)} AS "TOTAL"
FROM
  ZW14PHIS H
JOIN
  ZW14PPRO P
ON
  P.CODPRODUTO = H.CODPRODUTO
WHERE
  H.TIPO = 'S' AND
  P.CODTIPOPRODUTO = 6 AND
  {FN TIMESTAMPADD (SQL_TSI_DAY, H.DATAORIGEM-72687, {D '2000-01-01'})} BETWEEN
  {TS '2014-10-01 00:00:00'} AND {TS '2014-10-31 00:00:00'}
GROUP BY
  P.CODPRODUTO,
  P.CODBARRAS,
  P.DESCRICAO1
ORDER BY
  1

-- Volume de Venda por Tipo de Produto Analítico (baseado nos pedidos finalizados)

SELECT
  i.codigo AS "CODIGO",
  {FN CONVERT({TS '2013-10-01 00:00:00'},SQL_DATE)} AS "PERIODO_INICIO",
  {FN CONVERT({TS '2013-10-31 00:00:00'},SQL_DATE)} AS "PERIODO_FIM",
  i.descricao AS "DESCRICAO",
  SUM(I.QUANTIDADE) AS "QUANTIDADE",
  {FN TRUNCATE({FN ROUND(AVG(i.precounit),2)},2)} AS "PRECO_MEDIO",
  {FN TRUNCATE({FN ROUND(SUM(i.valor),2)},2)} AS "TOTAL"
FROM
  zw14vpei i
JOIN
  zw14vped p
ON
  p.numeropedido = i.numeropedido
WHERE
  i.situacao = 'PED:Finalizado' AND
  {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-72687, {D '2000-01-01'})} BETWEEN
  {TS '2013-10-01 00:00:00'} AND {TS '2013-10-31 00:00:00'}
GROUP BY
  i.codigo,
  i.descricao
ORDER BY
  1


SELECT
    I.CODIGO AS "CODIGO",
    {FN CONVERT({TS '2013-10-01 00:00:00'},SQL_DATE)} AS "PERIODO_INICIO",
    {FN CONVERT({TS '2013-10-31 00:00:00'},SQL_DATE)} AS "PERIODO_FIM",
    I.DESCRICAO AS "DESCRICAO",
    SUM(I.QUANTIDADE) AS "QUANTIDADE",
    {FN TRUNCATE({FN ROUND(AVG(I.PRECOUNIT),2)},2)} AS "PRECO_MEDIO",
    {FN TRUNCATE({FN ROUND(SUM(I.VALOR),2)},2)} AS "TOTAL",         
    (SUM(I.VALOR)/293227.19)*100 AS "PERCENTUAL"
FROM
  {OJ ZW14VPEI I
JOIN
  ZW14VPED V
ON
  V.NUMEROPEDIDO = I.NUMEROPEDIDO }
WHERE
  V.SITUACAO = 'PED:Finalizado' AND
  {FN TIMESTAMPADD (SQL_TSI_DAY, V.DATAEMISS-72687, {D '2000-01-01'})} BETWEEN
  {TS '2013-10-01 00:00:00'} AND {TS '2013-10-31 00:00:00'}
GROUP BY
  I.CODIGO,
  I.DESCRICAO
ORDER BY
  1

-- Clientes que mais compraram no período

SELECT
  V.CODCLIENTE AS "CODIGO",
  V.NOMECLIENTE AS "CLIENTE",
  V.TIPOPESSOACLIENTE AS "TIPO",
  COUNT(*) AS "QUANTIDADE",
  {FN CONVERT({FN TRUNCATE({FN ROUND(SUM(V.VALORTOTALGERAL),2)},2)}, SQL_FLOAT)} AS "TOTAL"
FROM
  ZW14VPED V
WHERE
  V.SITUACAO = 'PED:Finalizado' AND
  {FN TIMESTAMPADD (SQL_TSI_DAY, V.DATAEMISS-72687, {D '2000-01-01'})} BETWEEN
  {TS '2013-10-01 00:00:00'} AND {TS '2013-10-31 00:00:00'}
GROUP BY
  V.CODCLIENTE,
  V.NOMECLIENTE,
  V.TIPOPESSOACLIENTE
ORDER BY
  1


-- RM - ZETACW14OKIXPZW14073