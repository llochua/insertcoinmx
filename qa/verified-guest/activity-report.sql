-- Consulta administrativa de solo lectura. Indicadores, nunca compuertas.
-- No contiene identificadores ni se expone al cliente.
SELECT utc_day, admitted AS new_guest_players,
 CASE WHEN admitted >= 1000 THEN 'review_capacity'
      WHEN admitted >= 500 THEN 'review_usage'
      WHEN admitted >= 100 THEN 'review_activity'
      ELSE 'normal' END AS review_level
FROM private_sync.guest_admission_daily
ORDER BY utc_day DESC LIMIT 30;
