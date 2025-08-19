import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "eu-north-1";
const TABLE  = process.env.FAMILIES_TABLE || "Families";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// tenta ler o 'sub' do authorizer; se não houver, decodifica o header Bearer manualmente
function getUserSub(event) {
  // HTTP API v2 (JWT authorizer)
  const v2 = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (v2) return v2;

  // REST API (Cognito authorizer)
  const rest = event?.requestContext?.authorizer?.claims?.sub;
  if (rest) return rest;

  // Fallback: Authorization: Bearer <token>
  const auth = event.headers?.authorization || event.headers?.Authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;

  const token = auth.slice(7);
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    // base64url -> json
    const json = Buffer.from(parts[1], "base64").toString("utf8");
    const payload = JSON.parse(json);
    return payload?.sub || null;
  } catch {
    return null;
  }
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (event) => {
  try {
    const userSub = getUserSub(event);
    if (!userSub) return respond(401, { message: "Não autenticado" });

    // MVP: Scan e filtragem em código
    const scanRes = await ddb.send(new ScanCommand({ TableName: TABLE }));
    const items = scanRes.Items || [];

    let family = null;
    let myRole = "member";

    for (const it of items) {
      const members = Array.isArray(it.members) ? it.members : [];
      const me = members.find(m => m?.userId === userSub);
      if (me) {
        family = it;
        myRole = me.role || "member";
        break;
      }
    }

    if (!family) return respond(404, { message: "Família não encontrada" });

    const resp = {
      id: family.familyId,
      name: family.name || "",
      plan: family.plan || "free",
      membersCount: Array.isArray(family.members) ? family.members.length : 0,
      myRole,
    };

    return respond(200, resp);
  } catch (err) {
    console.error("getFamilyByUser error:", err);
    return respond(500, { message: "Erro interno" });
  }
};
