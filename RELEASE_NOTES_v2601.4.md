# AM Manager v2601.4 - Multi-Language Support

## Summary
This release adds comprehensive multi-language support with 6 languages and user-specific timezone preferences.

## New Features

### 🌍 Multi-Language Support
- **6 Languages Supported:**
  - 🇪🇸 Spanish (Español) - Default
  - 🇬🇧 English
  - 🇵🇹 Portuguese (Português)
  - 🇮🇹 Italian (Italiano)
  - 🇫🇷 French (Français)
  - 🇮🇳 Hindi (हिन्दी)

### ⚙️ User Preferences
- New user preferences page at `/admin/users/preferences`
- Language selector with flag icons
- Timezone selector with 12+ timezones
- Preferences saved per user in database

### 🔧 Technical Improvements
- Integrated `next-intl` for internationalization
- Created translation infrastructure
- Added middleware for locale detection
- Database schema updated with `locale` and `timezone` fields

## Bug Fixes

### 🐛 Password Recovery
- Fixed non-functional "¿Olvidaste tu contraseña?" link on login page
- Link moved outside form to prevent click interference
- Now properly navigates to password recovery page

## Database Changes
- Added `locale` field to User model (default: "es")
- Added `timezone` field to User model (default: "Europe/Madrid")

## Files Changed
- Updated: `prisma/schema.prisma`
- Updated: `package.json` (added next-intl)
- Updated: `next.config.mjs`
- Updated: `app/login/page.tsx`
- Created: 6 translation files in `messages/`
- Created: `lib/i18n.ts`
- Created: `middleware.ts`
- Created: User preferences components and pages

## Migration Required
Run the following command after deployment:
```bash
npx prisma migrate deploy
```

## Breaking Changes
None. All changes are backward compatible.

## Upgrade Notes
- Existing users will automatically get Spanish (es) as default language
- Existing users will automatically get Europe/Madrid as default timezone
- Users can change their preferences at any time

---

**Version:** v2601.4  
**Date:** 2026-01-04  
**Author:** AM Manager Team
