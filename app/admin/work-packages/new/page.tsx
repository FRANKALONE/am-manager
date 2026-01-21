import { getParametersByCategory } from "@/app/actions/parameters";
import { getClients } from "@/app/actions/clients";
import { WorkPackageNewForm } from "../components/work-package-new-form";
import { getTranslations } from "@/lib/get-translations";

export default async function NewWorkPackagePage() {
    const { t } = await getTranslations();

    // Parallel data fetching
    const [
        clients,
        contractTypes,
        renewalTypes,
        billingTypes,
        scopeUnits,
        regularizationTypes,
        customFieldsDef
    ] = await Promise.all([
        getClients(),
        getParametersByCategory("CONTRACT_TYPE"),
        getParametersByCategory("RENEWAL_TYPE"),
        getParametersByCategory("BILLING_TYPE"),
        getParametersByCategory("SCOPE_UNIT"),
        getParametersByCategory("REGULARIZATION_TYPE"),
        getParametersByCategory("CUSTOM_FIELD_WP")
    ]);

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    {t('workPackages.form.title')}
                </h1>
                <p className="text-muted-foreground">{t('workPackages.form.subtitle')}</p>
            </div>

            <WorkPackageNewForm
                clients={clients}
                contractTypes={contractTypes}
                billingTypes={billingTypes}
                scopeUnits={scopeUnits}
                renewalTypes={renewalTypes}
                regularizationTypes={regularizationTypes}
                customFieldsDef={customFieldsDef}
            />
        </div>
    );
}
