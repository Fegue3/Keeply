// env: AVATAR_BUCKET, AWS_REGION
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const s3 = new S3Client({ region: "eu-north-1" });

export const handler = async (event) => {
  const claims = event.requestContext.authorizer.jwt.claims;
  const sub = claims.sub;
  const { contentType = "image/jpeg" } = JSON.parse(event.body || "{}");

  if (!/^image\/(jpe?g|png|webp)$/i.test(contentType)) {
    return j(400, { error: "Tipo inválido. Use JPG/PNG/WEBP." });
  }

  const key = `avatars/${sub}/avatar`;
  const cmd = new PutObjectCommand({ Bucket: "keeply-prod-user-assets", Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 300 }); // 5 min

  return j(200, { uploadUrl, key });
};
const j = (c,b)=>({statusCode:c,headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
