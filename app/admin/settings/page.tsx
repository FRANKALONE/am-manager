import { getParametersByCategory, createParameter, deleteParameter } from "@/app/actions/parameters";
import { getCorrectionModels } from "@/app/actions/correction-models";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { revalidatePath } from "next/cache";
import { CorrectionModelsManager } from "./components/models-manager";
import { DatabaseMaintenance } from "./components/database-maintenance";

export default async function SettingsPage() {

    // Fetch initial data (can be improved with parallel fetching)
    const contractTypes = await getParametersByCategory("CONTRACT_TYPE");
    const billingTypes = await getParametersByCategory("BILLING_TYPE");
    const correctionModels = await getCorrectionModels();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                <p className="text-muted-foreground">
                    Gestiona las listas desplegables y parámetros del sistema.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">

                {/* Managing Models - Full Width */}
                <CorrectionModelsManager models={correctionModels} />

                <ParameterManager
                    title="Tipos de Contrato"
                    category="CONTRACT_TYPE"
                    data={contractTypes}
                />
                <ParameterManager
                    title="Tipos de Facturación"
                    category="BILLING_TYPE"
                    data={billingTypes}
                />
                <ParameterManager
                    title="Tipos de Regularización"
                    category="REGULARIZATION_TYPE"
                    data={await getParametersByCategory("REGULARIZATION_TYPE")}
                />
                <ParameterManager
                    title="Unidades de Alcance"
                    category="SCOPE_UNIT"
                    data={await getParametersByCategory("SCOPE_UNIT")}
                />
                <ParameterManager
                    title="Tipos de Renovación"
                    category="RENEWAL_TYPE"
                    data={await getParametersByCategory("RENEWAL_TYPE")}
                />
                <ParameterManager
                    title="Gerentes"
                    category="MANAGER"
                    data={await getParametersByCategory("MANAGER")}
                />

                {/* Sync Configuration Section */}
                <div className="col-span-full pt-8 border-t">
                    <h2 className="text-2xl font-bold mb-4">Configuración de Sincronización con Tempo</h2>
                    <p className="text-muted-foreground mb-6">Define qué tipos de tickets de Jira se deben considerar al sincronizar con Tempo.</p>
                    <div className="grid gap-8 md:grid-cols-2">
                        <ParameterManager
                            title="Tipos de Tickets Válidos"
                            category="VALID_TICKET_TYPE"
                            data={await getParametersByCategory("VALID_TICKET_TYPE")}
                        />
                        <Card>
                            <CardHeader>
                                <CardTitle>Información</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-2">
                                <p>Los tipos de tickets configurados aquí se usarán para filtrar los worklogs de Tempo.</p>
                                <p className="font-medium text-foreground">Nota especial sobre "Evolutivo":</p>
                                <p>Los tickets de tipo "Evolutivo" solo se sincronizarán si su Modo de Facturación es "T&M contra bolsa". No es necesario añadirlo a esta lista.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Custom Fields Definitions */}
                <div className="col-span-full pt-8 border-t">
                    <h2 className="text-2xl font-bold mb-4">Definición de Campos Personalizados</h2>
                    <p className="text-muted-foreground mb-6">Define nuevos campos que aparecerán en los formularios automáticamente.</p>
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        <ParameterManager
                            title="Campos Extra: Clientes"
                            category="CUSTOM_FIELD_CLIENT"
                            data={await getParametersByCategory("CUSTOM_FIELD_CLIENT")}
                        />
                        <ParameterManager
                            title="Campos Extra: Proyectos"
                            category="CUSTOM_FIELD_PROJECT"
                            data={await getParametersByCategory("CUSTOM_FIELD_PROJECT")}
                        />
                        <ParameterManager
                            title="Campos Extra: Work Packages"
                            category="CUSTOM_FIELD_WP"
                            data={await getParametersByCategory("CUSTOM_FIELD_WP")}
                        />
                    </div>
                </div>
                {/* Database Maintenance */}
                <div className="col-span-full pt-8 border-t">
                    <DatabaseMaintenance />
                </div>
            </div>
        </div>
    );
}

// Client Component for Parameter Management
import { Plus, Trash2 } from "lucide-react";
import { ParameterForm } from "./components/parameter-form";

async function ParameterManager({ title, category, data }: { title: string, category: string, data: any[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>Valores disponibles para {title}</CardDescription>
            </CardHeader>
            <CardContent>
                <ParameterForm category={category} />

                <div className="rounded-md border mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Etiqueta</TableHead>
                                <TableHead>Valor Interno</TableHead>
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
                                    <TableCell colSpan={3} className="text-center text-muted-foreground">No hay registros</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
