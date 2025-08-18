import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
const cip = new CognitoIdentityProviderClient({ region: "eu-north-1" });

export const handler = async (event) => {
  const claims = event.requestContext.authorizer.jwt.claims;
  const username = claims["cognito:username"]; // para Admin* APIs
  const sub = claims.sub;
  const { key } = JSON.parse(event.body || "{}");
  if (!key || !key.startsWith(`avatars/${sub}/`)) return j(400, { error: "Key inválida" });

  const ver = Date.now().toString();
  await cip.send(new AdminUpdateUserAttributesCommand({
    UserPoolId: "eu-north-1_UZKOB6Tr7",
    Username: username,
    UserAttributes: [
      { Name: "custom:picture", Value: key }
    ]
  }));
  return j(200, { ok: true, key, ver });
};
const j = (c,b)=>({statusCode:c,headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
