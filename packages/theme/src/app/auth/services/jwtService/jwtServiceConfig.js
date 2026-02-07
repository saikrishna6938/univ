import { globalPath } from "app/configs/env";

const jwtServiceConfig = {
  signIn: `${globalPath}login`,
  signUp: "api/auth/sign-up",
  accessToken: "api/auth/access-token",
  updateUser: "api/auth/user/update",
};

export default jwtServiceConfig;
