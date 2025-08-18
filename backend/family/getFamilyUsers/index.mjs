import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient, AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const base = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(base);

// Cliente Cognito
const cognito = new CognitoIdentityProviderClient({});

// Nome da tabela no DynamoDB
const FAMILIES_TABLE = process.env.FAMILIES_TABLE || "Families";

// ID do User Pool do Cognito (tem de estar nas env vars da Lambda)
const USER_POOL_ID = process.env.USER_POOL_ID || "eu-north-1_UZKOB6Tr7";

export const handler = async (event) => {
  try {
    const auth = event.requestContext?.authorizer?.jwt?.claims || {};
    const userId = auth.sub;
    if (!userId) return res(401, { message: "Não autenticado" });

    // 1) Procurar família do user
    const famScan = await ddb.send(new ScanCommand({
      TableName: FAMILIES_TABLE,
      ProjectionExpression: "familyId, members"
    }));

    const myFamily = (famScan.Items || []).find(f =>
      Array.isArray(f.members) && f.members.some(m => m.userId === userId)
    );

    if (!myFamily) {
      return res(404, { message: "Não pertences a nenhuma família" });
    }

    const members = Array.isArray(myFamily.members) ? myFamily.members : [];

    // 2) Buscar detalhes no Cognito
    const detailedMembers = await Promise.all(
      members.map(async (m) => {
        try {
          const user = await cognito.send(new AdminGetUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: m.userId
          }));

          const attrs = Object.fromEntries(user.UserAttributes.map(a => [a.Name, a.Value]));

          return {
            ...m,
            email: attrs.email || null,
            name: attrs.name || null
          };
        } catch (err) {
          console.error("Erro a buscar user no Cognito:", err);
          return m;
        }
      })
    );

    return res(200, {
      familyId: myFamily.familyId,
      members: detailedMembers
    });

  } catch (e) {
    console.error("getFamilyUsers error:", e);
    return res(500, { message: "Erro a buscar membros da família" });
  }
};

const res = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});