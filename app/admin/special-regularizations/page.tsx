import { getSpecialRegularizations } from "@/app/actions/special-regularizations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { SpecialRegularizationsList } from "./components/regularizations-list";

export default async function SpecialRegularizationsPage() {
    const regularizations = await getSpecialRegularizations();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Regularizaciones Especiales</h1>
                    <p className="text-muted-foreground">
                        Define estrategias reutilizables de regularización (Rappel, Categorías de Consultor)
                    </p>
                </div>
                <Link href="/admin/special-regularizations/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Regularización
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Regularizaciones Configuradas</CardTitle>
                    <CardDescription>
                        Gestiona las estrategias de regularización que puedes asignar a los Work Packages
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SpecialRegularizationsList regularizations={regularizations} />
                </CardContent>
            </Card>
        </div>
    );
}
