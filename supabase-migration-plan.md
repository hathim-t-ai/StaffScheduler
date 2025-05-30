# Supabase Migration Plan

## Overview

This document outlines the step-by-step process to migrate the entire database (schema and data) from the current Prisma (SQLite) setup to Supabase Postgres, following all best practices and rules in the `.cursor/rules/Supabase Rules` directory.

---

## 1. Preparation

- **Review the current Prisma schema** (`prisma/schema.prisma`) and seed data (`prisma/seed.js`).
- **Inventory all tables, fields, relations, and data types**.
- **Identify any vector embedding requirements** (e.g., for AI features).

---

## 2. Supabase Project Setup

- **Create a new Supabase project** using the Supabase MCP tools.
- **Enable required extensions** (e.g., `pgvector` for vector embeddings).

---

## 3. Schema Migration

- **Translate Prisma models to Postgres tables**:
  - Use snake_case, plural table names, and singular column names.
  - Add `created_at` and `updated_at` columns to all tables, with triggers using `public.handle_created_at()` and `public.handle_updated_at()`.
  - Define all relations, constraints, and indexes.
  - Add comments to tables and columns as per the Postgres SQL Style Guide.
- **Write schema as declarative SQL** in `supabase/schemas/` (not directly in migrations).
- **Generate migration files** using `supabase db diff -f <migration_name>`.

---

## 4. Data Migration

- **Export all data** from SQLite (using Prisma or a tool like `sqlite3`).
- **Transform data** to match the new Postgres schema (handle type differences, UUIDs, etc.).
- **Import data** into Supabase using SQL `COPY`, `INSERT`, or Supabase data import tools.

---

## 5. Vector Embeddings

- **Create vector columns** using the `pgvector` extension in relevant tables.
- **Migrate or generate vector data** as needed.
- **Test vector search functionality** in Supabase.

---

## 6. Security & Policies

- **Enable Row Level Security (RLS)** on all tables.
- **Write and apply RLS policies** for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` as per the rules.
- **Create any required Postgres functions** in `supabase/schemas/` and attach triggers.

---

## 7. Application Refactor

- **Update backend code** to use Supabase client instead of Prisma.
- **Remove or refactor all Prisma/SQLite-specific code**.
- **Test all features for compatibility**.

---

## 8. Validation & Testing

- **Verify schema and data integrity** in Supabase.
- **Test all application features** (CRUD, vector search, authentication, etc.).
- **Review and update documentation and rules** if new patterns emerge.

---

## 9. Deployment

- **Apply all migrations** to production Supabase.
- **Monitor logs and performance**.
- **Iterate as needed**.

---

## References

- [Supabase Rules](mdc:.cursor/rules/Supabase Rules/supabase_rules.mdc)
- [Declarative Schema Guide](mdc:.cursor/rules/Supabase Rules/declarative-database-schema.mdc)
- [RLS Policy Guide](mdc:.cursor/rules/Supabase Rules/Database: Create RLS Policies.md)
- [Postgres SQL Style Guide](mdc:.cursor/rules/Supabase Rules/Postgres SQL Style Guide.mdc)
- [Database Functions Guide](mdc:.cursor/rules/Supabase Rules/Database-functions.mdc)
- [Edge Functions & Embeddings](mdc:.cursor/rules/Supabase Rules/edge-functions.mdc)

---

**All data and schema must be migrated.**  
**Follow the rules in `.cursor/rules/Supabase Rules` for every step.** 