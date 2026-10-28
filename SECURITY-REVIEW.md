# Security review

Date: 2026-10-28

## Scope and result

Read-only review of the application code and current deployment-oriented changes, focusing on authentication, authorization, demo data access, API routes, and hardcoded user identifiers.

One high-severity issue remains. Do not treat the application as deployment-ready until the ownership and demo-publication behavior below is addressed.

## Findings

### HIGH — Fixed owner ID and unintended public demo projects

**Files**

- `src/app/api/create_project/route.ts:90-91`
- `src/app/api/projects/[id]/route.ts:4-6,30,112`
- `src/app/api/projects/[id]/reports/[reportId]/route.ts:4-6,27`

Project creation assigns every project to a hardcoded Supabase user UUID and sets `is_demo: true`. The project and report deletion APIs also rely on that fixed UUID (or its `NEXT_PUBLIC_TEST_USER_ID` override) instead of the authenticated administrator's identity.

This makes ownership dependent on a legacy test account. Also, because the current anonymous RLS policies expose rows where `is_demo = true`, projects created through this endpoint and their related prompts, reports, and results become visible to every demo visitor. That may publish project content the administrator did not intend to expose.

**Recommended remediation**

1. Use the verified Supabase Auth administrator's user ID for `projects.user_id`; remove the hardcoded UUID and `NEXT_PUBLIC_TEST_USER_ID` fallbacks.
2. Make demo publication intentional. New projects should not become public automatically unless that is the explicit desired behavior. If private projects are supported, add authenticated admin read policies and ensure the server-side admin UI reads them under the authenticated session.
3. Keep anonymous `SELECT` policies limited to explicitly approved demo projects and their related rows.
4. Track the RLS schema and policies in Supabase migrations so the security configuration can be reproduced and reviewed with the repository.

## Deployment notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` and AI provider credentials server-only; service-role requests bypass RLS.
- Configure `ADMIN_EMAIL`, Supabase URL and public anon key, service-role key, and the AI provider variables in the deployment environment.
- Confirm that only intentionally public demo records have `is_demo = true` before enabling public access.
