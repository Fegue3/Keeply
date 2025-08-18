// Lambda: keeply-user-avatar-view-url
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "eu-north-1";
const BUCKET = process.env.AVATAR_BUCKET || "keeply-prod-user-assets";

const s3 = new S3Client({ region: REGION });

const json = (code, body) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  try {
    // HTTP API (payload v2): claims vêm aqui
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    if (!claims) return json(401, { error: "Unauthorized" });

    // IMPORTANTE: atributo custom tem prefixo "custom:"
    const key = claims["custom:picture"];

    // Se não houver foto → devolve null sem erro 500
    if (!key || key === "none") {
      return json(200, { viewUrl: null });
    }

    // Sanity checks rápidos para não dar 500 misterioso
    if (!BUCKET || !REGION) {
      return json(500, { error: "Misconfigured Lambda env (BUCKET/REGION)" });
    }

    // Verifica se o objeto existe; se não existir, devolve null
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch (e) {
      // NotFound ou AccessDenied
      return json(200, { viewUrl: null, note: "object-not-found-or-denied" });
    }

    // Gera URL presignada para GET
    const viewUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: 60 * 15 } // 15 minutos
    );

    return json(200, { viewUrl });
  } catch (err) {
    // Loga o erro no CloudWatch e devolve uma msg segura
    console.error("view-url error", err);
    return json(500, { error: "Internal" });
  }
};
