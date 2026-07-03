ALTER TABLE "UserPreference" RENAME COLUMN "rememberLastSpace" TO "rememberLastProject";
ALTER TABLE "UserPreference" ALTER COLUMN "defaultView" SET DEFAULT 'home';
