// delete-family.mjs
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const FAMILIES_TABLE = process.env.FAMILIES_TABLE || "Families";

const ADMIN_ROLES = new Set(["admin", "parent", "guardian"]);

export const handler = async (event) => {
  try {
    if (!FAMILIES_TABLE) return json(500, { message: "Missing env FAMILIES_TABLE" });

    const familyId = event?.pathParameters?.familyId;
    if (!familyId) return json(400, { message: "familyId is required" });

    const callerSub = getCallerSub(event);
    if (!callerSub) return json(401, { message: "Unauthorized" });

    // 1) Ler família
    const out = await ddb.send(new GetCommand({
      TableName: FAMILIES_TABLE,
      Key: { familyId },
      ProjectionExpression: "familyId, members"
    }));
    if (!out.Item) return json(404, { message: "Family not found" });

    const members = Array.isArray(out.Item.members) ? out.Item.members : [];
    const me = members.find((m) => m?.userId === callerSub);

    if (!me) return json(403, { message: "You are not a member of this family" });
    if (!ADMIN_ROLES.has(me.role)) return json(403, { message: "Only admins can delete the family" });

    // (opcional) bloquear apagar se for a última família de algo, etc.
    // 2) Apagar
    await ddb.send(new DeleteCommand({
      TableName: FAMILIES_TABLE,
      Key: { familyId },
      ConditionExpression: "attribute_exists(familyId)"
    }));

    return json(204);
  } catch (err) {
    console.error("delete-family error:", err);
    return json(500, { message: "Failed to delete family" });
  }
};

function getCallerSub(event) {
  // HTTP API v2
  const v2 = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (v2) return v2;
  // REST API v1
  const v1 = event?.requestContext?.authorizer?.claims?.sub;
  if (v1) return v1;
  return null;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : ""
  };
}
