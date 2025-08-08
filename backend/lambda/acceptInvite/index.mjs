// lambda/acceptInvite.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddb = new DynamoDBClient({});
const INVITES_TABLE = process.env.INVITES_TABLE || "Invites";
const FAMILIES_TABLE = process.env.FAMILIES_TABLE || "Families";

export const handler = async (event) => {
  try {
    const auth = event.requestContext?.authorizer?.jwt?.claims || {};
    const userId = auth.sub;
    const userEmail = auth.email || auth["email"];
    if (!userId) return res(401, { message: "Não autenticado" });

    const body = JSON.parse(event.body || "{}");
    const { inviteId, code } = body;
    if (!inviteId) return res(400, { message: "inviteId é obrigatório" });

    // Buscar convite
    const inv = await ddb.send(new GetCommand({ TableName: INVITES_TABLE, Key: { inviteId } }));
    const invite = inv.Item;
    if (!invite) return res(404, { message: "Convite não encontrado" });

    // Validar estado e expiração
    if (invite.status !== "pending") return res(400, { message: "Convite não está pendente" });
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      return res(400, { message: "Convite expirado" });
    }

    // Validar tipo
    if (invite.type === "email") {
      if (!userEmail || invite.email?.toLowerCase() !== userEmail.toLowerCase()) {
        return res(403, { message: "Este convite é para outro email" });
      }
    } else if (invite.type === "code") {
      if (!code || code !== invite.code) {
        return res(400, { message: "Código inválido" });
      }
    }

    // Buscar família
    const fam = await ddb.send(new GetCommand({
      TableName: FAMILIES_TABLE,
      Key: { familyId: invite.familyId }
    }));
    if (!fam.Item) return res(404, { message: "Família não encontrada" });

    // Adicionar membro se não existir
    const members = Array.isArray(fam.Item.members) ? fam.Item.members : [];
    if (!members.some(m => m.userId === userId)) {
      members.push({ userId, role: invite.role || "member" });
      await ddb.send(new UpdateCommand({
        TableName: FAMILIES_TABLE,
        Key: { familyId: invite.familyId },
        UpdateExpression: "SET #members = :m",
        ExpressionAttributeNames: { "#members": "members" },
        ExpressionAttributeValues: { ":m": members }
      }));
    }

    // Marcar convite como aceite
    await ddb.send(new UpdateCommand({
      TableName: INVITES_TABLE,
      Key: { inviteId },
      UpdateExpression: "SET #s = :s",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":s": "accepted" }
    }));

    return res(200, { message: "Convite aceite", familyId: invite.familyId, role: invite.role || "member" });
  } catch (e) {
    console.error(e);
    return res(500, { message: "Erro a aceitar convite" });
  }
};

const res = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
