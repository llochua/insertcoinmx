-- Additive release script. Apply and verify separately before publishing the UI.
-- Reads only completed ballots; excludes LAB ballots and the requesting account.
create or replace function private_community.reta_pair_results(p_matches jsonb)
returns table(winner text, loser text, winner_votes bigint, loser_votes bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if p_matches is null or jsonb_typeof(p_matches) is distinct from 'array' then
  raise exception 'Invalid pairs';
 end if;
 if jsonb_array_length(p_matches) not between 1 and 7 then raise exception 'Invalid pair count'; end if;
 if not coalesce((select enabled from private_community.release_gate where key='community_pop'),false) then return; end if;
 if exists(select 1 from jsonb_array_elements(p_matches) m where
  not coalesce(private_community.community_design_valid(m->>'winner'),false) or
  not coalesce(private_community.community_design_valid(m->>'loser'),false) or
  m->>'winner'=m->>'loser') then raise exception 'Invalid pair'; end if;
 return query
 with requested as (
  select m.value->>'winner' as w,m.value->>'loser' as l,m.ordinality as ord
  from jsonb_array_elements(p_matches) with ordinality m
 ), votes as (
  select m.value->>'winner' as w,m.value->>'loser' as l
  from private_community.community_reta_ballots b
  cross join lateral jsonb_array_elements(b.matches) m
  where b.user_id is distinct from auth.uid()
  and not exists(select 1 from private_sync.sync_lab_allowlist a where a.user_id=b.user_id)
 )
 select r.w,r.l,count(*) filter(where v.w=r.w and v.l=r.l),count(*) filter(where v.w=r.l and v.l=r.w)
 from requested r left join votes v on (v.w=r.w and v.l=r.l) or (v.w=r.l and v.l=r.w)
 group by r.ord,r.w,r.l order by r.ord;
end;
$$;
revoke all on function private_community.reta_pair_results(jsonb) from public;
grant execute on function private_community.reta_pair_results(jsonb) to anon,authenticated;

create or replace function public.icmx_reta_pair_results(p_matches jsonb)
returns table(winner text, loser text, winner_votes bigint, loser_votes bigint)
language sql stable security invoker set search_path = ''
as $$ select * from private_community.reta_pair_results(p_matches); $$;
revoke all on function public.icmx_reta_pair_results(jsonb) from public;
grant execute on function public.icmx_reta_pair_results(jsonb) to anon,authenticated;
