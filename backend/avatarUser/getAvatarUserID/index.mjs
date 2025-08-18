// keeply-user-avatar-view-url-by-id
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  ListUsersCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "eu-north-1";
const BUCKET = process.env.AVATAR_BUCKET || "keeply-prod-user-assets";
const USER_POOL_ID = process.env.USER_POOL_ID || "eu-north-1_UZKOB6Tr7";

const s3 = new S3Client({ region: REGION });
const cip = new CognitoIdentityProviderClient({ region: REGION });

const j = (c, b) => ({
  statusCode: c,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(b),
});

async function getUsernameFromSub(sub) {
  // 1º tentamos AdminGetUser assumindo que username == sub
  try {
    await cip.send(new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: sub }));
    return sub;
  } catch {
    // 2º fallback: procurar por sub -> username
    const list = await cip.send(
      new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Filter: `sub = "${sub}"`,
        Limit: 1,
      })
    );
    return list.Users?.[0]?.Username || null;
  }
}

export const handler = async (event) => {
  try {
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    if (!claims) return j(401, { error: "Unauthorized" });

    const sub = event?.pathParameters?.userId;
    if (!sub) return j(400, { error: "Missing userId" });

    const username = await getUsernameFromSub(sub);
    if (!username) return j(200, { viewUrl: null });

    const user = await cip.send(
      new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: username })
    );

    const key =
      user.UserAttributes?.find((a) => a.Name === "custom:picture")?.Value || null;

    if (!key || key === "none") return j(200, { viewUrl: null });

    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch {
      return j(200, { viewUrl: null });
    }

    const viewUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: 900 }
    );

    return j(200, { viewUrl });
  } catch (e) {
    console.error("avatar-by-id error", e);
    return j(500, { error: "Internal" });
  }
};
