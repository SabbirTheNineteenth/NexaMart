export type AuthFormField = "name" | "email" | "password" | "storeName" | "storeSlug" | "description";
export type AuthFormState = Record<AuthFormField, string>;

export const createAuthFormState = (): AuthFormState => ({
  name: "",
  email: "",
  password: "",
  storeName: "",
  storeSlug: "",
  description: "",
});

export const setAuthFormField = (state: AuthFormState, field: AuthFormField, value: string): AuthFormState => ({
  ...state,
  [field]: value,
});

export const authFieldId = (mode: "login" | "register", role: "customer" | "seller" | "admin", field: AuthFormField) => `auth-${mode}-${role}-${field}`;
