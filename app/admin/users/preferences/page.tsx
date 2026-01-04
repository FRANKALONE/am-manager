import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function UserPreferencesPage() {
    const userEmail = cookies().get("user_email")?.value;

    if (!userEmail) {
        redirect("/login");
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h2 className="text-xl font-bold text-yellow-800 mb-2">
                    Preferencias de Usuario - Próximamente
                </h2>
                <p className="text-yellow-700">
                    Esta funcionalidad estará disponible próximamente una vez se complete la migración de base de datos en producción.
                </p>
                <p className="text-sm text-yellow-600 mt-4">
                    Incluirá: Selección de idioma (ES, EN, PT, IT, FR, HI) y zona horaria personalizada.
                </p>
            </div>
        </div>
    );
}
