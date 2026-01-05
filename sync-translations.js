#!/usr/bin/env node

/**
 * Translation Synchronization Script
 * 
 * Automatically detects missing translation keys in target languages
 * and synchronizes them from the Spanish (es.json) reference file.
 * 
 * Usage: npm run sync-translations
 */

const fs = require('fs');
const path = require('path');

// Configuration
const MESSAGES_DIR = path.join(__dirname, 'messages');
const SOURCE_LANG = 'es';
const TARGET_LANGS = ['en', 'pt', 'it', 'fr', 'hi'];

// Translation mappings for common technical terms
const TRANSLATIONS = {
    en: {
        // Add common translations if needed for automation
    },
    pt: {
        // Portuguese translations
    },
    it: {
        // Italian translations
    },
    fr: {
        // French translations
    },
    hi: {
        // Hindi translations
    }
};

/**
 * Recursively count all keys in an object
 */
function countKeys(obj) {
    let count = 0;
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            count += countKeys(obj[key]);
        } else {
            count++;
        }
    }
    return count;
}

/**
 * Find missing keys by comparing source with target
 */
function findMissingKeys(source, target, path = '') {
    const missing = [];

    for (const key in source) {
        const currentPath = path ? `${path}.${key}` : key;

        if (!(key in target)) {
            missing.push({
                path: currentPath,
                value: source[key],
                type: typeof source[key] === 'object' ? 'object' : 'string'
            });
        } else if (typeof source[key] === 'object' && source[key] !== null) {
            if (typeof target[key] !== 'object' || target[key] === null) {
                // Structure mismatch - target has string where source has object
                missing.push({
                    path: currentPath,
                    value: source[key],
                    type: 'object',
                    structureMismatch: true
                });
            } else {
                // Recursively check nested objects
                const nestedMissing = findMissingKeys(source[key], target[key], currentPath);
                missing.push(...nestedMissing);
            }
        }
    }

    return missing;
}

/**
 * Deep clone an object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Set a value in an object using a dot-notation path
 */
function setValueByPath(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }

    current[keys[keys.length - 1]] = deepClone(value);
}

/**
 * Main synchronization function
 */
function syncTranslations() {
    console.log('🌍 Translation Synchronization Script\n');
    console.log('='.repeat(60));

    // Load source file
    const sourcePath = path.join(MESSAGES_DIR, `${SOURCE_LANG}.json`);
    const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const sourceKeyCount = countKeys(sourceData);

    console.log(`\n📚 Source: ${SOURCE_LANG}.json (${sourceKeyCount} keys)\n`);

    let totalAdded = 0;
    const report = [];

    // Process each target language
    TARGET_LANGS.forEach(lang => {
        const targetPath = path.join(MESSAGES_DIR, `${lang}.json`);
        let targetData = JSON.parse(fs.readFileSync(targetPath, 'utf8'));

        const beforeCount = countKeys(targetData);
        const missing = findMissingKeys(sourceData, targetData);

        if (missing.length === 0) {
            console.log(`✅ ${lang.toUpperCase()}: Already complete (${beforeCount}/${sourceKeyCount})`);
            report.push({
                lang,
                before: beforeCount,
                after: beforeCount,
                added: 0,
                status: 'complete'
            });
            return;
        }

        // Add missing keys
        missing.forEach(item => {
            setValueByPath(targetData, item.path, item.value);
        });

        // Write updated file
        fs.writeFileSync(
            targetPath,
            JSON.stringify(targetData, null, 4) + '\n',
            'utf8'
        );

        const afterCount = countKeys(targetData);
        const added = afterCount - beforeCount;
        totalAdded += added;

        console.log(`📝 ${lang.toUpperCase()}: ${beforeCount} → ${afterCount} (+${added} keys)`);

        report.push({
            lang,
            before: beforeCount,
            after: afterCount,
            added,
            status: 'updated'
        });
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Summary:\n');

    if (totalAdded === 0) {
        console.log('✅ All languages are already synchronized!');
    } else {
        console.log(`✅ Added ${totalAdded} translation keys across ${report.filter(r => r.added > 0).length} languages`);
        console.log('\n⚠️  NOTE: Auto-copied from Spanish. Review translations for accuracy.');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✨ Synchronization complete!\n');
}

// Run the script
try {
    syncTranslations();
    process.exit(0);
} catch (error) {
    console.error('\n❌ Error during synchronization:', error.message);
    console.error(error.stack);
    process.exit(1);
}
