// lambda/acceptInvite.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  ScanCommand,
  // QueryCommand, // <- usa se tiveres GSI "code-index"
} from "@aws-sdk/lib-dynamodb";

const base = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(base);

const INVITES_TABLE = process.env.INVITES_TABLE || "Invites";
const FAMILIES_TABLE = process.env.FAMILIES_TABLE || "Families";
// const INVITES_CODE_INDEX = process.env.INVITES_CODE_INDEX || "code-index"; // opcional, se criares GSI

export const handler = async (event) => {
  try {
    const auth = event.requestContext?.authorizer?.jwt?.claims || {};
    const userId = auth.sub;
    const userEmail = auth.email || auth["email"];
    if (!userId) return res(401, { message: "Não autenticado" });

    const body = JSON.parse(event.body || "{}");
    let { inviteId, code } = body;

    if (!inviteId && !code) {
      return res(400, { message: "Código é obrigatório" });
    }

    // 1) Buscar convite (por ID OU por code)
    let invite = null;

    if (inviteId) {
      const inv = await ddb.send(new GetCommand({ TableName: INVITES_TABLE, Key: { inviteId } }));
      invite = inv.Item;
    } else if (code) {
      code = String(code).trim();

      // --- Preferível (se tiveres GSI por 'code'):
      // const q = await ddb.send(new QueryCommand({
      //   TableName: INVITES_TABLE,
      //   IndexName: INVITES_CODE_INDEX,
      //   KeyConditionExpression: "#c = :code",
      //   ExpressionAttributeNames: { "#c": "code" },
      //   ExpressionAttributeValues: { ":code": code }
      // }));
      // const candidates = q.Items || [];

      // --- MVP (sem GSI): Scan por type=code + code
      const scan = await ddb.send(new ScanCommand({
        TableName: INVITES_TABLE,
        FilterExpression: "#type = :t AND #code = :c",
        ExpressionAttributeNames: { "#type": "type", "#code": "code" },
        ExpressionAttributeValues: { ":t": "code", ":c": code }
      }));
      const candidates = scan.Items || [];

      const now = Date.now();
      invite = candidates
        .filter(it => it.status === "pending" && new Date(it.expiresAt).getTime() > now)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      inviteId = invite?.inviteId;
    }

    if (!invite) return res(404, { message: "Convite não encontrado" });
    if (invite.status !== "pending") return res(400, { message: "Convite não está pendente" });
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      return res(400, { message: "Convite expirado" });
    }

    // proteção: não aceitar convite criado por mim
    if (invite.createdBy && invite.createdBy === userId) {
      return res(403, { message: "Não podes aceitar um convite que criaste. O convite permanece pendente." });
    }

    // validar tipo (email vs code)
    if (invite.type === "email") {
      if (!userEmail || invite.email?.toLowerCase() !== String(userEmail).toLowerCase()) {
        return res(403, { message: "Este convite é para outro email" });
      }
    } else if (invite.type === "code") {
      if (code && code !== invite.code) {
        return res(400, { message: "Código inválido" });
      }
    }

    // 2) Regra: utilizador só pode pertencer a UMA família
    const famScan = await ddb.send(new ScanCommand({
      TableName: FAMILIES_TABLE,
      ProjectionExpression: "familyId, members"
    }));
    const existingFam = (famScan.Items || []).find(f =>
      Array.isArray(f.members) && f.members.some(m => m.userId === userId)
    );
    if (existingFam && existingFam.familyId !== invite.familyId) {
      return res(409, {
        message: "Já pertences a uma família. Sai da família atual para aceitar este convite. O convite permanece pendente.",
        currentFamilyId: existingFam.familyId,
        requestedFamilyId: invite.familyId
      });
    }

    // 3) Buscar família do convite
    const fam = await ddb.send(new GetCommand({
      TableName: FAMILIES_TABLE,
      Key: { familyId: invite.familyId }
    }));
    if (!fam.Item) return res(404, { message: "Família não encontrada" });

    // 4) Já és membro desta família?
    const members = Array.isArray(fam.Item.members) ? fam.Item.members : [];
    const alreadyMember = members.some(m => m.userId === userId);
    if (alreadyMember) {
      return res(409, {
        message: "Já és membro desta família. O convite continua pendente.",
        familyId: invite.familyId,
        status: invite.status
      });
    }

    // 5) Adicionar membro
    const newMembers = [
      ...members,
      { userId, role: invite.role || "member", joinedAt: new Date().toISOString() }
    ];
    await ddb.send(new UpdateCommand({
      TableName: FAMILIES_TABLE,
      Key: { familyId: invite.familyId },
      UpdateExpression: "SET #members = :m",
      ExpressionAttributeNames: { "#members": "members" },
      ExpressionAttributeValues: { ":m": newMembers }
    }));

    // 6) Marcar convite como aceite (condição evita aceitar 2x)
    await ddb.send(new UpdateCommand({
      TableName: INVITES_TABLE,
      Key: { inviteId },
      UpdateExpression: "SET #s = :s, acceptedBy = :u, acceptedAt = :t",
      ConditionExpression: "#s = :pending",
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
