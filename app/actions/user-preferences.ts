'use server';

import { prisma } from '@/lib/prisma';
import { type Locale } from '@/lib/i18n-config';
import { setLocaleCookie, setTimezoneCookie } from '@/lib/preferences-actions';
import { revalidatePath } from 'next/cache';

export async function updateUserPreferences(
    userId: string,
    preferences: { locale?: Locale; timezone?: string }
) {
    try {
        const updateData: any = {};

        if (preferences.locale) {
            updateData.locale = preferences.locale;
            // Also update the cookie
            await setLocaleCookie(preferences.locale);
        }

        if (preferences.timezone) {
            updateData.timezone = preferences.timezone;
            // Also update the cookie
            await setTimezoneCookie(preferences.timezone);
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        revalidatePath('/');

        return { success: true };
    } catch (error) {
        console.error('Error updating user preferences:', error);
        return { success: false, error: 'Error al actualizar preferencias' };
    }
}

export async function getUserPreferences(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                locale: true,
                timezone: true,
            },
        });

        return { success: true, data: user };
    } catch (error) {
        console.error('Error fetching user preferences:', error);
        return { success: false, error: 'Error al obtener preferencias' };
    }
}
