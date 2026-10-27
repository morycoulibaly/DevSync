-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PUSH', 'PULL_REQUEST', 'ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('OPEN', 'CLOSED', 'MERGED');

-- CreateEnum
CREATE TYPE "ScanSource" AS ENUM ('PASTED', 'REPOSITORY');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DigestStatus" AS ENUM ('PENDING', 'GENERATED', 'FAILED');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('DISCORD', 'SLACK', 'EMAIL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "githubId" INTEGER NOT NULL,
    "githubLogin" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "avatarUrl" TEXT,
    "accessToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "webhookToken" TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "action" TEXT,
    "status" "EventStatus",
    "actorLogin" TEXT NOT NULL,
    "actorAvatar" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DependencyScan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repositoryId" TEXT,
    "source" "ScanSource" NOT NULL,
    "packageJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DependencyScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DependencyFinding" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "currentRange" TEXT NOT NULL,
    "latestVersion" TEXT,
    "isOutdated" BOOLEAN NOT NULL DEFAULT false,
    "severity" "Severity",
    "advisoryId" TEXT,
    "advisoryUrl" TEXT,
    "fixedVersion" TEXT,

    CONSTRAINT "DependencyFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Digest" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "summary" TEXT,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT,
    "status" "DigestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Digest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationChannel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL,
    "target" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_webhookToken_key" ON "Repository"("webhookToken");

-- CreateIndex
CREATE INDEX "Repository_userId_idx" ON "Repository"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_userId_fullName_key" ON "Repository"("userId", "fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Event_deliveryId_key" ON "Event"("deliveryId");

-- CreateIndex
CREATE INDEX "Event_repositoryId_occurredAt_idx" ON "Event"("repositoryId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "Event_repositoryId_actorLogin_occurredAt_idx" ON "Event"("repositoryId", "actorLogin", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "Event_repositoryId_type_status_idx" ON "Event"("repositoryId", "type", "status");

-- CreateIndex
CREATE INDEX "DependencyScan_userId_createdAt_idx" ON "DependencyScan"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DependencyScan_repositoryId_createdAt_idx" ON "DependencyScan"("repositoryId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DependencyFinding_scanId_idx" ON "DependencyFinding"("scanId");

-- CreateIndex
CREATE INDEX "DependencyFinding_scanId_severity_idx" ON "DependencyFinding"("scanId", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "Digest_repositoryId_date_key" ON "Digest"("repositoryId", "date");

-- CreateIndex
CREATE INDEX "NotificationChannel_userId_idx" ON "NotificationChannel"("userId");

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DependencyScan" ADD CONSTRAINT "DependencyScan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DependencyScan" ADD CONSTRAINT "DependencyScan_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DependencyFinding" ADD CONSTRAINT "DependencyFinding_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "DependencyScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Digest" ADD CONSTRAINT "Digest_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationChannel" ADD CONSTRAINT "NotificationChannel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
