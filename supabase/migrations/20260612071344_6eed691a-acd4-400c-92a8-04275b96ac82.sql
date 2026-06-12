
REVOKE EXECUTE ON FUNCTION public.claim_handle(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.enforce_rate_limit(regclass, uuid, interval, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_handle(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enforce_rate_limit(regclass, uuid, interval, integer) TO authenticated, service_role;
