import { CognitoUserPool } from "amazon-cognito-identity-js";

const poolData = {
  UserPoolId: "eu-north-1_UZKOB6Tr7", 
  ClientId: "28en88fu2r83l19ecnpmg37ft7", 
};

export default new CognitoUserPool(poolData);
