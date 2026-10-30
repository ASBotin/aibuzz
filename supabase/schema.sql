


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "domain" "text",
    "niche" "text",
    "competitors" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "country" "text",
    "city" "text",
    "description" "text",
    "pages" "jsonb",
    "keywords" "jsonb",
    "names_alt" "jsonb",
    "is_demo" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prompt_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "prompt_id" "uuid",
    "prompt_text" "text" NOT NULL,
    "prompt_category" "text" NOT NULL,
    "provider" "text" DEFAULT 'perplexity'::"text" NOT NULL,
    "raw_text" "text",
    "raw_citations" "jsonb" DEFAULT '[]'::"jsonb",
    "brand_mentioned" boolean,
    "sentiment" "text",
    "found_competitors" "jsonb" DEFAULT '[]'::"jsonb",
    "extracted_domains" "jsonb" DEFAULT '[]'::"jsonb",
    "is_excluded_from_stats" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "brands_ranking" "jsonb" DEFAULT '{}'::"jsonb",
    "brands_pros_cons" "jsonb" DEFAULT '{}'::"jsonb",
    "mentioned_keywords" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "domain_mentioned" boolean DEFAULT false NOT NULL,
    "mentioned_pages" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    CONSTRAINT "prompt_results_sentiment_check" CHECK (("sentiment" = ANY (ARRAY['positive'::"text", 'neutral'::"text", 'negative'::"text", 'not_found'::"text"])))
);


ALTER TABLE "public"."prompt_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prompts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "category" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_custom" boolean DEFAULT false,
    CONSTRAINT "prompts_category_check" CHECK (("category" = ANY (ARRAY['main'::"text", 'custom'::"text", 'brand_direct'::"text", 'head_to_head'::"text"])))
);


ALTER TABLE "public"."prompts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "share_of_voice" numeric,
    "average_rank" numeric,
    "sentiment_index" "jsonb" DEFAULT '{"neutral": 0, "negative": 0, "positive": 0}'::"jsonb",
    "citation_rate" numeric,
    "ai_summary" "text",
    "brand_direct_summary" "text",
    "h2h_matrix" "jsonb" DEFAULT '[]'::"jsonb",
    "competitors_breakdown" "jsonb" DEFAULT '[]'::"jsonb",
    "top_sources" "jsonb" DEFAULT '[]'::"jsonb",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "h2h_summary" "text",
    "prompts_total" integer,
    "keywords_breakdown" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "tracked_sources" "jsonb" DEFAULT '{"pages": [], "domain": null}'::"jsonb" NOT NULL,
    CONSTRAINT "reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prompt_results"
    ADD CONSTRAINT "prompt_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prompts"
    ADD CONSTRAINT "prompts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_projects_user_id" ON "public"."projects" USING "btree" ("user_id");



CREATE INDEX "idx_prompt_results_report_id" ON "public"."prompt_results" USING "btree" ("report_id");



CREATE INDEX "idx_prompts_project_id" ON "public"."prompts" USING "btree" ("project_id");



CREATE INDEX "idx_reports_project_id" ON "public"."reports" USING "btree" ("project_id");



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_reports_updated_at" BEFORE UPDATE ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prompt_results"
    ADD CONSTRAINT "prompt_results_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."prompt_results"
    ADD CONSTRAINT "prompt_results_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prompts"
    ADD CONSTRAINT "prompts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated can manage owned projects" ON "public"."projects" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Authenticated can manage owned prompts" ON "public"."prompts" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "prompts"."project_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "prompts"."project_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Authenticated can manage owned reports" ON "public"."reports" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "reports"."project_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "reports"."project_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Authenticated can manage owned results" ON "public"."prompt_results" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."reports" "r"
     JOIN "public"."projects" "p" ON (("p"."id" = "r"."project_id")))
  WHERE (("r"."id" = "prompt_results"."report_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."reports" "r"
     JOIN "public"."projects" "p" ON (("p"."id" = "r"."project_id")))
  WHERE (("r"."id" = "prompt_results"."report_id") AND ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Authenticated can read owned or demo projects" ON "public"."projects" FOR SELECT TO "authenticated" USING ((("is_demo" = true) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Authenticated can read owned or demo prompts" ON "public"."prompts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "prompts"."project_id") AND (("p"."is_demo" = true) OR ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Authenticated can read owned or demo reports" ON "public"."reports" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "reports"."project_id") AND (("p"."is_demo" = true) OR ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Authenticated can read owned or demo results" ON "public"."prompt_results" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."reports" "r"
     JOIN "public"."projects" "p" ON (("p"."id" = "r"."project_id")))
  WHERE (("r"."id" = "prompt_results"."report_id") AND (("p"."is_demo" = true) OR ("p"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Public can read demo projects" ON "public"."projects" FOR SELECT TO "anon" USING (("is_demo" = true));



CREATE POLICY "Public can read demo prompts" ON "public"."prompts" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "prompts"."project_id") AND ("p"."is_demo" = true)))));



CREATE POLICY "Public can read demo reports" ON "public"."reports" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "reports"."project_id") AND ("p"."is_demo" = true)))));



CREATE POLICY "Public can read demo results" ON "public"."prompt_results" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM ("public"."reports" "r"
     JOIN "public"."projects" "p" ON (("p"."id" = "r"."project_id")))
  WHERE (("r"."id" = "prompt_results"."report_id") AND ("p"."is_demo" = true)))));



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prompt_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prompts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."prompt_results" TO "anon";
GRANT ALL ON TABLE "public"."prompt_results" TO "authenticated";
GRANT ALL ON TABLE "public"."prompt_results" TO "service_role";



GRANT ALL ON TABLE "public"."prompts" TO "anon";
GRANT ALL ON TABLE "public"."prompts" TO "authenticated";
GRANT ALL ON TABLE "public"."prompts" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







