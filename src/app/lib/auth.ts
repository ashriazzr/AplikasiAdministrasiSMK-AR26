export const RESTRICTED_ACCOUNT = {
  email: "hubin@gmail.com",
  name: "ENGKUS",
  role: "restricted" as const,
};

export const SESSION_KEYS = {
  adminId: "admin_id",
  adminName: "admin_name",
  adminEmail: "admin_email",
  isLoggedIn: "is_logged_in",
  accessLevel: "access_level",
} as const;

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeName = (value: string) => value.trim().replace(/\s+/g, " ");

export const isRestrictedAccount = (email?: string | null, name?: string | null) => {
  if (!email || !name) return false;

  return (
    normalizeEmail(email) === RESTRICTED_ACCOUNT.email &&
    normalizeName(name).toUpperCase() === RESTRICTED_ACCOUNT.name
  );
};

export const isRestrictedSession = () =>
  sessionStorage.getItem(SESSION_KEYS.accessLevel) === RESTRICTED_ACCOUNT.role;

export const isLoggedInSession = () => sessionStorage.getItem(SESSION_KEYS.isLoggedIn) === "true";