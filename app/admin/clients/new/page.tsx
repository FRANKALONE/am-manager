import { Client } from "@prisma/client";
import { createClient, getClientById, updateClient } from "@/app/actions/clients";
import { getParametersByCategory } from "@/app/actions/parameters";
import { getEligibleManagers } from "@/app/actions/users";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClientFormFields } from "../components/client-form-fields";
import { getTranslations } from "@/lib/get-translations";

// Reuse this page for New and Edit
export default async function ClientFormPage(props: any) {
    const params = props?.params || {};
    const isEdit = !!params.id;
    let client: Client | null = null;
    const { t } = await getTranslations();

    if (isEdit && params.id) {
        client = await getClientById(params.id);
    }

    // Fetch custom fields definition
    const customFieldsDef = await getParametersByCategory("CUSTOM_FIELD_CLIENT");
    const eligibleUsers = await getEligibleManagers();
    const managers = eligibleUsers.map(u => ({
        id: u.id,
        value: u.id,
        label: `${u.name}${u.surname ? ` ${u.surname}` : ""}`
    }));

    async function action(formData: FormData) {
        "use server";
        if (isEdit) {
            const id = formData.get("id") as string;
            if (!id) throw new Error("ID not found in form data");
            await updateClient(id, {}, formData);
        } else {
            await createClient({}, formData);
        }
    }

    // Parse existing custom attributes
    let existingCustomAttrs: Record<string, string> = {};
    if (client && client.customAttributes) {
        try {
            existingCustomAttrs = JSON.parse(client.customAttributes);
        } catch (e) { }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    {isEdit ? t('clients.form.editTitle') : t('clients.form.newTitle')}
                </h1>
                <p className="text-muted-foreground">
                    {isEdit ? t('clients.form.editSubtitle') : t('clients.form.newSubtitle')}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('clients.form.cardTitle')}</CardTitle>
                    <CardDescription>{t('clients.form.cardDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <ClientFormFields
                        client={client}
                        managers={managers}
                        customFieldsDef={customFieldsDef}
                        existingCustomAttrs={existingCustomAttrs}
                        isEdit={isEdit}
                        action={action}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
