import { getWorkPackageById, updateWorkPackage } from "@/app/actions/work-packages";
import { getParametersByCategory } from "@/app/actions/parameters";
import { getCorrectionModels, getWPCorrections } from "@/app/actions/corrections";
import { getSpecialRegularizations } from "@/app/actions/special-regularizations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ValidityPeriodsManager } from "../../components/validity-manager";
import { CorrectionManager } from "../../components/correction-manager";
import { notFound } from "next/navigation";
import { WorkPackageForm } from "../../components/work-package-form";

export default async function EditWorkPackagePage({ params, searchParams }: { params: { id: string }, searchParams: { returnTo?: string } }) {
    const wp = await getWorkPackageById(params.id);
    const returnTo = searchParams.returnTo || "/admin/work-packages";

    if (!wp) {
        notFound();
    }

    // Parallel data fetching
    const [
        contractTypes,
        regularizationTypes,
        renewalTypes,
        billingTypes,
        scopeUnits,
        correctionModels,
        wpCorrections,
        specialRegularizations
    ] = await Promise.all([
        getParametersByCategory("CONTRACT_TYPE"),
        getParametersByCategory("REGULARIZATION_TYPE"),
        getParametersByCategory("RENEWAL_TYPE"),
        getParametersByCategory("BILLING_TYPE"),
        getParametersByCategory("SCOPE_UNIT"),
        getCorrectionModels(),
        getWPCorrections(params.id),
        getSpecialRegularizations()
    ]);

    // Bind ID and null prevState to update action to match (formData) => Promise signature
    const updateAction = updateWorkPackage.bind(null, wp.id, null);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={returnTo}><ChevronLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">Editar Work Package: {wp.name}</h1>
            </div>

            <div className="space-y-6">
                {/* General Info Form + Current Period Data */}
                <WorkPackageForm
                    wp={wp}
                    contractTypes={contractTypes}
                    billingTypes={billingTypes}
                    renewalTypes={renewalTypes}
                    regularizationTypes={regularizationTypes}
                    scopeUnits={scopeUnits}
                    specialRegularizations={specialRegularizations}
                    returnTo={returnTo}
                />

                {/* Validity Periods - Multiple Periods Management */}
                <Card>
                    <CardHeader>
                        <CardTitle>Gestión de Periodos de Validez</CardTitle>
                        <CardDescription>Añade y gestiona múltiples periodos con sus propias condiciones económicas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ValidityPeriodsManager
                            wpId={wp.id}
                            periods={wp.validityPeriods}
                            scopeUnits={scopeUnits}
                            regularizationTypes={regularizationTypes}
                            billingTypes={billingTypes}
                            specialRegularizations={specialRegularizations}
                        />
                    </CardContent>
                </Card>

                {/* Corrections - At the bottom */}
                <CorrectionManager wpId={wp.id} models={correctionModels} corrections={wpCorrections} />
            </div>
        </div>
    );
}
