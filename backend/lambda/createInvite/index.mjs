import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import crypto from "crypto";

const base = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(base);
const ses = new SESClient({});

const INVITES_TABLE = process.env.INVITES_TABLE || "Invites";
const FAMILIES_TABLE = process.env.FAMILIES_TABLE || "Families";
const APP_BASE_URL = process.env.APP_BASE_URL || "https://app.keeply.io";
const SES_FROM = process.env.SES_FROM;

const genId = (len = 22) => crypto.randomBytes(len).toString("base64url");
const genCode = () => `FAM-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

export const handler = async (event) => {
  try {
    const auth = event.requestContext?.authorizer?.jwt?.claims || {};
    const userId = auth.sub;
    if (!userId) return res(401, { message: "Não autenticado" });

    const body = JSON.parse(event.body || "{}");
    const { familyId, type, email, role = "member", expiresInMinutes = 10 } = body;

    if (!familyId || !["email", "code"].includes(type)) {
      return res(400, { message: "Parâmetros inválidos" });
    }
    if (type === "email" && !email) {
      return res(400, { message: "Email é obrigatório quando type=email" });
    }

    // valida permissões de quem convida
    const fam = await ddb.send(new GetCommand({ TableName: FAMILIES_TABLE, Key: { familyId } }));
    if (!fam.Item) return res(404, { message: "Família não encontrada" });

    const members = Array.isArray(fam.Item.members) ? fam.Item.members : [];
    const me = members.find((m) => m.userId === userId);
    const rolesAllowed = ["parent", "guardian", "admin"];
    if (!me || !rolesAllowed.includes(me.role)) {
      return res(403, { message: "Sem permissões para convidar" });
    }

    // criar convite (expira em N minutos)
    const now = Date.now();
    const expiresAt = new Date(now + expiresInMinutes * 60 * 1000).toISOString();
    const ttl = Math.floor(now / 1000) + expiresInMinutes * 60;

    const inviteId = genId();
    const code = type === "code" ? genCode() : undefined;

    const item = {
      inviteId,
      familyId,
      type,
      email: type === "email" ? email : undefined,
      code,
      role,
      status: "pending",
      createdBy: userId,
      createdAt: new Date(now).toISOString(),
      expiresAt,
      ttl
    };

    await ddb.send(new PutCommand({ TableName: INVITES_TABLE, Item: item }));

    if (type === "email" && SES_FROM) {
      const link = `${APP_BASE_URL}/invite?inviteId=${encodeURIComponent(inviteId)}`;
      await ses.send(new SendEmailCommand({
        Destination: { ToAddresses: [email] },
        Source: SES_FROM,
        Message: {
          Subject: { Data: "Convite para te juntares à tua família no Keeply" },
          Body: {
            Html: {
              Data: `
                <p>Foste convidado(a) a juntar-te à tua família no Keeply.</p>
                <p><a href="${link}">Aceitar convite</a></p>
                <p>Este convite expira às: <strong>${expiresAt}</strong></p>
              `
            }
          }
        }
      }));
    }

    return res(201, { inviteId, code, status: "pending", expiresAt });
  } catch (e) {
    console.error(e);
    return res(500, { message: "Erro a criar convite" });
  }
};

const res = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
