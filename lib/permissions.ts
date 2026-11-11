import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

export const APP_ROLES = ["owner", "admin", "staff", "viewer"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export type Permission =
  | "employee:write"
  | "property:read"
  | "property:write"
  | "page:read"
  | "page:write"
  | "guest:read"
  | "guest:write"
  | "booking:read"
  | "booking:write"
  | "integration:write";

export const statement = {
  ...defaultStatements,
  employee: ["read", "write"],
  property: ["read", "write"],
  page: ["read", "write"],
  guest: ["read", "write"],
  booking: ["read", "write"],
  integration: ["read", "write"],
} as const;

export const ac = createAccessControl(statement);

const fullOrg = {
  organization: ["update", "delete"] as ["update", "delete"],
  member: ["create", "update", "delete"] as ["create", "update", "delete"],
  invitation: ["create", "cancel"] as ["create", "cancel"],
  team: ["create", "update", "delete"] as ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"] as [
    "create",
    "read",
    "update",
    "delete",
  ],
};

export const owner = ac.newRole({
  ...fullOrg,
  employee: ["read", "write"],
  property: ["read", "write"],
  page: ["read", "write"],
  guest: ["read", "write"],
  booking: ["read", "write"],
  integration: ["read", "write"],
});

export const admin = ac.newRole({
  organization: ["update"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
  employee: ["read", "write"],
  property: ["read", "write"],
  page: ["read", "write"],
  guest: ["read", "write"],
  booking: ["read", "write"],
  integration: ["read", "write"],
});

export const staff = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ["read"],
  employee: ["read"],
  property: ["read", "write"],
  page: ["read", "write"],
  guest: ["read", "write"],
  booking: ["read", "write"],
  integration: ["read"],
});

export const viewer = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ["read"],
  employee: ["read"],
  property: ["read"],
  page: ["read"],
  guest: ["read"],
  booking: ["read"],
  integration: ["read"],
});

export const organizationRoles = { owner, admin, staff, viewer };

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  owner: [
    "employee:write",
    "property:read",
    "property:write",
    "page:read",
    "page:write",
    "guest:read",
    "guest:write",
    "booking:read",
    "booking:write",
    "integration:write",
  ],
  admin: [
    "employee:write",
    "property:read",
    "property:write",
    "page:read",
    "page:write",
    "guest:read",
    "guest:write",
    "booking:read",
    "booking:write",
    "integration:write",
  ],
  staff: [
    "property:read",
    "property:write",
    "page:read",
    "page:write",
    "guest:read",
    "guest:write",
    "booking:read",
    "booking:write",
  ],
  viewer: ["property:read", "page:read", "guest:read", "booking:read"],
};

export function isAppRole(value: string | null | undefined): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

export function can(
  role: AppRole | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}
