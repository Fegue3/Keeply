// lambda/createFamily.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const ddb = new DynamoDBClient({});
const FAMILIES_TABLE = process.env.FAMILIES_TABLE || "Families";

const genFamilyId = () => `fam-${crypto.randomBytes(4).toString("hex")}`;

export const handler = async (event) => {
  try {
    const auth = event.requestContext?.authorizer?.jwt?.claims || {};
    const userId = auth.sub;
    if (!userId) return res(401, { message: "Não autenticado" });

    const body = JSON.parse(event.body || "{}");
    const { name, description = "" } = body;

    if (!name) return res(400, { message: "Nome da família é obrigatório" });

    // Verifica se o user já tem família (por scan)
    const result = await ddb.send(new ScanCommand({ TableName: FAMILIES_TABLE }));
    const families = result.Items || [];

    const alreadyInFamily = families.some(f =>
      Array.isArray(f.members) && f.members.some(m => m.userId === userId)
    );

    if (alreadyInFamily) {
      return res(409, { message: "Já pertences a uma família" });
    }

    // Criar nova família
    const now = new Date().toISOString();
    const familyId = genFamilyId();

    const item = {
      familyId,
      name,
      description,
      createdAt: now,
      createdBy: userId,
      members: [
        {
          userId,
          role: "parent",
          joinedAt: now
        }
      ]
    };

    await ddb.send(new PutCommand({ TableName: FAMILIES_TABLE, Item: item }));

    return res(201, { familyId });
  } catch (err) {
    console.error(err);
    return res(500, { message: "Erro ao criar família" });
  }
};

const res = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});
