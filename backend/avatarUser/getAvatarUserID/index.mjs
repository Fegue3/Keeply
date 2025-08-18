// Lambda: keeply-user-avatar-view-url-by-id
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AVATAR_BUCKET;
const USER_POOL_ID = process.env.USER_POOL_ID;

const s3 = new S3Client({ region: REGION });
const cip = new CognitoIdentityProviderClient({ region: REGION });

const json = (code, body) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  try {
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    if (!claims) return json(401, { error: "Unauthorized" });

    const userId = event?.pathParameters?.userId;
    if (!userId) return json(400, { error: "Missing userId" });

    // TODO (segurança): validar que requester e userId pertencem à MESMA família

    const user = await cip.send(new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: userId, // tipicamente é o "cognito:username". Se guardas sub, muda lookup!
    }));

    const key = user.UserAttributes?.find(a => a.Name === "custom:picture")?.Value;
    if (!key || key === "none") return json(200, { viewUrl: null });

    // objeto existe?
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch {
      return json(200, { viewUrl: null });
    }

    const viewUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: 60 * 15 }
    );

    return json(200, { viewUrl });
  } catch (e) {
    console.error("avatar-by-id error", e);
    return json(500, { error: "Internal" });
  }
};
