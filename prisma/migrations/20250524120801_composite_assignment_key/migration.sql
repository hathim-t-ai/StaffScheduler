/*
  Warnings:

  - A unique constraint covering the columns `[staffId,projectId,date]` on the table `Assignment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Assignment_staffId_projectId_date_key" ON "Assignment"("staffId", "projectId", "date");
