const config = require("../config");

function allConfiguredRoleIds(list) {
  return list.map((item) => item.roleId).filter(Boolean);
}

function hasAuthorizerRole(member) {
  return hasSupervisionRole(member) || hasRhRole(member) || member.roles.cache.has(config.authorizerRoleId);
}

function hasSupervisionRole(member) {
  return Boolean(config.supervisionRoleId && member.roles.cache.has(config.supervisionRoleId));
}

function hasRhRole(member) {
  return Boolean(config.rhRoleId && member.roles.cache.has(config.rhRoleId));
}

function hasAnnouncementRole(member) {
  return hasSupervisionRole(member) || hasRhRole(member);
}

async function applyRegistrationToMember(member, registration) {
  const warnings = [];
  const unit = config.units.find((item) => item.value === registration.unidade);
  const rank = config.ranks.find((item) => item.value === registration.patente);

  const unitRoleIds = allConfiguredRoleIds(config.units);
  const rankRoleIds = allConfiguredRoleIds(config.ranks);
  const oldRoleIds = [...unitRoleIds, ...rankRoleIds].filter((roleId) => member.roles.cache.has(roleId));

  if (oldRoleIds.length) {
    try {
      await member.roles.remove(oldRoleIds, "Atualização de registro Rádio Patrulha");
    } catch (error) {
      warnings.push("Não foi possível remover todos os cargos antigos. Verifique a hierarquia dos cargos do bot.");
    }
  }

  for (const roleId of [unit?.roleId, rank?.roleId].filter(Boolean)) {
    try {
      await member.roles.add(roleId, "Registro aprovado Rádio Patrulha");
    } catch (error) {
      warnings.push(`Não foi possível aplicar o cargo <@&${roleId}>. Verifique se o cargo do bot está acima dele.`);
    }
  }

  return warnings;
}

async function updateMemberRegistrationNickname(member, { passaporte, nome }, reason = "Registro Rádio Patrulha") {
  try {
    await member.setNickname(`${passaporte} - ${nome}`, reason);
    return null;
  } catch (error) {
    return "Não foi possível alterar seu apelido automaticamente. Verifique se o bot tem permissão e hierarquia para gerenciar apelidos.";
  }
}

module.exports = {
  hasAnnouncementRole,
  hasAuthorizerRole,
  hasRhRole,
  hasSupervisionRole,
  applyRegistrationToMember,
  updateMemberRegistrationNickname
};
