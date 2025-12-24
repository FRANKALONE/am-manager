import { Client } from "@prisma/client";
import { createClient, getClientById, updateClient } from "@/app/actions/clients";
import { getParametersByCategory } from "@/app/actions/parameters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClientFormFields } from "../components/client-form-fields";

// Reuse this page for New and Edit
export default async function ClientFormPage(props: any) {
    const params = props?.params || {};
    const isEdit = !!params.id;
    let client: Client | null = null;

    if (isEdit && params.id) {
        client = await getClientById(params.id);
    }

    // Fetch custom fields definition
    const customFieldsDef = await getParametersByCategory("CUSTOM_FIELD_CLIENT");
    const managers = await getParametersByCategory("MANAGER");

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
                <h1 className="text-3xl font-bold tracking-tight">{isEdit ? "Editar Cliente" : "Nuevo Cliente"}</h1>
                <p className="text-muted-foreground">
                    {isEdit ? "Modifica los datos del cliente." : "Registra un nuevo cliente en el sistema."}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Datos Generales</CardTitle>
                    <CardDescription>Información básica del cliente.</CardDescription>
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
