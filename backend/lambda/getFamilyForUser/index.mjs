// lambda/getFamilyForUser.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const base = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(base);

const FAMILIES_TABLE = process.env.FAMILIES_TABLE || "Families";

export const handler = async (event) => {
  try {
    const auth = event?.requestContext?.authorizer?.jwt?.claims || {};
    const userId = auth.sub;
    if (!userId) return res(401, { message: "Não autenticado" });

    // Scan simples (MVP). Mais tarde trocamos por GSI.
    const result = await ddb.send(new ScanCommand({ TableName: FAMILIES_TABLE }));
    const families = result.Items || [];

    const myFamily = families.find(
      (fam) => Array.isArray(fam.members) && fam.members.some((m) => m.userId === userId)
    );

    if (!myFamily) return res(404, { message: "Família não encontrada" });
    return res(200, myFamily);
  } catch (err) {
    console.error("getFamilyForUser error:", err);
    return res(500, { message: "Erro ao procurar família" });
  }
};

const res = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
