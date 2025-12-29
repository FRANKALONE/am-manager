/**
 * Executes an array of factory functions that return promises, 
 * limiting the number of concurrent executions.
 */
export async function limitConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
    const results: T[] = [];
    const executing = new Set<Promise<any>>();

    for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p as any);
        executing.add(p);

        const clean = () => executing.delete(p);
        p.then(clean).catch(clean);

        if (executing.size >= limit) {
            await Promise.race(executing);
        }
    }

    return Promise.all(results);
}
