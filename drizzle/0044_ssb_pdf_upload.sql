alter table if exists oc_ssb_reports
  add column if not exists ssb_pdf_object_key varchar(512),
  add column if not exists ssb_pdf_file_name varchar(255),
  add column if not exists ssb_pdf_content_type varchar(128),
  add column if not exists ssb_pdf_size_bytes integer,
  add column if not exists ssb_pdf_password_hash text,
  add column if not exists ssb_pdf_password_algo varchar(32),
  add column if not exists ssb_pdf_salt varchar(64),
  add column if not exists ssb_pdf_iv varchar(32),
  add column if not exists ssb_pdf_auth_tag varchar(32),
  add column if not exists ssb_pdf_uploaded_at timestamptz,
  add column if not exists ssb_pdf_uploaded_by_user_id uuid;
--> statement-breakpoint
do $$
begin
  if to_regclass('public.oc_ssb_reports') is not null
     and to_regclass('public.users') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'fk_oc_ssb_reports_ssb_pdf_uploaded_by_user_id'
         and conrelid = to_regclass('public.oc_ssb_reports')
     ) then
    alter table oc_ssb_reports
      add constraint fk_oc_ssb_reports_ssb_pdf_uploaded_by_user_id
      foreign key (ssb_pdf_uploaded_by_user_id)
      references users(id)
      on delete set null;
  end if;
end $$;
--> statement-breakpoint
do $$
begin
  if to_regclass('public.oc_ssb_reports') is not null
     and not exists (
       select 1
       from pg_indexes
       where schemaname = 'public'
         and indexname = 'idx_oc_ssb_reports_pdf_oc'
     ) then
    create index idx_oc_ssb_reports_pdf_oc
      on oc_ssb_reports(oc_id)
      where deleted_at is null and ssb_pdf_object_key is not null;
  end if;
end $$;
