// index.mjs  — POST /families/{familyId}/transfer-owner
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// nome da tabela das famílias (um item por família, com lista "members")
const FAMILIES_TABLE = process.env.FAMILIES_TABLE || "Families";
// quais os papéis com poderes de admin
const ADMIN_ROLES = new Set(["admin"]);

export const handler = async (event) => {
  try {
    const familyId = event?.pathParameters?.familyId;
    if (!familyId) return resp(400, "Missing familyId");

    const sub = event?.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!sub) return resp(401, "Unauthorized");

    const body = event?.body ? JSON.parse(event.body) : {};
    const newOwnerUserId = body?.newOwnerUserId;
    if (!newOwnerUserId) return resp(400, "newOwnerUserId is required");
    if (newOwnerUserId === sub) return resp(400, "Cannot transfer to yourself");

    // 1) ler família
    const got = await ddb.send(
      new GetCommand({
        TableName: FAMILIES_TABLE,
        Key: { familyId },
      })
    );
    const fam = got.Item;
    if (!fam) return resp(404, "Family not found");

    const members = Array.isArray(fam.members) ? fam.members : [];
    const meIdx = members.findIndex((m) => m?.userId === sub);
    const targetIdx = members.findIndex((m) => m?.userId === newOwnerUserId);

    if (meIdx === -1) return resp(403, "Caller is not a member of this family");
    if (!ADMIN_ROLES.has(String(members[meIdx]?.role || "")))
      return resp(403, "Only admins can transfer ownership");

    if (targetIdx === -1) return resp(404, "Target user is not a member of this family");

    // 2) troca de papéis na lista em memória
    const newMembers = members.map((m, i) => {
      if (i === meIdx) return { ...m, role: "member" };
      if (i === targetIdx) return { ...m, role: "admin" };
      return m;
    });

    // 3) gravar de volta (update do campo members)
    await ddb.send(
      new UpdateCommand({
        TableName: FAMILIES_TABLE,
        Key: { familyId },
        UpdateExpression: "SET #members = :members",
        ExpressionAttributeNames: { "#members": "members" },
        ExpressionAttributeValues: { ":members": newMembers },
        ConditionExpression: "attribute_exists(familyId)",
      })
    );

    return json(200, {
      familyId,
      previousOwner: sub,
      newOwner: newOwnerUserId,
      roles: { [sub]: "member", [newOwnerUserId]: "admin" },
    });
  } catch (err) {
    console.error("transfer-owner error", err);
    return resp(500, err?.message || "Internal error");
  }
};

function resp(code, message) {
  return {
    statusCode: code,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  };
}
function json(code, data) {
  return {
    statusCode: code,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  };
}
