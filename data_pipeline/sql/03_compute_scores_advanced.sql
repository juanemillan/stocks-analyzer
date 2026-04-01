create or replace function compute_scores_advanced()
returns void
language sql
security definer
as $$
-- -----------------------------------------------------------------------------
-- compute_scores_advanced
--   - Calcula mom_1w/1m/3m/6m/1y, rs_spy (3m), liq_score y vol_20d
--   - Normaliza con percent_rank()
--   - Repondera dinámicamente si faltan señales
--   - Toma pesos/buckets desde tablas de config si existen; si no, usa defaults
--   - Upsert en scores_daily
-- -----------------------------------------------------------------------------
with
-- Últimas ~370 ruedas por símbolo (cubre 1y con buffer)
last_dates as (
  select symbol, max(date) as last_date
  from prices_daily
  group by symbol
),
px as (
  select p.*
  from prices_daily p
  join last_dates ld on ld.symbol = p.symbol
  where p.date between ld.last_date - interval '370 days' and ld.last_date
),

-- Base con close previo para log-returns
base as (
  select
    symbol, date, open, high, low, close, volume,
    lag(close) over (partition by symbol order by date) as prev_close
  from px
),

-- Momenta simples y medias móviles/volúmenes (NO anidar ventanas)
rets as (
  select
    symbol, date, close, volume, prev_close,
    (close/lag(close, 5)   over (partition by symbol order by date) - 1.0) as mom_1w,
    (close/lag(close, 21)  over (partition by symbol order by date) - 1.0) as mom_1m,
    (close/lag(close, 63)  over (partition by symbol order by date) - 1.0) as mom_3m,
    (close/lag(close, 126) over (partition by symbol order by date) - 1.0) as mom_6m,
    (close/lag(close, 252) over (partition by symbol order by date) - 1.0) as mom_1y,
    avg(close)  over (partition by symbol order by date rows between 19  preceding and current row)  as sma20,
    avg(close)  over (partition by symbol order by date rows between 49  preceding and current row)  as sma50,
    avg(close)  over (partition by symbol order by date rows between 199 preceding and current row)  as sma200,
    avg(volume) over (partition by symbol order by date rows between 19  preceding and current row)  as avg_vol20,
    case when close > 0 and prev_close > 0 then ln(close) - ln(prev_close) else null end as log_ret
  from base
),

-- Métricas derivadas (volatilidad 20d)
metrics as (
  select
    symbol, date, close, volume,
    mom_1w, mom_1m, mom_3m, mom_6m, mom_1y,
    sma20, sma50, sma200, avg_vol20,
    stddev_samp(log_ret) over (
      partition by symbol order by date
      rows between 19 preceding and current row
    ) as vol_20d
  from rets
),

-- Tomar la fila más reciente por símbolo
last_row as (
  select distinct on (symbol)
    symbol, date, close,
    mom_1w, mom_1m, mom_3m, mom_6m, mom_1y,
    sma20, sma50, sma200, avg_vol20, vol_20d
  from metrics
  order by symbol, date desc
),

-- SPY para RS (puedes cambiar a 1m si prefieres)
spy as (
  select lr.mom_3m as spy_mom_3m
  from last_row lr
  where lr.symbol = 'SPY'
  limit 1
),

-- Señales “raw” en la fecha más reciente
raw as (
  select
    lr.symbol, lr.date, lr.close,
    lr.mom_1w, lr.mom_1m, lr.mom_3m, lr.mom_6m, lr.mom_1y,
    -- Fuerza relativa vs SPY (3m)
    (lr.mom_3m - coalesce((select spy_mom_3m from spy), 0)) as rs_spy,
    -- Liquidez (escala 0..1 con umbrales 100k–2M)
    case
      when lr.avg_vol20 is null then null
      when lr.avg_vol20 >= 2000000 then 1.0::double precision
      when lr.avg_vol20 <= 100000  then 0.0::double precision
      else (lr.avg_vol20::double precision - 100000.0::double precision) / 1900000.0::double precision
    end as liq_score,
    lr.vol_20d
  from last_row lr
),

-- Normalización (0..1) por universo actual
norms as (
  select
    r.*,
    percent_rank() over (order by r.mom_1m)  as pr_mom1m,
    percent_rank() over (order by r.mom_3m)  as pr_mom3m,
    percent_rank() over (order by r.rs_spy)  as pr_rsspy,
    percent_rank() over (order by r.vol_20d) as pr_vol
  from raw r
),

-- Pesos activos (defaults fijos)
active_w as (
  select
    0.40::double precision as w_mom1m,
    0.20::double precision as w_mom3m,
    0.20::double precision as w_rsspy,
    0.10::double precision as w_liq,
    0.10::double precision as w_volinv
),

-- Score con reponderación dinámica (si falta una señal, el resto toma el peso)
scored as (
  select
    n.symbol, n.date,
    n.mom_1w, n.mom_1m, n.mom_3m, n.mom_6m, n.mom_1y,
    n.rs_spy, n.liq_score,
    case when n.pr_vol is null then 0.5::double precision else 1.0::double precision - n.pr_vol end as vol_inv,
    -- suma de pesos efectivos (vol_inv siempre cuenta)
    (
      (select w_mom1m  from active_w) * (case when n.pr_mom1m is not null then 1.0::double precision else 0.0::double precision end) +
      (select w_mom3m  from active_w) * (case when n.pr_mom3m is not null then 1.0::double precision else 0.0::double precision end) +
      (select w_rsspy  from active_w) * (case when n.pr_rsspy is not null then 1.0::double precision else 0.0::double precision end) +
      (select w_liq    from active_w) * (case when n.liq_score  is not null then 1.0::double precision else 0.0::double precision end) +
      (select w_volinv from active_w)
    ) as w_sum_effective,
    -- numerador
    (
      (select w_mom1m  from active_w) * coalesce(n.pr_mom1m, null) +
      (select w_mom3m  from active_w) * coalesce(n.pr_mom3m, null) +
      (select w_rsspy  from active_w) * coalesce(n.pr_rsspy, null) +
      (select w_liq    from active_w) * coalesce(n.liq_score::double precision, null) +
      (select w_volinv from active_w) * coalesce(1.0::double precision - n.pr_vol, 0.5::double precision)
    ) / nullif((
      (select w_mom1m  from active_w) * (case when n.pr_mom1m is not null then 1.0::double precision else 0.0::double precision end) +
      (select w_mom3m  from active_w) * (case when n.pr_mom3m is not null then 1.0::double precision else 0.0::double precision end) +
      (select w_rsspy  from active_w) * (case when n.pr_rsspy is not null then 1.0::double precision else 0.0::double precision end) +
      (select w_liq    from active_w) * (case when n.liq_score  is not null then 1.0::double precision else 0.0::double precision end) +
      (select w_volinv from active_w)
    ), 0.0::double precision) as final_score_adv
  from norms n
),

-- Bucket (defaults fijos)
with_bucket as (
  select
    s.*,
    case
      when s.final_score_adv >= 0.70 then 'Alta Convicción'
      when s.final_score_adv >= 0.50 then 'Vigilancia'
      else 'Descartar'
    end as bucket_name
  from scored s
)

-- Upsert final
insert into scores_daily
  (symbol, date,
   mom_1w, mom_1m, mom_3m, mom_6m, mom_1y,
   rs_spy, liq_score, tech_trend, final_score, bucket, notes)
select
  wb.symbol, wb.date,
  wb.mom_1w, wb.mom_1m, wb.mom_3m, wb.mom_6m, wb.mom_1y,
  wb.rs_spy, wb.liq_score,
  null as tech_trend,
  wb.final_score_adv as final_score,
  wb.bucket_name as bucket,
  'ADV' as notes
from with_bucket wb
where wb.symbol <> 'SPY'
on conflict (symbol, date) do update set
  mom_1w      = excluded.mom_1w,
  mom_1m      = excluded.mom_1m,
  mom_3m      = excluded.mom_3m,
  mom_6m      = excluded.mom_6m,
  mom_1y      = excluded.mom_1y,
  rs_spy      = excluded.rs_spy,
  liq_score   = excluded.liq_score,
  final_score = excluded.final_score,
  bucket      = excluded.bucket,
  notes       = excluded.notes;
$$;
