-- Cerrar acceso de escritura directa desde un navegador autenticado.
-- La vieja política INSERT permitía inventar cartas con revision = 1.
-- ensure_player_snapshot() y otras RPC protegidas conservan sus permisos
-- de SECURITY DEFINER y siguen siendo la única vía para escribir inventario.
-- No altera ni elimina snapshots, Auth ni lista de laboratorio.
REVOKE INSERT ON TABLE public.player_snapshots FROM authenticated;
DROP POLICY IF EXISTS player_snapshots_insert_own_first ON public.player_snapshots;
