import { getClientProducts, deleteClientProduct } from "@/app/actions/products";
import { getClients } from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getTranslations } from "@/lib/get-translations";
import { ProductsTable } from "./components/products-table";
import { ProductDialog } from "./components/product-dialog";

export default async function ProductsPage() {
    const products = await getClientProducts();
    const clients = await getClients();
    const { t } = await getTranslations();

    async function deleteAction(id: string) {
        "use server";
        await deleteClientProduct(id);
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-dark-green font-anek">
                        {t('altimProducts.title')}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('altimProducts.subtitle')}
                    </p>
                </div>
                <ProductDialog
                    clients={clients}
                    trigger={
                        <Button className="bg-dark-green hover:bg-opacity-90">
                            <Plus className="mr-2 h-4 w-4" /> {t('altimProducts.newButton')}
                        </Button>
                    }
                />
            </div>

            <ProductsTable
                products={products}
                clients={clients}
                deleteAction={deleteAction}
            />
        </div>
    );
}
