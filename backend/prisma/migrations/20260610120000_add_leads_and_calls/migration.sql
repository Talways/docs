-- CreateEnum
CREATE TYPE "LeadListStatus" AS ENUM ('DRAFT', 'BUILDING', 'READY', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'QUEUED', 'CALLING', 'CALLED', 'INTERESTED', 'NOT_INTERESTED', 'CALLBACK', 'INVALID', 'DO_NOT_CALL');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('QUEUED', 'DIALING', 'IN_PROGRESS', 'COMPLETED', 'NO_ANSWER', 'VOICEMAIL', 'FAILED');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('INTERESTED', 'NOT_INTERESTED', 'CALLBACK', 'NOT_A_FIT', 'WRONG_NUMBER', 'NO_OUTCOME');

-- CreateTable
CREATE TABLE "lead_lists" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "target_industry" TEXT NOT NULL DEFAULT 'B2B SaaS',
    "status" "LeadListStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "list_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "city" TEXT,
    "country" TEXT,
    "employee_count" INTEGER,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "lead_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'QUEUED',
    "outcome" "CallOutcome" NOT NULL DEFAULT 'NO_OUTCOME',
    "phone_number" TEXT NOT NULL,
    "provider" TEXT,
    "provider_call_id" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "recording_url" TEXT,
    "transcript" TEXT,
    "summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_lists_user_id_idx" ON "lead_lists"("user_id");

-- CreateIndex
CREATE INDEX "leads_list_id_idx" ON "leads"("list_id");

-- CreateIndex
CREATE INDEX "leads_user_id_idx" ON "leads"("user_id");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "calls_lead_id_idx" ON "calls"("lead_id");

-- CreateIndex
CREATE INDEX "calls_user_id_idx" ON "calls"("user_id");

-- CreateIndex
CREATE INDEX "calls_status_idx" ON "calls"("status");

-- AddForeignKey
ALTER TABLE "lead_lists" ADD CONSTRAINT "lead_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lead_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

