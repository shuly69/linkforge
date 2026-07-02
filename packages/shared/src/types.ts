/** Roles used for authorization across the stack. */
export const Role = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/** Shape of the JWT payload issued by the API. */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: Role;
}

/** Standard error envelope returned by the API's exception filter. */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}
