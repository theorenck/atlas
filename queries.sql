-- Volume de vendas de diário

SELECT 
  {FN CONVERT({FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-73049, {D '2001-01-01'})}, SQL_DATE)} AS "DATA_EMISSAO", 
  COUNT(p.numeropedido) AS "QUANTIDADE", 
  {FN CONVERT(SUM(p.valortotal), SQL_FLOAT)} AS "VOLUME_VENDAS", 
  {FN CONVERT(SUM(p.valortotal)/COUNT(p.numeropedido),SQL_FLOAT)} AS "VALOR_MEDIO_PEDIDO"
FROM 
  zw14vped p
WHERE 
  p.situacao = 'Finalizado'
  AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-73049, {D '2001-01-01'})} BETWEEN {TS '2013-11-01 00:00:00'} AND {TS '2013-11-30 00:00:00'}
GROUP BY 
  p.dataemiss
ORDER BY 
  p.dataemiss

-- Valor médio do pedido

SELECT 
  {FN CONVERT(SUM(p.valortotal)/COUNT(p.numeropedido),SQL_FLOAT)} AS "VALOR_MEDIO_PEDIDO"
FROM 
  zw14vped p
WHERE 
  p.situacao = 'Finalizado'
  AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-73049, {D '2001-01-01'})} BETWEEN {TS '2013-11-01 00:00:00'} AND {TS '2013-11-30 00:00:00'}

-- Média diária de pedidos (considerar dias úteis (reais/padrão)? apenas dias que houvevenda? total de dias do intervalo apurado?)

SELECT 
  {FN CONVERT(COUNT(p.numeropedido)/22,SQL_FLOAT)} AS "MEDIA_DIARIA_PEDIDOS"
FROM 
  zw14vped p
WHERE 
  p.situacao = 'Finalizado'
  AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-73049, {D '2001-01-01'})} BETWEEN {TS '2013-11-01 00:00:00'} AND {TS '2013-11-30 00:00:00'}

-- Média de itens por pedido

---- Query 1: Identificar o número de pedidos no período

SELECT 
  COUNT(*) AS "PEDIDOS_PERIODO"
FROM 
  zw14vped p
WHERE 
  p.situacao = 'Finalizado'
  AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-73049, {D '2001-01-01'})} BETWEEN {TS '2013-11-01 00:00:00'} AND {TS '2013-11-30 00:00:00'}

---- Query 2: Cálculo do indicador, onde 114 deve ser substituído pelo número de pedidos no período (Query 2: PEDIDOS_PERIODO)

SELECT
  COUNT(*)/114 AS "MEDIA_ITENS_PEDIDO" 
FROM
  {OJ zw14vpei LEFT OUTER JOIN zw14vped ON zw14vped.numeropedido=zw14vpei.numeropedido}
WHERE   
  zw14vped.situacao = 'Finalizado'
  AND {FN TIMESTAMPADD (SQL_TSI_DAY, zw14vped.dataemiss-73049, {D '2001-01-01'})} BETWEEN {TS '2013-11-01 00:00:00'} AND {TS '2013-11-30 00:00:00'}
