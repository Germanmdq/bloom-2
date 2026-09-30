// Permite a `node --test` importar módulos TypeScript sin extensión
// (`./dates` → `./dates.ts`), igual que lo resuelve Next.js.
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
      export async function resolve(specifier, context, next) {
        try {
          return await next(specifier, context);
        } catch (err) {
          if ((specifier.startsWith(".") || specifier.startsWith("/")) && !/\\.[cm]?[jt]s$/.test(specifier)) {
            return next(specifier + ".ts", context);
          }
          throw err;
        }
      }
    `),
  import.meta.url,
);
