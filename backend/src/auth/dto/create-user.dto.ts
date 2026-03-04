export type CreateUserDto = {
  fullName: string;
  email: string;
  password: string;
  role: "ADMIN" | "DISPATCHER" | "DRIVER";
};
