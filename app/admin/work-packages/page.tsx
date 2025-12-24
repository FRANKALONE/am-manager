import { getWorkPackages, deleteWorkPackage, WorkPackageFilters as WPFiltersType } from "@/app/actions/work-packages";
import { getParametersByCategory } from "@/app/actions/parameters";
import { getClients } from "@/app/actions/clients";
import { WorkPackageFilters } from "./filters";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Plus, Pencil, Trash2, CalendarClock } from "lucide-react";

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

    async function deleteAction(id: string) {
        "use server";
        await deleteWorkPackage(id);
    }

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

            {/* Scrollable Container with max-width to prevent full page blowout */}
            <div className="shadow-sm border rounded-md overflow-hidden dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="relative w-full overflow-x-auto">
                    <Table className="min-w-[1400px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="sticky left-0 z-30 bg-white dark:bg-gray-900 w-[150px] border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">ID WP</TableHead>
                                <TableHead className="sticky left-[150px] z-30 bg-white dark:bg-gray-900 w-[250px] border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nombre</TableHead>
                                <TableHead className="min-w-[200px]">Cliente</TableHead>
                                <TableHead className="min-w-[150px]">Tipo Contrato</TableHead>
                                <TableHead className="min-w-[120px]">Facturación</TableHead>
                                <TableHead className="min-w-[150px]">Renovación</TableHead>
                                <TableHead className="min-w-[100px] text-center">Periodos</TableHead>
                                <TableHead className="text-right min-w-[100px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {wps.map((wp) => (
                                <TableRow key={wp.id} className="bg-white dark:bg-gray-900 hover:bg-muted/50">
                                    <TableCell className="font-medium sticky left-0 z-20 bg-white dark:bg-gray-900 border-r">
                                        {wp.id}
                                    </TableCell>
                                    <TableCell className="sticky left-[150px] z-20 bg-white dark:bg-gray-900 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        {wp.name}
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium">{wp.clientName}</span>
                                    </TableCell>
                                    <TableCell>
                                        {contractTypeMap[wp.contractType] || wp.contractType}
                                    </TableCell>
                                    <TableCell>{wp.billingType}</TableCell>
                                    <TableCell>{wp.renewalType ? (renewalTypeMap[wp.renewalType] || wp.renewalType) : "-"}</TableCell>
                                    <TableCell className="text-center">
                                        <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-2.5 py-0.5 text-green-700 gap-1">
                                            <CalendarClock className="w-3 h-3" />
                                            {wp._count.validityPeriods}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/admin/work-packages/${wp.id}/edit`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <form action={deleteAction.bind(null, wp.id)}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </form>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {wps.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                                        No hay Work Packages que coincidan con los filtros.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>

    );
}

