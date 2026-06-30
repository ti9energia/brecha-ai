For more information, see: https://pris.ly/prisma-config

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Norm" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "source" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "relevance" DOUBLE PRECISION NOT NULL,
    "sector" TEXT NOT NULL,
    "tags" TEXT[],
    "matched" BOOLEAN NOT NULL,
    "embedding" DOUBLE PRECISION[],

    CONSTRAINT "Norm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "normId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "estimatedGain" DOUBLE PRECISION NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "effort" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "correlatedNorms" INTEGER NOT NULL,
    "recommendedMove" JSONB NOT NULL,
    "simulation" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientStructure" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "regime" TEXT NOT NULL,
    "mainActivity" TEXT NOT NULL,
    "mainCnae" TEXT NOT NULL,
    "businessProfile" TEXT NOT NULL DEFAULT '',
    "activities" JSONB NOT NULL,
    "jurisdictions" TEXT[],
    "headquarters" TEXT NOT NULL,
    "annualRevenue" DOUBLE PRECISION NOT NULL,
    "headcount" INTEGER NOT NULL,
    "entities" JSONB NOT NULL,
    "completeness" DOUBLE PRECISION NOT NULL,
    "lastReview" TEXT NOT NULL,

    CONSTRAINT "ClientStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionPlan" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "approver" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "approvedBy" TEXT,
    "status" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL,
    "steps" JSONB NOT NULL,
    "audit" JSONB NOT NULL,

    CONSTRAINT "ExecutionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsRecord" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "playTitle" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "realizedGain" DOUBLE PRECISION NOT NULL,
    "quarter" TEXT NOT NULL,
    "reconciled" BOOLEAN NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingsRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "mrr" DOUBLE PRECISION NOT NULL,
    "users" INTEGER NOT NULL,
    "capturedNet" DOUBLE PRECISION NOT NULL,
    "aiSpend" DOUBLE PRECISION NOT NULL,
    "locale" TEXT NOT NULL,
    "sector" TEXT NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "planType" TEXT NOT NULL DEFAULT 'autonomo',
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "period" TEXT NOT NULL,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "feeRate" DOUBLE PRECISION NOT NULL,
    "features" TEXT[],
    "entitlements" TEXT[],
    "quotas" JSONB NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "module" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "rollout" INTEGER NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("module")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "actor" TEXT NOT NULL,
    "tenant" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiFeedback" (
    "id" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- CreateIndex
CREATE INDEX "Opportunity_normId_idx" ON "Opportunity"("normId");

-- CreateIndex
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");

-- CreateIndex
CREATE INDEX "ClientStructure_orgId_idx" ON "ClientStructure"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionPlan_opportunityId_key" ON "ExecutionPlan"("opportunityId");

-- CreateIndex
CREATE INDEX "SavingsRecord_opportunityId_idx" ON "SavingsRecord"("opportunityId");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- CreateIndex
CREATE INDEX "AiFeedback_orgId_idx" ON "AiFeedback"("orgId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_normId_fkey" FOREIGN KEY ("normId") REFERENCES "Norm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientStructure" ADD CONSTRAINT "ClientStructure_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFeedback" ADD CONSTRAINT "AiFeedback_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

