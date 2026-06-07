const { requireSupabase } = require("./services/supabase");

async function createRegistration(data) {
  const supabase = requireSupabase();
  const { data: created, error } = await supabase
    .from("bot_rp_registros")
    .insert({
      discord_id: data.discordId,
      passaporte: data.passaporte,
      nome: data.nome,
      unidade: data.unidade,
      patente: data.patente,
      status: data.status,
      anterior_passaporte: data.previous?.passaporte || null,
      anterior_nome: data.previous?.nome || null,
      anterior_unidade: data.previous?.unidade || null,
      anterior_patente: data.previous?.patente || null
    })
    .select("id")
    .single();

  if (error) throw error;
  return created.id;
}

async function getRegistration(rowId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("bot_rp_registros")
    .select("*")
    .eq("id", rowId)
    .single();

  if (error) throw error;
  return data;
}

async function getLatestApprovedRegistration(discordId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("bot_rp_registros")
    .select("*")
    .eq("discord_id", discordId)
    .eq("status", "APROVADO")
    .order("atualizado_em", { ascending: false, nullsFirst: false })
    .order("criado_em", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function updateRegistrationStatus(rowId, status, approvedBy = null) {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("bot_rp_registros")
    .update({
      status,
      atualizado_em: new Date().toISOString(),
      aprovado_por: approvedBy
    })
    .eq("id", rowId);

  if (error) throw error;
}

async function createPatrol(patrol, messageId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("bot_rp_patrulhamentos")
    .insert({
      message_id: messageId,
      vehicle: patrol.vehicle,
      vehicle_seats: patrol.seats,
      vehicle_image_url: patrol.vehicleImageUrl || "",
      observation: patrol.observation || "",
      creator_id: patrol.creatorId,
      participant_ids: [...patrol.participants],
      status: patrol.status,
      started_at: patrol.startedAt
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function updatePatrolParticipants(messageId, participants) {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("bot_rp_patrulhamentos")
    .update({
      participant_ids: [...participants],
      updated_at: new Date().toISOString()
    })
    .eq("message_id", messageId);

  if (error) throw error;
}

async function updatePatrolObservation(messageId, observation) {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("bot_rp_patrulhamentos")
    .update({
      observation,
      updated_at: new Date().toISOString()
    })
    .eq("message_id", messageId);

  if (error) throw error;
}

async function closePatrol(messageId, participants) {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("bot_rp_patrulhamentos")
    .update({
      status: "Encerrado",
      participant_ids: [...participants],
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("message_id", messageId);

  if (error) throw error;
}

async function getOpenPatrols() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("bot_rp_patrulhamentos")
    .select("*")
    .eq("status", "Aberto");

  if (error) throw error;
  return data || [];
}

module.exports = {
  createRegistration,
  getRegistration,
  getLatestApprovedRegistration,
  updateRegistrationStatus,
  createPatrol,
  updatePatrolParticipants,
  updatePatrolObservation,
  closePatrol,
  getOpenPatrols
};
