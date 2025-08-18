// GET /families/{familyId}/members/{userId}/avatar/view-url
// ESM (.mjs) — sem TypeScript

import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  DynamoDBClient,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const REGION         = process.env.AWS_REGION || "eu-north-1";
const BUCKET         = process.env.AVATAR_BUCKET || "keeply-prod-user-assets";
const USER_POOL_ID   = process.env.USER_POOL_ID || "eu-north-1_UZKOB6Tr7";
const FAMILIES_TABLE = process.env.FAMILIES_TABLE || "Families";

const s3  = new S3Client({ region: REGION });
const cip = new CognitoIdentityProviderClient({ region: REGION });
const ddb = new DynamoDBClient({ region: REGION });

const json = (code, body) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// Tenta username==sub; se falhar, procura por sub -> username
async function resolveUsernameFromSub(sub) {
  try {
    await cip.send(new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: sub }));
    return sub;
  } catch {
    const resp = await cip.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `sub = "${sub}"`,
      Limit: 1,
    }));
    return resp.Users?.[0]?.Username || null;
  }
}

export const handler = async (event) => {
  const rid = event?.requestContext?.requestId || "no-reqid";
  try {
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    if (!claims) return json(401, { error: "Unauthorized" });

    const requesterSub = claims.sub;
    const familyId     = event?.pathParameters?.familyId;
    const targetUserId = event?.pathParameters?.userId; // este é o sub que tens guardado em Dynamo

    if (!familyId || !targetUserId) return json(400, { error: "Missing params" });

    // 1) Autorizar via DynamoDB: requester e alvo têm de pertencer à mesma família
    const famResp = await ddb.send(new GetItemCommand({
      TableName: FAMILIES_TABLE,
      Key: { familyId: { S: familyId } },
      ConsistentRead: true,
    }));
    if (!famResp.Item) return json(404, { error: "Family not found" });
    const family = unmarshall(famResp.Item);
    const members = Array.isArray(family.members) ? family.members : [];

    const meInFamily     = members.some(m => m && m.userId === requesterSub);
    const targetInFamily = members.some(m => m && m.userId === targetUserId);
    if (!meInFamily || !targetInFamily) return json(403, { error: "Forbidden" });

    // 2) Resolver username do alvo (Cognito)
    const username = await resolveUsernameFromSub(targetUserId);
    if (!username) return json(200, { viewUrl: null });

    // 3) Ler atributo custom:picture
    const user = await cip.send(new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    }));
    const key = user.UserAttributes?.find(a => a.Name === "custom:picture")?.Value || null;
    if (!key || key === "none") return json(200, { viewUrl: null });

    // 4) Confirmar que o objeto existe e assinar URL temporário
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch {
      return json(200, { viewUrl: null });
    }

    const viewUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: 900 } // 15min
    );

    return json(200, { viewUrl });
  } catch (e) {
    console.error(`[${rid}] avatar-view-url error`, e?.name, e?.message);
    return json(500, { error: "Internal Server Error" });
  }
};
