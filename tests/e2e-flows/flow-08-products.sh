#!/bin/bash
# ============================================================
# Flow 8: Products & Inventory
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test-utils.sh"

check_backend
login || { echo "Login failed"; exit 1; }
start_flow "Flow 8: Products & Inventory"

SUFFIX=$(random_suffix)

# ── Product Categories ──
start_section "Product Categories"

api_call GET "/products/categories"
assert_status_oneof "200|404" "GET /products/categories → list"
EXISTING_PROD_CAT=$(echo "$HTTP_BODY" | jq -r '.data[0].id // empty' 2>/dev/null)

# Also try product-categories route
api_call GET "/product-categories"
assert_status_oneof "200|404" "GET /product-categories → list (alt route)"
if [ -z "$EXISTING_PROD_CAT" ] || [ "$EXISTING_PROD_CAT" = "null" ]; then
  EXISTING_PROD_CAT=$(echo "$HTTP_BODY" | jq -r '.data[0].id // empty' 2>/dev/null)
fi

api_call POST "/products/categories" "{\"name\": \"Test Prod Category $SUFFIX\"}"
assert_status_oneof "200|201" "POST /products/categories — create"
TEST_PROD_CAT_ID=$(extract_field ".data.id")

# If that didn't work, try product-categories route
if [ -z "$TEST_PROD_CAT_ID" ] || [ "$TEST_PROD_CAT_ID" = "null" ]; then
  api_call POST "/product-categories" "{\"name\": \"Test Prod Category $SUFFIX\"}"
  TEST_PROD_CAT_ID=$(extract_field ".data.id")
fi

PROD_CAT="${TEST_PROD_CAT_ID:-$EXISTING_PROD_CAT}"

# ── Create Product ──
start_section "Create Product"

BARCODE="TEST$SUFFIX"
api_call POST "/products" "{
  \"name\": \"Test Product $SUFFIX\",
  \"description\": \"E2E test product\",
  \"sku\": \"SKU-$SUFFIX\",
  \"barcode\": \"$BARCODE\",
  \"price\": 49.99,
  \"cost\": 25.00,
  \"stock\": 100,
  \"categoryId\": \"$PROD_CAT\",
  \"isActive\": true
}"
assert_status_oneof "200|201" "POST /products — create"
TEST_PRODUCT_ID=$(extract_field ".data.id")

if [ -n "$TEST_PRODUCT_ID" ] && [ "$TEST_PRODUCT_ID" != "null" ]; then
  register_cleanup "/products/$TEST_PRODUCT_ID"

  # ── Get Product ──
  start_section "Get Product"

  api_call GET "/products/$TEST_PRODUCT_ID"
  assert_status "200" "GET /products/:id → single"
  assert_json_exists ".data.name" "Product has name"
  assert_json_exists ".data.price" "Product has price"

  # ── Update Product ──
  start_section "Update Product"

  api_call PUT "/products/$TEST_PRODUCT_ID" '{"price": 59.99}'
  assert_status "200" "PUT /products/:id — update price"

  # ── List Products ──
  start_section "List Products"

  api_call GET "/products"
  assert_status "200" "GET /products → list"

  # ── Barcode Search ──
  start_section "Barcode Search"

  api_call GET "/products/barcode/$BARCODE"
  assert_status_oneof "200|404" "GET /products/barcode/:barcode → search"

  # ── Stats ──
  start_section "Product Stats"

  api_call GET "/products/stats/overview"
  assert_status_oneof "200|404" "GET /products/stats/overview → stats"

  # ── Cleanup ──
  start_section "Cleanup"

  api_call DELETE "/products/$TEST_PRODUCT_ID"
  assert_status_oneof "200|204" "DELETE /products/:id → cleanup"
  CLEANUP_URLS=()
else
  skip_test "Product CRUD" "Could not create test product"
fi

# Cleanup category
if [ -n "$TEST_PROD_CAT_ID" ] && [ "$TEST_PROD_CAT_ID" != "null" ]; then
  api_call DELETE "/products/categories/$TEST_PROD_CAT_ID"
  # Fallback
  if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "204" ]; then
    api_call DELETE "/product-categories/$TEST_PROD_CAT_ID"
  fi
fi

# Export for sales flow
api_call GET "/products"
EXISTING_PRODUCT_ID=$(echo "$HTTP_BODY" | jq -r '.data[0].id // .data.data[0].id // empty' 2>/dev/null)
echo "$EXISTING_PRODUCT_ID" > /tmp/e2e-product-id.txt

end_flow
write_results
exit $FAIL_COUNT
