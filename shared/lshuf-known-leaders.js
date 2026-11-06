// The leaders the mod knows by name: it ships per-leader action groups (keep, left out, mod check) only for
// these. Base game and DLC leaders as of 1.5.0 (read from Debug/gameplay-copy.sqlite, IsMajorLeader = 1,
// 2026-11-06), and the 25 listed leader mods from SPEC.md section 3, "Modded leaders". Owned by the lead.
//
// A leader here that isn't in a player's database (a DLC they don't own, a leader mod they haven't installed)
// is skipped by every query that selects through the game's own tables.

export const VANILLA_LEADERS = [
  "LEADER_ADA_LOVELACE",
  "LEADER_ALEXANDER",
  "LEADER_AMINA",
  "LEADER_ASHOKA",
  "LEADER_ASHOKA_ALT",
  "LEADER_AUGUSTUS",
  "LEADER_BENJAMIN_FRANKLIN",
  "LEADER_BOLIVAR",
  "LEADER_CATHERINE",
  "LEADER_CHARLEMAGNE",
  "LEADER_CONFUCIUS",
  "LEADER_EDWARD_TEACH",
  "LEADER_ELIZABETH",
  "LEADER_FRIEDRICH",
  "LEADER_FRIEDRICH_ALT",
  "LEADER_GENGHIS_KHAN",
  "LEADER_GILGAMESH",
  "LEADER_HARRIET_TUBMAN",
  "LEADER_HATSHEPSUT",
  "LEADER_HIMIKO",
  "LEADER_HIMIKO_ALT",
  "LEADER_IBN_BATTUTA",
  "LEADER_ISABELLA",
  "LEADER_JOSE_RIZAL",
  "LEADER_LAFAYETTE",
  "LEADER_LAKSHMIBAI",
  "LEADER_MACHIAVELLI",
  "LEADER_NAPOLEON",
  "LEADER_NAPOLEON_ALT",
  "LEADER_PACHACUTI",
  "LEADER_SAYYIDA_AL_HURRA",
  "LEADER_TECUMSEH",
  "LEADER_TOYOTOMI_HIDEYOSHI",
  "LEADER_TRUNG_TRAC",
  "LEADER_WASHINGTON",
  "LEADER_XERXES",
  "LEADER_XERXES_ALT",
  "LEADER_YI_SUN_SIN"
];

// One entry per listed leader. modId is the modinfo's <Mod id>, the id Modding.getInstalledMods() reports and the
// fs://game/<modId>/ path uses (probe 12). workshopId is the folder name on tp-share.
export const MODDED_LEADERS = [
  { leaderType: "LEADER_REMILIA", modId: "MAO-Leader-REMILIA", workshopId: "3635718174", title: "Remilia Scarlet" },
  { leaderType: "LEADER_QINSHIHUANG", modId: "MAO-Leader-QINSHIHUANG", workshopId: "3635171494", title: "Qin Shi Huang (FGO)" },
  { leaderType: "LEADER_ODA_NOBUNAGA", modId: "MAO_ODA_NOBUNAGA", workshopId: "3631520597", title: "Oda Nobunaga(FGO)" },
  { leaderType: "LEADER_Youmu", modId: "MAO-Leader-Youmu", workshopId: "3646519031", title: "Youmu Konpaku" },
  { leaderType: "LEADER_MAOZEDONG", modId: "Mao Zedong", workshopId: "3517202110", title: "Mao Zedong" },
  { leaderType: "LEADER_KingofHeroes", modId: "MAO-Leader-KingofHeroes", workshopId: "3635072993", title: "Gilgamesh" },
  { leaderType: "LEADER_Houraisan", modId: "MAO-Leader-Houraisan", workshopId: "3645230017", title: "Kaguya Houraisan" },
  { leaderType: "LEADER_MAO_Tanya", modId: "MAO-Leader-MAO_Tanya", workshopId: "3680373123", title: "Tanya Degurechaff" },
  { leaderType: "LEADER_OLGA", modId: "MAO-Leader-OLGA", workshopId: "3637045457", title: "Olga Marie" },
  { leaderType: "LEADER_Yuyuko", modId: "MAO-Leader-Yuyuko", workshopId: "3654327522", title: "Yuyuko Saigyouji" },
  { leaderType: "LEADER_Nearl", modId: "MAO-Leader-Nearl", workshopId: "3647483068", title: "Nearl" },
  { leaderType: "LEADER_FLAN", modId: "MAO-Leader-Flan", workshopId: "3660809274", title: "Flandre Scarlet" },
  { leaderType: "LEADER_Patchouli", modId: "MAO-Leader-Patchouli", workshopId: "3653306249", title: "Patchouli Knowledge" },
  { leaderType: "LEADER_Bocchi", modId: "MAO-Leader-Bocchi", workshopId: "3649901296", title: "Bocchi" },
  { leaderType: "LEADER_MAO_Astolfo", modId: "MAO-Leader-MAO_Astolfo", workshopId: "3677067116", title: "Astolfo (Saber)" },
  { leaderType: "LEADER_OKITA_SOUJI", modId: "MAO-Leader-OKITA_SOUJI", workshopId: "3642496682", title: "Okita Sōji (FGO)" },
  { leaderType: "LEADER_EIRIN", modId: "MAO-Leader-EIRIN", workshopId: "3659192739", title: "Eirin Yagokoro" },
  { leaderType: "LEADER_Ema", modId: "MAO-Leader-MahoShojoWitchTrial", workshopId: "3655381520", title: "Maho Shojo Witch Trial" },
  { leaderType: "LEADER_Hiro", modId: "MAO-Leader-MahoShojoWitchTrial", workshopId: "3655381520", title: "Maho Shojo Witch Trial" },
  { leaderType: "LEADER_Shelly", modId: "MAO-Leader-MahoShojoWitchTrial", workshopId: "3655381520", title: "Maho Shojo Witch Trial" },
  { leaderType: "LEADER_Yamada", modId: "MAO-Leader-Yamada", workshopId: "3650228385", title: "Yamada Ryo" },
  { leaderType: "LEADER_Margatroid", modId: "MAO-Leader-Margatroid", workshopId: "3648069483", title: "Alice Margatroid" },
  { leaderType: "LEADER_Cirno", modId: "MAO-Leader-Cirno", workshopId: "3660224019", title: "Cirno 2.0" },
  { leaderType: "LEADER_Akyuu", modId: "MAO-Leader-Akyuu", workshopId: "3661958452", title: "Hieda no Akyuu" },
  { leaderType: "LEADER_Koishi", modId: "MAO-Leader-Koishi", workshopId: "3646742676", title: "Koishi Komeiji" },
  { leaderType: "LEADER_WUZETIAN", modId: "MAO-Leader-WUZETIAN", workshopId: "3636713096", title: "Wu Zetian (FGO)" },
  { leaderType: "LEADER_Aya", modId: "MAO-Leader-Aya", workshopId: "3661417870", title: "Aya Shameimaru" }
];

export const MODDED_LEADER_TYPES = MODDED_LEADERS.map((m) => m.leaderType);
export const KNOWN_LEADERS = [...VANILLA_LEADERS, ...MODDED_LEADER_TYPES];
export const isModdedLeader = (leaderType) => MODDED_LEADER_TYPES.includes(leaderType);
export const moddedEntry = (leaderType) => MODDED_LEADERS.find((m) => m.leaderType === leaderType) || null;
