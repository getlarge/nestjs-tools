# Fix FileInterceptor to Support Body Fields (Issue #107)

## Problem
`FileInterceptor` only processes the first part of multipart requests, causing:
1. Other form fields are lost if file comes first
2. File not found if body fields come first
3. Order dependency breaks real-world usage

## Solution
Modify `handleMultipartSingleFile` to iterate through ALL parts (like `handleMultipartMultipleFiles`), while maintaining strict single-file validation.

## Implementation Tasks

### Task 1: Update single-file handler logic
**File:** `packages/fastify-upload/src/lib/multipart/handlers/single-file.ts`

**Steps:**
1. Replace `const { value: part } = await parts.next()` with `for await (const part of parts)` loop
2. Move validation logic inside the loop
3. Keep all existing error conditions identical
4. Accumulate non-file fields into `body` object

**Expected behavior:**
- File validation: reject wrong fieldname, reject multiple files
- Body fields: collect all non-file parts
- Order independence: works regardless of field order

**Verification:**
```bash
# Should compile without errors
nx build fastify-upload
```

### Task 2: Add test controller endpoint
**File:** `packages/fastify-upload/test/file-upload/app.controller.ts`

**Steps:**
1. Add new endpoint `@Post('single-with-body')` that exposes body data
2. Use `FileInterceptor` with `MemoryStorage`
3. Return both file success and body object

**Verification:**
```bash
# Should compile without errors
nx build fastify-upload
```

### Task 3: Add comprehensive tests
**File:** `packages/fastify-upload/test/file-upload/file-upload.spec.ts`

**Steps:**
1. Test: file + body fields (Issue #107 main case)
2. Test: body fields before file (order independence)
3. Test: multiple files same field rejected (maintain strictness)
4. Test: wrong fieldname rejected (maintain strictness)

**Verification:**
```bash
# All tests should pass
nx test fastify-upload
```

### Task 4: Run full verification
**Steps:**
1. Run all tests to ensure backward compatibility
2. Check linting passes
3. Verify no type errors

**Verification:**
```bash
nx test fastify-upload
nx lint fastify-upload
nx build fastify-upload
```

## Success Criteria
- ✅ All existing tests pass (backward compatibility)
- ✅ New tests pass (issue #107 fixed)
- ✅ File-first order works (existing)
- ✅ Fields-first order works (new)
- ✅ Body fields accessible via request.body
- ✅ Strict validation maintained
- ✅ No breaking API changes

## References
- Issue: https://github.com/getlarge/nestjs-tools/issues/107
- Pattern reference: `handleMultipartMultipleFiles` in `multiple-files.ts`
