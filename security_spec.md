# FoodHub Lite — Firestore Zero-Trust Security Specification

## 1. Data Invariants
1. **Verified Authentication**: Every write across all collections requires `request.auth != null` and `request.auth.token.email_verified == true`.
2. **Master Admin Authority**: Only verified Master Admin Hamid Ali (`hamidalideveloper01@gmail.com` with `email_verified == true`, or a UID explicitly granted in `/admins/{uid}`) may list the Customer Database (`/customers`), change customer RBAC roles/statuses, or write to `/global_recipes`.
3. **Self-Registration Privilege Guard**: When a customer registers their own `/customers/{customerId}` profile, `customerId == request.auth.uid`, `role == 'customer'`, and `status == 'active'`. Customers can never self-assign `role: 'admin'` or `status: 'vip'`.
4. **PII Isolation**: `/customers/{customerId}` contains `email` and `phone` PII; `get` is strictly restricted to `request.auth.uid == customerId || isAdmin()`, and `list` is strictly restricted to `isBootstrapAdmin()`.
5. **Terminal State Locking**: Once a `/customers/{customerId}` record reaches terminal state `status == 'archived'`, non-admin updates are permanently blocked.
6. **Global Consistency Invariant**: Creating a `/user_recipes`, `/meal_plans`, or `/grocery_items` document requires `incoming().ownerId == request.auth.uid`, an existing `/customers/$(request.auth.uid)` parent profile, and `status != 'suspended' && status != 'archived'`.
7. **Temporal & Ownership Immutability**: `createdAt`, `uid`, `ownerId`, and `authorId` are strictly immutable on update; `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
8. **Zero Blanket List Queries**: Every `allow list` rule evaluates `resource.data` (`resource.data.ownerId == request.auth.uid` or `resource.data.published == true`) or `isBootstrapAdmin()`, with zero `get()`/`exists()` calls inside `allow list`.
9. **Total Array Guarding (`categories`)**: Optional `categories` field on `/global_recipes` and `/user_recipes` is strictly bounded (`categories is list && categories.size() >= 1 && categories.size() <= 10 && categories[0] is string && categories[0].size() >= 1 && categories[0].size() <= 40`), preventing unbounded array bloat or non-string element poisoning.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Admin Escalation**: Customer creates `/customers/uid1` with `{"role": "admin"}` -> `PERMISSION_DENIED`.
2. **Unverified Admin Email Spoof**: Attacker signs in with unverified `hamidalideveloper01@gmail.com` (`email_verified: false`) and attempts `list /customers` -> `PERMISSION_DENIED`.
3. **PII Cross-Tenant Read**: Customer `uid2` executes `get /customers/uid1` -> `PERMISSION_DENIED`.
4. **Customer Database Scrape**: Customer `uid2` executes `list /customers` -> `PERMISSION_DENIED`.
5. **Shadow Ghost Field Injection**: Customer updates `/customers/uid1` adding `"isVerified": true` -> `PERMISSION_DENIED` (`hasOnly` rejection).
6. **Archived Terminal Bypass**: Customer whose profile has `status: 'archived'` attempts to update `name` -> `PERMISSION_DENIED`.
7. **Orphaned Recipe Write**: Authenticated user without a `/customers/{uid}` profile attempts `create /user_recipes/rec1` -> `PERMISSION_DENIED`.
8. **Suspended Customer Write**: Customer with `status: 'suspended'` attempts `create /grocery_items/item1` -> `PERMISSION_DENIED`.
9. **Identity Spoofing on Recipe**: Customer `uid1` creates `/user_recipes/rec1` with `ownerId: "uid2"` -> `PERMISSION_DENIED`.
10. **Forged Client Timestamp**: Customer creates `/meal_plans/plan1` with `createdAt` set to 2020 -> `PERMISSION_DENIED` (`request.time` mismatch).
11. **ID & Array Poisoning Attack**: Attacker creates `/user_recipes/rec1` with 25 `categories` elements or non-string `[123]` -> `PERMISSION_DENIED` (`isValidId` + Total Array Guard).
12. **Unauthorized Global Recipe Mutation**: Customer attempts `create` or `update` on `/global_recipes/g1` -> `PERMISSION_DENIED`.

## 3. Red Team Audit Matrix
- `/admins/{adminId}`: Identity Spoofing PASS, Shadow Update PASS, Value Poisoning PASS, PII Blanket PASS.
- `/customers/{customerId}`: Self-Role Escalation PASS, Email Spoofing PASS, PII Blanket PASS, Terminal State Lock PASS, Shadow Update PASS.
- `/global_recipes/{recipeId}`: Admin-Only Write PASS, Unpublished Draft Leak PASS (`resource.data.published == true`), Total Array Guard PASS, Value Poisoning PASS.
- `/user_recipes/{recipeId}`: Parent Existence & Active Gate PASS, Immutable `ownerId` PASS, Total Array Guard PASS, Query Enforcer PASS.
- `/meal_plans/{planId}`: Enum Boundary PASS, Immutable `ownerId` PASS, Query Enforcer PASS.
- `/grocery_items/{itemId}`: Action-Based Toggle/Rename PASS, Query Enforcer PASS.
