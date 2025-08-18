import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const FAMILIES_TABLE = process.env.FAMILIES_TABLE || "Families";

export const handler = async (event) => {
  try {
    if (!FAMILIES_TABLE) throw new Error("Missing env FAMILIES_TABLE");

    const username = event?.detail?.requestParameters?.username; // pode ser sub OU email/alias
    const eventName = event?.detail?.eventName;
    console.log("Received event:", eventName, "username:", username);

    if (!username) {
      console.log("No username in event; nothing to do.");
      return;
    }

    const familyIds = await findFamiliesPossiblyReferencing(username);
    for (const familyId of familyIds) {
      await removeByUserIdOrEmail(familyId, username);
    }

    console.log(`Cleanup done. Families affected: ${familyIds.length}`);
  } catch (err) {
    console.error("Cleanup error:", err);
    throw err;
  }
};

async function findFamiliesPossiblyReferencing(username) {
  const affected = [];
  let lastKey;

  do {
    const page = await ddb.send(
      new ScanCommand({
        TableName: FAMILIES_TABLE,
        ExclusiveStartKey: lastKey,
        ProjectionExpression: "familyId, #m",
        ExpressionAttributeNames: { "#m": "members" },
      })
    );

    for (const item of page.Items ?? []) {
      const members = Array.isArray(item.members) ? item.members : [];
      // remove se coincidir por sub (userId) OU por email
      const hit = members.some(
        (m) => m && (m.userId === username || m.email === username)
      );
      if (hit) affected.push(item.familyId);
    }
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  return affected;
}

async function removeByUserIdOrEmail(familyId, username) {
  const current = await ddb.send(
    new GetCommand({
      TableName: FAMILIES_TABLE,
      Key: { familyId },
      ProjectionExpression: "familyId, #m",
      ExpressionAttributeNames: { "#m": "members" },
    })
  );

  const members = Array.isArray(current.Item?.members)
    ? current.Item.members
    : [];

  const next = members.filter(
    (m) => !(m && (m.userId === username || m.email === username))
  );

  if (next.length === members.length) {
    console.log(`Family ${familyId}: nothing to change.`);
    return;
  }

  await ddb.send(
    new UpdateCommand({
      TableName: FAMILIES_TABLE,
      Key: { familyId },
      UpdateExpression: "SET #m = :m",
      ExpressionAttributeNames: { "#m": "members" },
      ExpressionAttributeValues: { ":m": next },
      ConditionExpression: "attribute_exists(familyId)",
    })
  );

  console.log(`Family ${familyId}: removed user/email ${username} from members.`);
}
