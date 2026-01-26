import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretString = process.env.AUTH_SECRET;
if (!secretString) {
    throw new Error("AUTH_SECRET is not defined in environment variables. Critical security failure.");
}

const secret = new TextEncoder().encode(secretString);

export async function encrypt(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(secret);
}

export async function decrypt(input: string): Promise<any> {
    try {
        const { payload } = await jwtVerify(input, secret, {
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
