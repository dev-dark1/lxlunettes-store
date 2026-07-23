import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../artifacts/api-server/src/app";
import { ensureAdminAuthSetup } from "../artifacts/api-server/src/lib/ensureAdminAuth";

const adminSetup = ensureAdminAuthSetup();

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  await adminSetup;
  return app(req, res);
}
