-- В демо-версии регистрация пользователей отсутствует; доступны только администратор и анонимный посетитель.
alter table public.projects
    add column if not exists is_demo boolean;

update public.projects
set is_demo = false
where is_demo is null;

alter table public.projects
    alter column is_demo set default false,
    alter column is_demo set not null;

alter table public.projects enable row level security;
alter table public.prompts enable row level security;
alter table public.reports enable row level security;
alter table public.prompt_results enable row level security;

grant select on public.projects, public.prompts, public.reports, public.prompt_results
    to anon, authenticated;
grant insert, update, delete on public.projects, public.prompts, public.reports, public.prompt_results
    to authenticated;

drop policy if exists "Public can read demo projects" on public.projects;
create policy "Public can read demo projects"
    on public.projects
    for select
    to anon
    using (is_demo = true);

drop policy if exists "Authenticated can read owned or demo projects" on public.projects;
create policy "Authenticated can read owned or demo projects"
    on public.projects
    for select
    to authenticated
    using (is_demo = true or user_id = (select auth.uid()));

drop policy if exists "Authenticated can manage owned projects" on public.projects;
create policy "Authenticated can manage owned projects"
    on public.projects
    for all
    to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

drop policy if exists "Public can read demo prompts" on public.prompts;
create policy "Public can read demo prompts"
    on public.prompts
    for select
    to anon
    using (
        exists (
            select 1
            from public.projects p
            where p.id = prompts.project_id
              and p.is_demo = true
        )
    );

drop policy if exists "Authenticated can read owned or demo prompts" on public.prompts;
create policy "Authenticated can read owned or demo prompts"
    on public.prompts
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.projects p
            where p.id = prompts.project_id
              and (p.is_demo = true or p.user_id = (select auth.uid()))
        )
    );

drop policy if exists "Authenticated can manage owned prompts" on public.prompts;
create policy "Authenticated can manage owned prompts"
    on public.prompts
    for all
    to authenticated
    using (
        exists (
            select 1
            from public.projects p
            where p.id = prompts.project_id
              and p.user_id = (select auth.uid())
        )
    )
    with check (
        exists (
            select 1
            from public.projects p
            where p.id = prompts.project_id
              and p.user_id = (select auth.uid())
        )
    );

drop policy if exists "Public can read demo reports" on public.reports;
create policy "Public can read demo reports"
    on public.reports
    for select
    to anon
    using (
        exists (
            select 1
            from public.projects p
            where p.id = reports.project_id
              and p.is_demo = true
        )
    );

drop policy if exists "Authenticated can read owned or demo reports" on public.reports;
create policy "Authenticated can read owned or demo reports"
    on public.reports
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.projects p
            where p.id = reports.project_id
              and (p.is_demo = true or p.user_id = (select auth.uid()))
        )
    );

drop policy if exists "Authenticated can manage owned reports" on public.reports;
create policy "Authenticated can manage owned reports"
    on public.reports
    for all
    to authenticated
    using (
        exists (
            select 1
            from public.projects p
            where p.id = reports.project_id
              and p.user_id = (select auth.uid())
        )
    )
    with check (
        exists (
            select 1
            from public.projects p
            where p.id = reports.project_id
              and p.user_id = (select auth.uid())
        )
    );

drop policy if exists "Public can read demo results" on public.prompt_results;
create policy "Public can read demo results"
    on public.prompt_results
    for select
    to anon
    using (
        exists (
            select 1
            from public.reports r
            join public.projects p on p.id = r.project_id
            where r.id = prompt_results.report_id
              and p.is_demo = true
        )
    );

drop policy if exists "Authenticated can read owned or demo results" on public.prompt_results;
create policy "Authenticated can read owned or demo results"
    on public.prompt_results
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.reports r
            join public.projects p on p.id = r.project_id
            where r.id = prompt_results.report_id
              and (p.is_demo = true or p.user_id = (select auth.uid()))
        )
    );

drop policy if exists "Authenticated can manage owned results" on public.prompt_results;
create policy "Authenticated can manage owned results"
    on public.prompt_results
    for all
    to authenticated
    using (
        exists (
            select 1
            from public.reports r
            join public.projects p on p.id = r.project_id
            where r.id = prompt_results.report_id
              and p.user_id = (select auth.uid())
        )
    )
    with check (
        exists (
            select 1
            from public.reports r
            join public.projects p on p.id = r.project_id
            where r.id = prompt_results.report_id
              and p.user_id = (select auth.uid())
        )
    );
