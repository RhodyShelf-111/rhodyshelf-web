-- Match record_product_drop's grants: a trigger function has no business being
-- reachable as a PostgREST RPC. Supabase's linter flags a SECURITY DEFINER
-- function that anon/authenticated can execute
-- (0028_anon_security_definer_function_executable). Calling it over RPC would
-- error anyway (it returns `trigger`), but the exposed surface is the point.
revoke all on function public.record_product_restock() from public, anon, authenticated;
