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
  AND {FN TIMESTAMPADD (SQL_TSI_DAY, p.dataemiss-73049, {D '2001-01-01'})} BETWEEN {TS '2014-01-01 00:00:00'} AND {TS '2014-01-31 00:00:00'}
GROUP BY 
  p.dataemiss
ORDER BY 
  p.dataemiss