/**
 * Takım / çok kullanıcı — org + rol modeli.
 */

const dbService = require("./dbService");

const ROLES = ["owner", "admin", "arici", "izleyici"];

function listTeams() {
  return dbService.listTeams();
}

function getTeam(teamId) {
  return dbService.getTeam(teamId);
}

function createTeam(name, ownerEmail) {
  return dbService.createTeam(name, ownerEmail);
}

function addMember(teamId, email, role = "arici") {
  if (!ROLES.includes(role)) role = "arici";
  return dbService.addTeamMember(teamId, email, role);
}

function teamForHive(hiveId) {
  return dbService.getTeamForHive(hiveId);
}

module.exports = {
  ROLES,
  listTeams,
  getTeam,
  createTeam,
  addMember,
  teamForHive,
};
