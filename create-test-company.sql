INSERT INTO companies (id, name, email, "subscriptionPlan", "subscriptionStatus", "billingCycle", "isActive", "createdAt", "updatedAt")
VALUES ('test-company-1', 'Test School', 'school@test.com', 'BASIC', 'ACTIVE', 'MONTHLY', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  "updatedAt" = NOW();