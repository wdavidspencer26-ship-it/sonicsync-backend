// helpers.js  —  Shared utilities used across route handlers
const { users } = require("./db");

/** Resolve a userId string to its full user object. Returns null if not found. */
function resolveUser(userId) {
  return users.find(u => u.id === userId) || null;
}

/**
 * Hydrate any object that has a `userId` field into a full `user` sub-object.
 * Also resolves string-array fields: tags, going, interested, listenerIds.
 */
function hydrate(obj) {
  if (!obj) return obj;
  const result = { ...obj };

  if (result.userId) {
    result.user = resolveUser(result.userId);
  }
  if (Array.isArray(result.tags)) {
    result.tags = result.tags.map(resolveUser).filter(Boolean);
  }
  if (Array.isArray(result.going)) {
    result.going = result.going.map(resolveUser).filter(Boolean);
  }
  if (Array.isArray(result.interested)) {
    result.interested = result.interested.map(resolveUser).filter(Boolean);
  }
  if (Array.isArray(result.listenerIds)) {
    result.listeners = result.listenerIds.map(resolveUser).filter(Boolean);
  }
  return result;
}

/** Merge a friend record (listening state) with its full user profile. */
function hydrateFriend(friendRecord) {
  const user = resolveUser(friendRecord.userId);
  if (!user) return null;
  return { ...user, ...friendRecord };
}

module.exports = { resolveUser, hydrate, hydrateFriend };
