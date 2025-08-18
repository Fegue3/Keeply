import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const s3 = new S3Client({ region: "eu-north-1" });

export const handler = async (event) => {
  const claims = event.requestContext.authorizer.jwt.claims;
  const key = claims["custom:picture"];
  if (!key || key === "none") return j(200, { viewUrl: null });

  const viewUrl = await getSignedUrl(s3, new GetObjectCommand({
    Bucket: "keeply-prod-user-assets" , Key: key
  }), { expiresIn: 900 }); // 15 min

  return j(200, { viewUrl, ver });
};
const j = (c,b)=>({statusCode:c,headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
