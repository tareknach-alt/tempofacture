-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelanceProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "legalForm" TEXT NOT NULL,
    "siret" TEXT NOT NULL,
    "apeCode" TEXT,
    "tvaIntra" TEXT,
    "capital" TEXT,
    "addressStreet" TEXT NOT NULL,
    "addressZip" TEXT NOT NULL,
    "addressCity" TEXT NOT NULL,
    "addressCountry" TEXT NOT NULL DEFAULT 'France',
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "logoUrl" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "bankName" TEXT,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "latePenaltyRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "recoveryPriceFix" DECIMAL(10,2),
    "isTrainingOrganism" BOOLEAN NOT NULL DEFAULT true,
    "trainingNumDeclaration" TEXT,
    "trainingQualiopiCertif" BOOLEAN NOT NULL DEFAULT false,
    "trainingQualiopiDate" TIMESTAMP(3),
    "customLegalMentions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelanceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "siret" TEXT NOT NULL,
    "tvaIntra" TEXT,
    "addressStreet" TEXT NOT NULL,
    "addressZip" TEXT NOT NULL,
    "addressCity" TEXT NOT NULL,
    "addressCountry" TEXT NOT NULL DEFAULT 'France',
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FreelanceProfile_userId_key" ON "FreelanceProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FreelanceProfile_siret_key" ON "FreelanceProfile"("siret");

-- CreateIndex
CREATE INDEX "Client_userId_idx" ON "Client"("userId");

-- AddForeignKey
ALTER TABLE "FreelanceProfile" ADD CONSTRAINT "FreelanceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
