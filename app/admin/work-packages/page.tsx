import { getWorkPackages, deleteWorkPackage, WorkPackageFilters as WPFiltersType } from "@/app/actions/work-packages";
import { getParametersByCategory } from "@/app/actions/parameters";
import { getClients } from "@/app/actions/clients";
import { WorkPackageFilters } from "./filters";
import { Button } from "@/components/ui/button";
import { WorkPackagesTable } from "./components/work-package-table";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function WorkPackagesPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    // Parse Filters
    const filters: WPFiltersType = {
        clientId: typeof searchParams.clientId === "string" ? searchParams.clientId : undefined,
        contractType: typeof searchParams.contractType === "string" ? searchParams.contractType : undefined,
        renewalType: typeof searchParams.renewalType === "string" ? searchParams.renewalType : undefined,
        isPremium: searchParams.isPremium === "true" ? true : searchParams.isPremium === "false" ? false : undefined,
        status: (searchParams.status === "inactive" || searchParams.status === "all") ? searchParams.status : "active",
        month: searchParams.month ? parseInt(searchParams.month as string) : undefined,
        year: searchParams.year ? parseInt(searchParams.year as string) : undefined,
    };

    const wps = await getWorkPackages(filters);
    const contractTypes = await getParametersByCategory("CONTRACT_TYPE");
    const renewalTypes = await getParametersByCategory("RENEWAL_TYPE");
    const clients = await getClients();

    // Map Value -> Label
    const contractTypeMap = contractTypes.reduce((acc, curr) => {
        acc[curr.value] = curr.label;
        return acc;
    }, {} as Record<string, string>);

    const renewalTypeMap = renewalTypes.reduce((acc, curr) => {
        acc[curr.value] = curr.label;
        return acc;
    }, {} as Record<string, string>);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Work Packages</h1>
                    <p className="text-muted-foreground">
                        Gestión de condiciones y detalles de los servicios (WPs).
                    </p>
                </div>
            </div>

            <WorkPackageFilters
                clients={clients.map(c => ({ id: c.id, name: c.name }))}
                contractTypes={contractTypes}
                renewalTypes={renewalTypes}
            />

            <div className="flex justify-start">
                <Link href="/admin/work-packages/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Nuevo WP
                    </Button>
                </Link>
            </div>

            <WorkPackagesTable
                wps={wps}
                contractTypeMap={contractTypeMap}
                renewalTypeMap={renewalTypeMap}
            />
        </div>
    );
}

