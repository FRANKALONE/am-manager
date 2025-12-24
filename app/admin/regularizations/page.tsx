import { getAllRegularizations } from "@/app/actions/regularizations";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { RegularizationsList } from "./components/regularizations-list";

export default async function RegularizationsPage() {
    const regularizations = await getAllRegularizations();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Regularizaciones</h1>
                    <p className="text-muted-foreground">Gestión de ajustes de horas y consumos manuales</p>
                </div>
                <Button asChild>
                    <Link href="/admin/regularizations/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Regularización
                    </Link>
                </Button>
            </div>

            <RegularizationsList regularizations={regularizations} />
        </div>
    );
}
