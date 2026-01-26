import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

function getSecret() {
    const secretString = process.env.AUTH_SECRET;
    if (!secretString) {
        // Log error but don't throw during build to avoid crashing Next.js static analysis
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return new TextEncoder().encode("only-for-build-time-fallback");
        }
        throw new Error("AUTH_SECRET is not defined in environment variables. Critical security failure.");
    }
    return new TextEncoder().encode(secretString);
}

export async function encrypt(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(getSecret());
}

export async function decrypt(input: string): Promise<any> {
    try {
        const { payload } = await jwtVerify(input, getSecret(), {
            algorithms: ["HS256"],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

export async function getSession() {
    const session = cookies().get("session")?.value;
    if (!session) return null;
    return await decrypt(session);
}
