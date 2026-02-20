import "dotenv/config";
import { Client } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("begin");

    await client.query(`
      alter table "oc_olq_category"
      add column if not exists "course_id" uuid
    `);

    await client.query(`
      do $$
      begin
        if not exists (
          select 1
          from pg_constraint
          where conname = 'oc_olq_category_course_id_courses_id_fk'
        ) then
          alter table "oc_olq_category"
          add constraint "oc_olq_category_course_id_courses_id_fk"
          foreign key ("course_id")
          references "public"."courses"("id")
          on delete restrict
          on update no action;
        end if;
      end $$;
    `);

    await client.query(`drop index if exists "uq_olq_category_code"`);

    await client.query(`
      create unique index if not exists "uq_olq_category_course_code_active"
      on "oc_olq_category" using btree ("course_id", "code")
      where "is_active" = true
    `);

    await client.query(`
      create index if not exists "idx_olq_category_course_active_order"
      on "oc_olq_category" using btree ("course_id", "is_active", "display_order")
    `);

    const categoriesCloneResult = await client.query(`
      with source_categories as (
        select id, code, title, description, display_order
        from oc_olq_category
        where course_id is null
          and is_active = true
      ),
      active_courses as (
        select id
        from courses
        where deleted_at is null
      ),
      categories_to_clone as (
        select
          ac.id as course_id,
          sc.code,
          sc.title,
          sc.description,
          sc.display_order
        from source_categories sc
        cross join active_courses ac
        where not exists (
          select 1
          from oc_olq_category existing
          where existing.course_id = ac.id
            and existing.code = sc.code
            and existing.is_active = true
        )
      )
      insert into oc_olq_category (
        id, course_id, code, title, description, display_order, is_active, created_at, updated_at
      )
      select
        gen_random_uuid(),
        ctc.course_id,
        ctc.code,
        ctc.title,
        ctc.description,
        ctc.display_order,
        true,
        now(),
        now()
      from categories_to_clone ctc;
    `);

    const subtitlesCloneResult = await client.query(`
      with source_subtitles as (
        select
          src_cat.code as category_code,
          src_sub.subtitle,
          src_sub.max_marks,
          src_sub.display_order
        from oc_olq_subtitle src_sub
        inner join oc_olq_category src_cat on src_cat.id = src_sub.category_id
        where src_cat.course_id is null
          and src_cat.is_active = true
          and src_sub.is_active = true
      ),
      target_categories as (
        select id, course_id, code
        from oc_olq_category
        where course_id is not null
          and is_active = true
      ),
      subtitles_to_clone as (
        select
          tc.id as target_category_id,
          ss.subtitle,
          ss.max_marks,
          ss.display_order
        from target_categories tc
        inner join source_subtitles ss on ss.category_code = tc.code
        where not exists (
          select 1
          from oc_olq_subtitle existing_sub
          where existing_sub.category_id = tc.id
            and existing_sub.subtitle = ss.subtitle
        )
      )
      insert into oc_olq_subtitle (
        id, category_id, subtitle, max_marks, display_order, is_active, created_at, updated_at
      )
      select
        gen_random_uuid(),
        stc.target_category_id,
        stc.subtitle,
        stc.max_marks,
        stc.display_order,
        true,
        now(),
        now()
      from subtitles_to_clone stc;
    `);

    const deactivateLegacySubtitlesResult = await client.query(`
      update oc_olq_subtitle legacy_sub
      set is_active = false,
          updated_at = now()
      from oc_olq_category legacy_cat
      where legacy_sub.category_id = legacy_cat.id
        and legacy_cat.course_id is null
        and legacy_sub.is_active = true;
    `);

    const deactivateLegacyCategoriesResult = await client.query(`
      update oc_olq_category
      set is_active = false,
          updated_at = now()
      where course_id is null
        and is_active = true;
    `);

    await client.query("commit");

    console.log("OLQ course-template repair completed.");
    console.log(`Categories cloned: ${categoriesCloneResult.rowCount ?? 0}`);
    console.log(`Subtitles cloned: ${subtitlesCloneResult.rowCount ?? 0}`);
    console.log(`Legacy subtitles deactivated: ${deactivateLegacySubtitlesResult.rowCount ?? 0}`);
    console.log(`Legacy categories deactivated: ${deactivateLegacyCategoriesResult.rowCount ?? 0}`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`db:repair:olq-course-template failed: ${message}`);
  process.exit(1);
});
