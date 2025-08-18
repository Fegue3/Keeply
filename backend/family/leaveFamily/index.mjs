import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "eu-north-1";
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

const FAMILIES_TABLE = process.env.FAMILIES_TABLE || "Families";
const ADMIN_ROLES = new Set(["admin", "parent", "guardian"]);

export const handler = async (event) => {
  try {
    // ---- auth ----
    const claims =
      event?.requestContext?.authorizer?.jwt?.claims || // HTTP API v2
      event?.requestContext?.authorizer?.claims ||       // REST API v1
      {};
    const actorId = claims.sub;
    if (!actorId) return res(401, { message: "Não autenticado" });

    // ---- params ----
    const familyId = event?.pathParameters?.familyId;
    if (!familyId) return res(400, { message: "familyId é obrigatório no path" });

    // ---- load family ----
    const out = await ddb.send(
      new GetCommand({ TableName: FAMILIES_TABLE, Key: { familyId } })
    );
    const family = out.Item;
    if (!family) return res(404, { message: "Família não encontrada" });

    const members = Array.isArray(family.members) ? family.members : [];
    if (!members.length) return res(400, { message: "Família sem membros válidos" });

    // ---- validate membership ----
    const me = members.find((m) => m?.userId === actorId);
    if (!me) return res(403, { message: "Não pertences a esta família" });

    // ---- business rules ----
    if (ADMIN_ROLES.has(me.role)) {
      // no teu front já bloqueias admins, reforçamos no backend
      return res(403, { message: "Admins não podem sair por aqui. Transfere a gestão ou apaga a família." });
    }

    if (members.length <= 1) {
      // evita deixar uma família “vazia” (alinha com a UI que só mostra remover se >1)
      return res(400, { message: "Não é possível sair: és o único membro da família." });
    }

    // ---- update ----
    const newMembers = members.filter((m) => m?.userId !== actorId);

    await ddb.send(
      new UpdateCommand({
        TableName: FAMILIES_TABLE,
        Key: { familyId },
        UpdateExpression: "SET #members = :m",
        ExpressionAttributeNames: { "#members": "members" },
        ExpressionAttributeValues: { ":m": newMembers },
        ConditionExpression: "attribute_exists(familyId)",
      })
    );

    return res(204);
  } catch (err) {
    console.error("leaveFamily ERROR:", err);
    return res(500, { message: "Erro ao sair da família" });
  }
};

// util
const res = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "*",
  },
  body: body ? JSON.stringify(body) : "",
});
