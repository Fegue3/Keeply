// index.mjs  — set-role
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const FAMILIES_TABLE = process.env.FAMILIES_TABLE || "Families";
const ALLOWED_ROLES = new Set(["member", "parent", "guardian", "admin"]);
const PRIVILEGED_ROLES = new Set(["admin", "parent", "guardian"]); // quem pode convidar/remover
const OWNER_ROLE = "admin"; // quem tem danger zone e pode gerir papéis

export const handler = async (event) => {
  try {
    const familyId = event?.pathParameters?.familyId;
    if (!familyId) return json(400, { message: "Missing familyId" });

    const sub = event?.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!sub) return json(401, { message: "Unauthorized" });

    const body = event?.body ? JSON.parse(event.body) : {};
    const targetUserId = body?.targetUserId;
    const newRole = body?.newRole;
    if (!targetUserId || !newRole) return json(400, { message: "targetUserId and newRole are required" });
    if (!ALLOWED_ROLES.has(newRole)) return json(400, { message: "Invalid role" });

    // 1) obter família
    const got = await ddb.send(new GetCommand({ TableName: FAMILIES_TABLE, Key: { familyId } }));
    const fam = got.Item;
    if (!fam) return json(404, { message: "Family not found" });

    const members = Array.isArray(fam.members) ? fam.members : [];
    const meIdx = members.findIndex((m) => m?.userId === sub);
    if (meIdx === -1) return json(403, { message: "Caller is not a family member" });

    // 2) apenas OWNER (admin) pode gerir papéis
    const myRole = members[meIdx]?.role || "member";
    if (myRole !== OWNER_ROLE) return json(403, { message: "Only admins can set roles" });

    const targetIdx = members.findIndex((m) => m?.userId === targetUserId);
    if (targetIdx === -1) return json(404, { message: "Target user not found" });

    const currentRole = members[targetIdx]?.role || "member";
    if (currentRole === newRole) {
      return json(200, { familyId, targetUserId, role: newRole, unchanged: true });
    }

    // 3) regra: nunca deixar a família sem admin
    const adminsCount = members.reduce((n, m) => (m?.role === OWNER_ROLE ? n + 1 : n), 0);
    const isTargetAdmin = currentRole === OWNER_ROLE;
    const demotingAdmin = isTargetAdmin && newRole !== OWNER_ROLE;

    if (demotingAdmin && adminsCount <= 1) {
      return json(409, { message: "Cannot remove the last admin of the family" });
    }

    // 4) aplicar alteração em memória
    const newMembers = members.map((m, i) => (i === targetIdx ? { ...m, role: newRole } : m));

    // 5) gravar (update do campo members)
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

    return json(200, { familyId, targetUserId, role: newRole });
  } catch (e) {
    console.error("set-role error", e);
    return json(500, { message: e?.message || "Internal error" });
  }
};

function json(statusCode, data) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(data) };
}
