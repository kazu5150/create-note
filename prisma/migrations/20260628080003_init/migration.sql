-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputText" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyJson" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "noteUrl" TEXT
);
