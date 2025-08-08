// lambda/acceptInvite.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const base = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(base);

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

    // 1) Buscar convite
    const inv = await ddb.send(new GetCommand({ TableName: INVITES_TABLE, Key: { inviteId } }));
    const invite = inv.Item;
    if (!invite) return res(404, { message: "Convite não encontrado" });
    if (invite.status !== "pending") return res(400, { message: "Convite não está pendente" });
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      return res(400, { message: "Convite expirado" });
    }

    // ⚠️ Novo: não permitir aceitar um convite criado por mim próprio
    if (invite.createdBy && invite.createdBy === userId) {
      return res(403, { message: "Não podes aceitar um convite que criaste. O convite permanece pendente." });
    }

    // 2) Validar tipo (email vs code)
    if (invite.type === "email") {
      if (!userEmail || invite.email?.toLowerCase() !== String(userEmail).toLowerCase()) {
        return res(403, { message: "Este convite é para outro email" });
      }
    } else if (invite.type === "code") {
      if (!code || code !== invite.code) return res(400, { message: "Código inválido" });
    }

    // 3) Regra: um utilizador só pode pertencer a UMA família
    const famScan = await ddb.send(new ScanCommand({ TableName: FAMILIES_TABLE, ProjectionExpression: "familyId, members" }));
    const existingFam = (famScan.Items || []).find(f =>
      Array.isArray(f.members) && f.members.some(m => m.userId === userId)
    );

    if (existingFam && existingFam.familyId !== invite.familyId) {
      // já pertence a outra família → mantém pendente
      return res(409, {
        message: "Já pertences a uma família. Sai da família atual para aceitar este convite. O convite permanece pendente.",
        currentFamilyId: existingFam.familyId,
        requestedFamilyId: invite.familyId
      });
    }

    // 4) Buscar família do convite
    const fam = await ddb.send(new GetCommand({
      TableName: FAMILIES_TABLE,
      Key: { familyId: invite.familyId }
    }));
    if (!fam.Item) return res(404, { message: "Família não encontrada" });

    // 5) Se já é membro desta família → NÃO aceitar, manter pendente
    const members = Array.isArray(fam.Item.members) ? fam.Item.members : [];
    const alreadyMember = members.some(m => m.userId === userId);
    if (alreadyMember) {
      return res(409, {
        message: "Já és membro desta família. O convite continua pendente.",
        familyId: invite.familyId,
        status: invite.status
      });
    }

    // 6) Adicionar membro (só agora é permitido)
    const newMembers = [...members, { userId, role: invite.role || "member", joinedAt: new Date().toISOString() }];
    await ddb.send(new UpdateCommand({
      TableName: FAMILIES_TABLE,
      Key: { familyId: invite.familyId },
      UpdateExpression: "SET #members = :m",
      ExpressionAttributeNames: { "#members": "members" },
      ExpressionAttributeValues: { ":m": newMembers }
    }));

    // 7) Marcar convite como aceite (apenas se adicionou membro)
    await ddb.send(new UpdateCommand({
      TableName: INVITES_TABLE,
      Key: { inviteId },
      UpdateExpression: "SET #s = :s, acceptedBy = :u, acceptedAt = :t",
      ConditionExpression: "#s = :pending", // evita race e aceitar duas vezes
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":s": "accepted",
        ":u": userId,
        ":t": new Date().toISOString(),
        ":pending": "pending"
      }
    }));

    return res(200, {
      message: "Convite aceite com sucesso.",
      familyId: invite.familyId,
      role: invite.role || "member"
    });
  } catch (e) {
    console.error("acceptInvite error:", e);
    return res(500, { message: "Erro a aceitar convite" });
  }
};

const res = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
