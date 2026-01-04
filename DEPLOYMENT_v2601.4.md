# Multi-Language & Timezone Support - Deployment Instructions

## Version: v2601.4

## Changes Implemented

### 1. Database Schema
- Added `locale` field to User model (default: "es")
- Added `timezone` field to User model (default: "Europe/Madrid")

### 2. Translation Files
Created translation files for 6 languages:
- 🇪🇸 Spanish (es.json)
- 🇬🇧 English (en.json)
- 🇵🇹 Portuguese (pt.json)
- 🇮🇹 Italian (it.json)
- 🇫🇷 French (fr.json)
- 🇮🇳 Hindi (hi.json)

### 3. i18n Infrastructure
- Installed `next-intl` package
- Created middleware for locale detection
- Updated Next.js configuration
- Created i18n utilities and configuration

### 4. User Preferences
- Created user preferences page at `/admin/users/preferences`
- Added language and timezone selectors
- Implemented server actions for updating preferences

## Deployment Steps

### Step 1: Install Dependencies
```bash
npm install
```

This will install the new `next-intl` package.

### Step 2: Run Database Migration
```bash
npx prisma migrate dev --name add_locale_timezone
```

Or apply the migration directly to production:
```bash
npx prisma migrate deploy
```

### Step 3: Generate Prisma Client
```bash
npx prisma generate
```

### Step 4: Build the Application
```bash
npm run build
```

### Step 5: Deploy to Vercel
```bash
git add .
git commit -m "feat: Add multi-language support (v2601.4) - 6 languages + timezone preferences"
git push origin main
```

## Environment Variables
No new environment variables required.

## Post-Deployment Verification

1. **Test Language Switching:**
   - Log in to the application
   - Navigate to user preferences
   - Change language and verify UI updates

2. **Test Timezone:**
   - Change timezone in preferences
   - Verify dates display in correct timezone

3. **Test All Languages:**
   - Test basic navigation in all 6 languages
   - Verify translations display correctly

## Rollback Plan
If issues occur, revert to previous version:
```bash
git revert HEAD
git push origin main
```

## Notes
- Default language is Spanish (es)
- Default timezone is Europe/Madrid
- Existing users will automatically get these defaults
- Language preference is stored per user in the database
- Timezone affects date/time display throughout the application

## Files Modified
- `prisma/schema.prisma` - Added locale and timezone fields
- `package.json` - Added next-intl dependency
- `next.config.mjs` - Added next-intl plugin
- `middleware.ts` - Created for locale detection
- `lib/i18n.ts` - i18n configuration
- Multiple translation files in `messages/` directory
- User preferences UI components

## Files Created
- `messages/es.json`
- `messages/en.json`
- `messages/pt.json`
- `messages/it.json`
- `messages/fr.json`
- `messages/hi.json`
- `app/actions/user-preferences.ts`
- `app/admin/users/components/user-preferences-form.tsx`
- `app/admin/users/preferences/page.tsx`
