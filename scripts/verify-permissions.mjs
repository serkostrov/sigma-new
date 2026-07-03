/**
 * Статическая проверка матрицы прав: дефолты ролей, навигация, маршруты.
 * Запуск: node scripts/verify-permissions.mjs
 */
import {
  PERMISSION_DEFS,
  DEFAULT_ROLE_PERMISSIONS,
  APP_ROLES,
  effectivePermission,
} from "../src/lib/access-control.ts";
import {
  navForRoles,
  canAccessRoute,
  canViewAssignedToolsOnly,
  canViewOwnTasksOnly,
  filterTasksForViewer,
  filterToolsForViewer,
} from "../src/lib/permissions.ts";

const KEYS = PERMISSION_DEFS.map((d) => d.key);
let failed = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failed++;
}

console.log("\n=== Матрица прав ===");
if (KEYS.length < 33) fail(`Ожидалось минимум 33 права, найдено ${KEYS.length}`);
else ok(`${KEYS.length} прав в PERMISSION_DEFS`);

for (const role of APP_ROLES) {
  const perms = DEFAULT_ROLE_PERMISSIONS[role];
  const enabled = KEYS.filter((k) => perms[k]).length;
  if (enabled === 0) fail(`Роль ${role}: нет включённых прав`);
  else ok(`Роль ${role}: ${enabled} прав по умолчанию`);
}

console.log("\n=== Мастер (foreman) — ключевые ограничения ===");
const foreman = ["foreman"];
const fo = {};
const fChecks = [
  ["objects.view_scoped", true],
  ["objects.view_all", false],
  ["objects.create", false],
  ["objects.edit", false],
  ["tools.view_assigned", true],
  ["tools.view", false],
  ["tools.manage", false],
  ["tasks.view_own", true],
  ["tasks.view", false],
  ["tasks.create", false],
  ["tasks.delete", false],
  ["photos.create", true],
  ["finances.view", false],
  ["documents.manage", false],
];
for (const [key, expected] of fChecks) {
  const actual = effectivePermission("foreman", key, fo);
  if (actual !== expected) fail(`foreman.${key}: ожидалось ${expected}, получено ${actual}`);
  else ok(`foreman.${key} = ${actual}`);
}

console.log("\n=== Кладовщик (tools_keeper) ===");
const tkChecks = [
  ["tools.view", true],
  ["tools.manage", true],
  ["tools.view_assigned", false],
  ["objects.view_scoped", true],
  ["objects.view_all", false],
  ["tasks.view", false],
];
for (const [key, expected] of tkChecks) {
  const actual = effectivePermission("tools_keeper", key, fo);
  if (actual !== expected) fail(`tools_keeper.${key}: ожидалось ${expected}, получено ${actual}`);
  else ok(`tools_keeper.${key} = ${actual}`);
}

console.log("\n=== Навигация ===");
const foremanNav = navForRoles(["foreman"], fo).map((i) => i.to);
const expectedForeman = ["/", "/objects", "/tasks", "/brigades", "/photos", "/tools"];
for (const p of expectedForeman) {
  if (!foremanNav.includes(p)) fail(`Мастер: нет пункта ${p} в nav`);
  else ok(`Мастер: ${p} в nav`);
}
if (foremanNav.includes("/expenses")) fail("Мастер: не должно быть /expenses");
else ok("Мастер: нет /expenses");

const keeperNav = navForRoles(["tools_keeper"], fo).map((i) => i.to);
if (!keeperNav.includes("/tools")) fail("Кладовщик: нет /tools");
else ok("Кладовщик: /tools в nav");
if (keeperNav.includes("/tasks")) fail("Кладовщик: не должно быть /tasks");
else ok("Кладовщик: нет /tasks");

console.log("\n=== Маршруты ===");
const routeChecks = [
  [["foreman"], "/tools/archive", false],
  [["foreman"], "/tools", true],
  [["foreman"], "/expenses", false],
  [["tools_keeper"], "/tools/archive", true],
  [["tools_keeper"], "/tasks", false],
  [["director"], "/users", true],
  [["director"], "/settings", true],
  [["rop"], "/objects", true],
  [["rop"], "/users", false],
];
for (const [roles, path, expected] of routeChecks) {
  const actual = canAccessRoute(path, roles, fo);
  if (actual !== expected) fail(`${roles} ${path}: ожидалось ${expected}, получено ${actual}`);
  else ok(`${roles.join(",")} → ${path} = ${actual}`);
}

console.log("\n=== Фильтры данных ===");
const userId = "user-1";
const tasks = [
  { assignee_id: "user-1" },
  { assignee_id: "user-2" },
];
const tools = [
  { assignee_id: "user-1" },
  { assignee_id: null },
];
if (filterTasksForViewer(tasks, userId, true).length !== 1) fail("filterTasks ownOnly");
else ok("filterTasks: 1 из 2 при view_own");
if (filterToolsForViewer(tools, userId, true).length !== 1) fail("filterTools assignedOnly");
else ok("filterTools: 1 из 2 при view_assigned");
if (canViewAssignedToolsOnly(["foreman"], fo)) ok("foreman: canViewAssignedToolsOnly");
else fail("foreman: canViewAssignedToolsOnly");
if (canViewOwnTasksOnly(["foreman"], fo)) ok("foreman: canViewOwnTasksOnly");
else fail("foreman: canViewOwnTasksOnly");

console.log("\n=== RLS tools.manage (логика can_manage_tool_row) ===");
// foreman + tools.manage override, без tools.view — только свой инструмент
const foManage = { foreman: { "tools.manage": true } };
if (!effectivePermission("foreman", "tools.manage", foManage)) fail("override tools.manage для foreman");
else ok("override tools.manage для foreman работает");
if (effectivePermission("foreman", "tools.view", foManage)) fail("foreman не должен получить tools.view без override");
else ok("foreman без tools.view по умолчанию");
if (failed > 0) {
  console.error(`\nПровалено проверок: ${failed}`);
  process.exit(1);
}
console.log("\nВсе проверки пройдены.\n");
