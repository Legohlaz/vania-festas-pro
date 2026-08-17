-- This legacy internal routine is not called by the application.
-- It must not be executable by visitors or authenticated users.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
