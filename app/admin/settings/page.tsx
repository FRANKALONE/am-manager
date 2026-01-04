import { getParametersByCategory, createParameter, deleteParameter } from "@/app/actions/parameters";
import { getCorrectionModels } from "@/app/actions/correction-models";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { revalidatePath } from "next/cache";
import { CorrectionModelsManager } from "./components/models-manager";
import { getTranslations } from "@/lib/get-translations";

export default async function SettingsPage() {
    const { t } = await getTranslations();

    // Fetch initial data (can be improved with parallel fetching)
    const contractTypes = await getParametersByCategory("CONTRACT_TYPE");
    const billingTypes = await getParametersByCategory("BILLING_TYPE");
    const correctionModels = await getCorrectionModels();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('admin.settings.title')}</h1>
                <p className="text-muted-foreground">
                    {t('admin.settings.subtitle')}
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">

                {/* Managing Models - Full Width */}
                <CorrectionModelsManager models={correctionModels} />

                <ParameterManager
                    title={t('admin.settings.contractTypes')}
                    category="CONTRACT_TYPE"
                    data={contractTypes}
                    t={t}
                />
                <ParameterManager
                    title={t('admin.settings.billingTypes')}
                    category="BILLING_TYPE"
                    data={billingTypes}
                    t={t}
                />
                <ParameterManager
                    title={t('admin.settings.regTypes')}
                    category="REGULARIZATION_TYPE"
                    data={await getParametersByCategory("REGULARIZATION_TYPE")}
                    t={t}
                />
                <ParameterManager
                    title={t('admin.settings.scopeUnits')}
                    category="SCOPE_UNIT"
                    data={await getParametersByCategory("SCOPE_UNIT")}
                    t={t}
                />
                <ParameterManager
                    title={t('admin.settings.renewalTypes')}
                    category="RENEWAL_TYPE"
                    data={await getParametersByCategory("RENEWAL_TYPE")}
                    t={t}
                />


                {/* Custom Fields Definitions */}
                <div className="col-span-full pt-8 border-t">
                    <h2 className="text-2xl font-bold mb-4">{t('admin.settings.customFieldsTitle')}</h2>
                    <p className="text-muted-foreground mb-6">{t('admin.settings.customFieldsDesc')}</p>
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        <ParameterManager
                            title={t('admin.settings.customFieldsClient')}
                            category="CUSTOM_FIELD_CLIENT"
                            data={await getParametersByCategory("CUSTOM_FIELD_CLIENT")}
                            t={t}
                        />
                        <ParameterManager
                            title={t('admin.settings.customFieldsProject')}
                            category="CUSTOM_FIELD_PROJECT"
                            data={await getParametersByCategory("CUSTOM_FIELD_PROJECT")}
                            t={t}
                        />
                        <ParameterManager
                            title={t('admin.settings.customFieldsWP')}
                            category="CUSTOM_FIELD_WP"
                            data={await getParametersByCategory("CUSTOM_FIELD_WP")}
                            t={t}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Client Component for Parameter Management
import { Plus, Trash2 } from "lucide-react";
import { ParameterForm } from "./components/parameter-form";

async function ParameterManager({ title, category, data, t }: { title: string, category: string, data: any[], t: any }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{t('admin.settings.table.help', { title })}</CardDescription>
            </CardHeader>
            <CardContent>
                <ParameterForm category={category} />

                <div className="rounded-md border mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('admin.settings.table.label')}</TableHead>
                                <TableHead>{t('admin.settings.table.value')}</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.label}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{item.value}</TableCell>
                                    <TableCell>
                                        <form action={async () => {
                                            "use server";
                                            await deleteParameter(item.id);
                                        }}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </form>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground">{t('admin.settings.table.noData')}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
