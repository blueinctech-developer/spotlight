import "dotenv/config";

// Integration tests always run against the dedicated test database, never the dev/prod one.
if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL must be set to run tests.");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.STORAGE_DRIVER = "local";
process.env.LOCAL_STORAGE_DIR = process.env.LOCAL_STORAGE_DIR ?? ".data/test-uploads";
delete process.env.SMTP_HOST;
