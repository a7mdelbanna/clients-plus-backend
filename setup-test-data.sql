-- Create test company
INSERT INTO "Company" (id, name, email, phone, industry, status, "isSetupComplete", "createdAt", "updatedAt")
VALUES (
  'test-company-123',
  'Test Company',
  'admin@test.com', 
  '+1234567890',
  'BEAUTY_SALON',
  'ACTIVE',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET 
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  industry = EXCLUDED.industry,
  status = EXCLUDED.status,
  "isSetupComplete" = EXCLUDED."isSetupComplete";

-- Create test user 
INSERT INTO "User" (id, email, password, "firstName", "lastName", role, "isEmailVerified", "companyId", "isActive", "createdAt", "updatedAt")
VALUES (
  'test-user-123',
  'admin@test.com',
  '$2b$10$K7L/8alIAyimCF82sn6.De7/yH8.vQuKGvpLQ8iQfszQOZCbJg4/i', -- Test123!@#
  'Test',
  'Admin',
  'OWNER',
  true,
  'test-company-123',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  role = EXCLUDED.role,
  "isEmailVerified" = EXCLUDED."isEmailVerified",
  "isActive" = EXCLUDED."isActive";

-- Create test branch
INSERT INTO "Branch" (id, name, "companyId", address, phone, "isActive", "createdAt", "updatedAt")
VALUES (
  'test-branch-123',
  'Main Branch',
  'test-company-123',
  '123 Test Street, Test City',
  '+1234567890',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  "isActive" = EXCLUDED."isActive";

-- Create test service
INSERT INTO "Service" (id, name, description, duration, "companyId", "branchId", "isActive", "createdAt", "updatedAt")
VALUES (
  'test-service-123',
  'Test Service',
  'A test service for appointments',
  60,
  'test-company-123',
  'test-branch-123',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  duration = EXCLUDED.duration,
  "isActive" = EXCLUDED."isActive";

-- Create test client
INSERT INTO "Client" (id, "firstName", "lastName", email, phone, "companyId", "isActive", "createdAt", "updatedAt")
VALUES (
  'test-client-123',
  'John',
  'Doe',
  'john.doe@test.com',
  '+1987654321',
  'test-company-123',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  "isActive" = EXCLUDED."isActive";

-- Create test staff
INSERT INTO "Staff" (id, name, email, phone, "companyId", "branchId", "isActive", "createdAt", "updatedAt")
VALUES (
  'test-staff-123',
  'Jane Smith',
  'jane.smith@test.com',
  '+1567890123',
  'test-company-123',
  'test-branch-123',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  "isActive" = EXCLUDED."isActive";

SELECT 'Test data setup complete!' as message;