// Node.js 18+ runtime
// npm deps: (nenhuma; usa AWS SDK v3 já disponível no runtime)

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const FAMILIES_TABLE = process.env.FAMILIES_TABLE;

// EventBridge -> AWS API Call via CloudTrail para cognito-idp AdminDeleteUser/DeleteUser
export const handler = async (event) => {
  try {
    const userId = event?.detail?.requestParameters?.username;
    if (!FAMILIES_TABLE) throw new Error("Missing env FAMILIES_TABLE");
    if (!userId) {
      console.log("No username in event; nothing to do.");
      return;
    }

    console.log("Cleanup for deleted user:", userId);

    // 1) Encontrar TODAS as famílias que contêm este user em members
    const familyIds = await findFamiliesWithUser(userId);

    // 2) Remover o user do array members em cada família
    for (const familyId of familyIds) {
      await removeUserFromFamily(familyId, userId);
    }

    console.log(`Done. Families affected: ${familyIds.length}`);
  } catch (err) {
    console.error("Cleanup error:", err);
    throw err;
  }
};

async function findFamiliesWithUser(userId) {
  const affected = [];
  let lastKey;

  do {
    const page = await ddb.send(
      new ScanCommand({
        TableName: FAMILIES_TABLE,
        ExclusiveStartKey: lastKey,
        // só precisamos destes atributos
        ProjectionExpression: "familyId, #m",
        ExpressionAttributeNames: { "#m": "members" },
      })
    );

    for (const item of page.Items ?? []) {
      const members = Array.isArray(item.members) ? item.members : [];
      if (members.some((m) => m && m.userId === userId)) {
        affected.push(item.familyId);
      }
    }
    lastKey = page.LastEvaluatedKey;
  } while (lastKey);

  return affected;
}

async function removeUserFromFamily(familyId, userId) {
  // lê o doc para termos a lista atual
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

  const next = members.filter((m) => m && m.userId !== userId);

  // se não mudou, não vamos escrever
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

  console.log(`Family ${familyId}: user ${userId} removed from members.`);
}
