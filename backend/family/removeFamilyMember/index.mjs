import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "eu-north-1";
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

const FAMILIES_TABLE = process.env.FAMILIES_TABLE || "Families";
const ROLES_CAN_MANAGE = ["admin", "parent", "guardian"];

export const handler = async (event) => {
  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims || {};
    const actorId = claims.sub;
    if (!actorId) return res(401, { message: "Não autenticado" });

    const familyId = event.pathParameters?.familyId;
    const targetUserId = event.pathParameters?.userId;
    if (!familyId || !targetUserId) {
      return res(400, { message: "familyId e userId são obrigatórios no path" });
    }

    // 1) Buscar família
    const out = await ddb.send(new GetCommand({
      TableName: FAMILIES_TABLE,
      Key: { familyId }
    }));
    const family = out.Item;
    if (!family) return res(404, { message: "Família não encontrada" });

    const members = Array.isArray(family.members) ? family.members : [];

    // 2) Valida actor (tem de ser admin/parent/guardian na MESMA família)
    const me = members.find((m) => m.userId === actorId);
    if (!me || !ROLES_CAN_MANAGE.includes(me.role)) {
      return res(403, { message: "Sem permissões para remover membros" });
    }

    // 3) Valida alvo (tem de ser membro da família)
    const target = members.find((m) => m.userId === targetUserId);
    if (!target) return res(404, { message: "Utilizador não pertence a esta família" });

    // 4) Proteções: não remover o último admin
    const adminCount = members.filter((m) => ROLES_CAN_MANAGE.includes(m.role)).length;
    const targetIsAdmin = ROLES_CAN_MANAGE.includes(target.role);
    if (targetIsAdmin && adminCount <= 1) {
      return res(400, { message: "Não é possível remover o último admin da família" });
    }

    // 5) Atualizar a lista de membros
    const newMembers = members.filter((m) => m.userId !== targetUserId);

    await ddb.send(new UpdateCommand({
      TableName: FAMILIES_TABLE,
      Key: { familyId },
      UpdateExpression: "SET #members = :m",
      ExpressionAttributeNames: { "#members": "members" },
      ExpressionAttributeValues: { ":m": newMembers }
    }));

    return res(200, { message: "Membro removido", familyId, removedUserId: targetUserId });
  } catch (err) {
    console.error("removeFamilyMember ERROR:", err);
    return res(500, { message: "Erro ao remover membro" });
  }
};

const res = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "*",
  },
  body: JSON.stringify(body),
});
